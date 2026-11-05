import test from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SolrClient } from "../../src/index.js";
import type { SolrDocument, SolrSchemaCommandResponse, SolrSchemaFieldType, SolrSchemaDynamicField, SolrSchemaCopyField } from "../../src/index.js";

const baseUrl = process.env.SOLR_BASE_URL;
const core = process.env.SOLR_CORE;
const cloudEnabled = process.env.SOLR_CLOUD === "true";

export interface SolrSecurityFixtureData {
  authentication: Readonly<Record<string, unknown>>;
  authorization: Readonly<Record<string, unknown>>;
}

/** Return isolated BasicAuth and RuleBasedAuthorization payloads for security.json tests. */
export function createSecurityFixtureData(username = "integration-admin", password = "integration-only-password"): SolrSecurityFixtureData {
  const salt = randomBytes(32);
  const saltedPassword = Buffer.concat([salt, Buffer.from(password)]);
  const firstHash = createHash("sha256").update(saltedPassword).digest();
  const credential = `${createHash("sha256").update(firstHash).digest("base64")} ${salt.toString("base64")}`;
  return {
    authentication: {
      class: "solr.BasicAuthPlugin",
      blockUnknown: true,
      credentials: { [username]: credential }
    },
    authorization: {
      class: "solr.RuleBasedAuthorizationPlugin",
      "user-role": { [username]: ["admin"] },
      permissions: [{ name: "all", role: "admin" }]
    }
  };
}

export interface SolrIntegrationFixture {
  client: SolrClient;
  createId(prefix?: string): string;
  addDocuments(documents: readonly (SolrDocument & { id: string })[]): Promise<void>;
  commit(): Promise<void>;
  createCore(prefix?: string): Promise<string>;
  addSchemaField(name: string, type?: string, docValues?: boolean): Promise<SolrSchemaCommandResponse>;
  deleteSchemaField(name: string): Promise<SolrSchemaCommandResponse>;
  addSchemaFieldType(fieldType: SolrSchemaFieldType): Promise<SolrSchemaCommandResponse>;
  addSchemaDynamicField(field: SolrSchemaDynamicField): Promise<SolrSchemaCommandResponse>;
  deleteSchemaDynamicField(name: string): Promise<SolrSchemaCommandResponse>;
  addSchemaCopyField(rule: SolrSchemaCopyField): Promise<SolrSchemaCommandResponse>;
  deleteSchemaCopyField(source: string, dest: string): Promise<SolrSchemaCommandResponse>;
  deleteSchemaFieldType(name: string): Promise<SolrSchemaCommandResponse>;
  setUserProperty(name: string, value: string | number | boolean): Promise<void>;
  securityData: SolrSecurityFixtureData;
}

export interface SolrCloudIntegrationFixture {
  client: SolrClient;
  clientForCollection(name: string): SolrClient;
  createCollection(prefix?: string, replicationFactor?: number): Promise<string>;
  createImplicitCollection(prefix?: string): Promise<string>;
  createAlias(collection: string, prefix?: string): Promise<string>;
}

/**
 * Run an integration test with a dedicated client and deterministic resource cleanup.
 * Tests are skipped when the Solr integration endpoint is not configured.
 */
