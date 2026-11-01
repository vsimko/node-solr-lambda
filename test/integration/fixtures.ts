import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { SolrClient } from "../../src/index.js";
import type { SolrDocument } from "../../src/index.js";

const baseUrl = process.env.SOLR_BASE_URL;
const core = process.env.SOLR_CORE;
const cloudEnabled = process.env.SOLR_CLOUD === "true";

export interface SolrSecurityFixtureData {
  authentication: Readonly<Record<string, unknown>>;
  authorization: Readonly<Record<string, unknown>>;
}

/** Return isolated BasicAuth and RuleBasedAuthorization payloads for security.json tests. */
export function createSecurityFixtureData(username = "integration-admin", password = "integration-only-password"): SolrSecurityFixtureData {
  return {
    authentication: {
      class: "solr.BasicAuthPlugin",
      blockUnknown: true,
      credentials: { [username]: createHash("sha256").update(password).digest("hex") }
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
  addSchemaField(name: string, type?: string): Promise<void>;
  setUserProperty(name: string, value: string | number | boolean): Promise<void>;
  securityData: SolrSecurityFixtureData;
}

export interface SolrCloudIntegrationFixture {
  client: SolrClient;
  createCollection(prefix?: string): Promise<string>;
}

/**
 * Run an integration test with a dedicated client and deterministic resource cleanup.
 * Tests are skipped when the Solr integration endpoint is not configured.
 */
export function integrationTest(
  name: string,
  run: (fixture: SolrIntegrationFixture) => Promise<void>
): void {
  test(name, { skip: !baseUrl || !core }, async () => {
    const client = new SolrClient({ baseUrl: baseUrl!, core: core!, timeoutMs: 30_000 });
    const documentIds = new Set<string>();
    const createdCores = new Set<string>();
    const schemaFields = new Set<string>();
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
      async addSchemaField(name, type = "string") {
        await client.schema({ "add-field": { name, type, stored: true, indexed: true } });
        schemaFields.add(name);
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
      for (const name of schemaFields) {
        try {
          await client.schema({ "delete-field": { name } });
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
  run: (fixture: SolrCloudIntegrationFixture) => Promise<void>
): void {
  test(name, { skip: !baseUrl || !cloudEnabled }, async () => {
    const client = new SolrClient({ baseUrl: baseUrl!, timeoutMs: 30_000 });
    const createdCollections = new Set<string>();
    const fixture: SolrCloudIntegrationFixture = {
      client,
      async createCollection(prefix = "integration_collection") {
        const name = `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
        await client.collections("CREATE", {
          name,
          numShards: 1,
          replicationFactor: 1,
          collectionConfigName: "_default"
        });
        createdCollections.add(name);
        return name;
      }
    };

    const cleanupErrors: unknown[] = [];
    try {
      await run(fixture);
    } finally {
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
