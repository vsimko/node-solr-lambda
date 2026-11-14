import assert from "node:assert/strict";
import test from "node:test";
import { cloudIntegrationTest } from "./fixtures.js";

cloudIntegrationTest("V2 Collections list returns a newly created isolated collection", async ({
  client,
  createCollection
}) => {
  const collection = await createCollection("v2_list");
  const response = await client.v2.collections.list();
  assert.ok(response.collections?.includes(collection),
    "GET /api/collections must include the newly created collection");
});

cloudIntegrationTest("V2 Collections status reads isolated collection state", async ({
  client,
  createCollection
}) => {
  const collection = await createCollection("v2_status");
  const response = await client.v2.collections.status(collection);
  assert.equal(response.name, collection);
  assert.equal(response.activeShards, 1);
  assert.equal(response.inactiveShards, 0);
}, false, false, ["9.11.0", "10.1.0"].includes(process.env.SOLR_VERSION ?? "")
  ? undefined
  : "The V2 per-collection status route is available from Solr 9.3; the pinned 8.11 line is not claimed");

cloudIntegrationTest("V2 cluster status reports the isolated collection", async ({
  client,
  createCollection
}) => {
  const collection = await createCollection("v2_cluster");
  const response = await client.v2.cluster.status();
  const listed = Boolean(response.collections?.includes(collection) ||
    response.cluster?.collections?.[collection]);
  assert.ok(listed, "GET /api/cluster must report the isolated collection");
}, false, false, ["9.11.0", "10.1.0"].includes(process.env.SOLR_VERSION ?? "")
  ? undefined
  : "GET /api/cluster CLUSTERSTATUS is documented from Solr 9.11; Solr 8.11 is not claimed");

cloudIntegrationTest("V2 Aliases create, update and delete an isolated standard alias", async ({
  client,
  createCollection
}) => {
  const collection = await createCollection("v2_alias_mutation");
  const alias = `${collection}_alias`;
  let created = false;
  try {
    await client.v2.aliases.create({ name: alias, collections: [collection] });
    created = true;

    const list = await client.v2.aliases.list();
    assert.equal(list.aliases?.[alias], collection,
      "POST /api/aliases must create the requested collection mapping");

    await client.v2.aliases.setProperties(alias, { owner: "integration", generation: "2" });
    const properties = await client.v2.aliases.getProperties(alias);
    assert.deepEqual(properties.properties, { owner: "integration", generation: "2" });

    await client.v2.aliases.setProperty(alias, "owner", "updated");
    const property = await client.v2.aliases.getProperty(alias, "owner");
    assert.equal(property.value, "updated");

    await client.v2.aliases.deleteProperty(alias, "generation");
    const afterPropertyDelete = await client.v2.aliases.getProperties(alias);
    assert.deepEqual(afterPropertyDelete.properties, { owner: "updated" });

    await client.v2.aliases.delete(alias);
    created = false;
    const afterAliasDelete = await client.v2.aliases.list();
    assert.equal(afterAliasDelete.aliases?.[alias], undefined,
      "DELETE /api/aliases/{alias} must remove the alias without deleting its collection");
  } finally {
    if (created) await client.v2.aliases.delete(alias);
  }
}, false, false, ["9.11.0", "10.1.0"].includes(process.env.SOLR_VERSION ?? "")
  ? undefined
  : "Redesigned alias CRUD and property routes are documented from Solr 9.3; Solr 8.11.4 is not claimed");

cloudIntegrationTest("V2 Aliases list and detail read back an isolated alias", async ({
  client,
  createCollection,
  createAlias
}) => {
  const collection = await createCollection("v2_alias");
  const alias = await createAlias(collection, "v2_alias");
  const list = await client.v2.aliases.list();
  assert.equal(list.aliases?.[alias], collection, "GET /api/aliases must include the alias mapping");
  let detail;
  try {
    detail = await client.v2.aliases.status(alias);
  } catch (error) {
    if (error && typeof error === "object" && "body" in error) {
      const endpoint = "endpoint" in error && typeof error.endpoint === "string" ? error.endpoint : undefined;
      let probe: unknown;
      let introspection: unknown;
      if (endpoint) {
        try {
          const response = await fetch(endpoint);
          probe = { status: response.status, allow: response.headers.get("allow"), body: await response.text() };
          const apiResponse = await fetch(new URL("/api/aliases/_introspect", endpoint));
          introspection = { status: apiResponse.status, body: await apiResponse.text() };
        } catch (diagnosticError) {
          introspection = diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError);
        }
      }
      console.error("V2 alias detail diagnostic", {
        endpoint,
        status: "status" in error ? error.status : undefined,
        body: error.body,
        probe,
        introspection
      });
    }
    throw error;
  }
  assert.equal(detail.alias, alias);
  assert.deepEqual(detail.collections, [collection]);
}, false, false, ["9.11.0", "10.1.0"].includes(process.env.SOLR_VERSION ?? "")
  ? undefined
  : "The V2 alias read routes are not claimed on pinned Solr 8.11.4; no V1 fallback is used");