export function integrationTest(
  name: string,
  run: (fixture: SolrIntegrationFixture) => Promise<void>,
  timeoutMs?: number,
  skipReason?: string
): void {
  test(name, { skip: !baseUrl || !core || skipReason || false, ...(timeoutMs ? { timeout: timeoutMs } : {}) }, async () => {
    const username = process.env.SOLR_USERNAME;
    const password = process.env.SOLR_PASSWORD;
    const client = new SolrClient({
      baseUrl: baseUrl!,
      core: core!,
      timeoutMs: 30_000,
      ...(username && password ? { auth: { type: "basic" as const, username, password } } : {})
    });
    const documentIds = new Set<string>();
    const createdCores = new Set<string>();
    const schemaFields = new Set<string>();
    const schemaFieldTypes = new Set<string>();
    const schemaDynamicFields = new Set<string>();
    const schemaCopyFields = new Map<string, Set<string>>();
    const userProperties = new Set<string>();

    const fixture: SolrIntegrationFixture = {
      client,
      createId(prefix = "integration") {
        return `${prefix}_${randomUUID().replaceAll("-", "")}`;
      },
      async addDocuments(documents) {
        for (const document of documents) documentIds.add(document.id);
        await client.add(documents);
      },
      async commit() {
        await client.commit({ waitSearcher: true });
      },
      async createCore(prefix = "integration_core") {
        const name = `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
        await client.coreAdmin("CREATE", { name, instanceDir: name, configSet: "_default" });
        createdCores.add(name);
        return name;
      },
      async addSchemaField(name, type = "string", docValues = false) {
        const response = await client.schema({ "add-field": { name, type, stored: true, indexed: true, docValues } });
        schemaFields.add(name);
        return response;
      },
      async deleteSchemaField(name) {
        const response = await client.schema({ "delete-field": { name } });
        schemaFields.delete(name);
        return response;
      },
      async addSchemaFieldType(fieldType) {
        const response = await client.schema({ "add-field-type": fieldType });
        schemaFieldTypes.add(fieldType.name);
        return response;
      },
      async deleteSchemaFieldType(name) {
        const response = await client.schema({ "delete-field-type": { name } });
        schemaFieldTypes.delete(name);
        return response;
      },
      async addSchemaDynamicField(field) {
        const response = await client.schema({ "add-dynamic-field": field });
        schemaDynamicFields.add(field.name);
        return response;
      },
      async deleteSchemaDynamicField(name) {
        const response = await client.schema({ "delete-dynamic-field": { name } });
        schemaDynamicFields.delete(name);
        return response;
      },
      async addSchemaCopyField(rule) {
        const response = await client.schema({ "add-copy-field": rule });
        const destinations = Array.isArray(rule.dest) ? rule.dest : [rule.dest];
        const existing = schemaCopyFields.get(rule.source) ?? new Set<string>();
        for (const destination of destinations) existing.add(destination);
        schemaCopyFields.set(rule.source, existing);
        return response;
      },
      async deleteSchemaCopyField(source, dest) {
        const response = await client.schema({ "delete-copy-field": { source, dest } });
        const destinations = schemaCopyFields.get(source);
        destinations?.delete(dest);
        if (destinations?.size === 0) schemaCopyFields.delete(source);
        return response;
      },
      async setUserProperty(name, value) {
        await client.config({ "set-user-property": { [name]: value } });
        userProperties.add(name);
      },
      securityData: createSecurityFixtureData()
    };

    const cleanupErrors: unknown[] = [];
    try {
      await run(fixture);
    } finally {
      for (const [source, destinations] of schemaCopyFields) {
        for (const dest of destinations) {
          try {
            await client.schema({ "delete-copy-field": { source, dest } });
          } catch (error) {
            cleanupErrors.push(error);
          }
        }
      }
      for (const name of schemaFields) {
        try {
          await client.schema({ "delete-field": { name } });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      for (const name of schemaDynamicFields) {
        try {
          await client.schema({ "delete-dynamic-field": { name } });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      for (const name of schemaFieldTypes) {
        try {
          await client.schema({ "delete-field-type": { name } });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      for (const name of userProperties) {
        try {
          await client.config({ "unset-user-property": name });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }

      const documentCleanup = await Promise.allSettled(
        [...documentIds].map(id => client.delete({ id }))
      );
      cleanupErrors.push(...documentCleanup
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map(result => result.reason));

      if (documentIds.size > 0) {
        try {
          await client.commit({ waitSearcher: true });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }

      for (const name of createdCores) {
        try {
          await client.coreAdmin("UNLOAD", {
            core: name,
            deleteIndex: true,
            deleteDataDir: true,
            deleteInstanceDir: true
          });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, "Failed to clean up Solr integration resources");
      }
    }
  });
}

/** Run tests that require a SolrCloud node; set SOLR_CLOUD=true to enable them. */
export function cloudIntegrationTest(
  name: string,
  run: (fixture: SolrCloudIntegrationFixture) => Promise<void>,
  requiresMultipleNodes = false,
  requiresDestructiveOptIn = false
): void {
  const localEndpoint = baseUrl ? ["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname) : false;
  test(name, { skip: !baseUrl || !cloudEnabled || (requiresMultipleNodes && process.env.SOLR_MULTINODE !== "true") || (requiresDestructiveOptIn && (process.env.SOLR_DESTRUCTIVE_OPT_IN !== "true" || !localEndpoint)) }, async () => {
    const client = new SolrClient({ baseUrl: baseUrl!, timeoutMs: 30_000 });
    const createdCollections = new Set<string>();
    const createdAliases = new Set<string>();
    const fixture: SolrCloudIntegrationFixture = {
      client,
      clientForCollection(name) {
        return new SolrClient({ baseUrl: baseUrl!, collection: name, timeoutMs: 30_000 });
      },
      async createCollection(prefix = "integration_collection", replicationFactor = 1) {
        const name = `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
        await client.collections("CREATE", {
          name,
          numShards: 1,
          replicationFactor,
          maxShardsPerNode: 2,
          "collection.configName": "_default"
        });
        createdCollections.add(name);
        return name;
      },
      async createImplicitCollection(prefix = "integration_implicit") {
        const name = `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
        await client.collections("CREATE", {
          name,
          "router.name": "implicit",
          shards: "shard1",
          replicationFactor: 1,
          maxShardsPerNode: 2,
          "collection.configName": "_default"
        });
        createdCollections.add(name);
        return name;
      },
      async createAlias(collection, prefix = "integration_alias") {
        const name = `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
        await client.collections("CREATEALIAS", { name, collections: collection });
        createdAliases.add(name);
        return name;
      }
    };

    const cleanupErrors: unknown[] = [];
    try {
      await run(fixture);
    } finally {
      for (const name of createdAliases) {
        try {
          await client.collections("DELETEALIAS", { name });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      for (const name of createdCollections) {
        try {
          await client.collections("DELETE", { name });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, "Failed to clean up SolrCloud integration collections");
      }
    }
  });
}
