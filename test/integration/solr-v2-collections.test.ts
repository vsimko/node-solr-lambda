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
  const status = response[collection] as { activeShards?: number; inactiveShards?: number } | undefined;
  assert.ok(status && typeof status === "object", "status response must be keyed by collection name");
  assert.equal(status.activeShards, 1);
  assert.equal(status.inactiveShards, 0);
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

cloudIntegrationTest("V2 Aliases list and detail read back an isolated alias", async ({
  client,
  createCollection,
  createAlias
}) => {
  const collection = await createCollection("v2_alias");
  const alias = await createAlias(collection, "v2_alias");
  const list = await client.v2.aliases.list();
  assert.equal(list.aliases?.[alias], collection, "GET /api/aliases must include the alias mapping");
  const detail = await client.v2.aliases.status(alias);
  assert.equal(detail.name, alias);
  assert.deepEqual(detail.collections, [collection]);
}, false, false, ["9.11.0", "10.1.0"].includes(process.env.SOLR_VERSION ?? "")
  ? undefined
  : "The REST-style V2 alias read routes are documented for Solr 9.3+; Solr 8.11.4 is not claimed");
