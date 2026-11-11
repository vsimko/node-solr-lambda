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
});

cloudIntegrationTest("V2 cluster status reports the isolated collection", async ({
  client,
  createCollection
}) => {
  const collection = await createCollection("v2_cluster");
  const response = await client.v2.cluster.status();
  const listed = response.collections?.includes(collection) ??
    Boolean(response.cluster?.collections?.[collection]);
  assert.ok(listed, "GET /api/cluster must report the isolated collection");
});
