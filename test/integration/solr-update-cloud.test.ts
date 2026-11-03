import assert from "node:assert/strict";
import { cloudIntegrationTest } from "./fixtures.js";

cloudIntegrationTest("SolrCloud update route targets the requested implicit-router shard", async ({
  client,
  clientForCollection,
  createImplicitCollection
}) => {
  const collection = await createImplicitCollection("integration_update_route");
  const shard = "shard2";
  const created = await client.collections("CREATESHARD", { collection, shard, waitForFinalState: true });
  assert.equal(created.responseHeader?.status, 0, "second implicit-router shard should be created");

  const shardDeadline = Date.now() + 15_000;
  let shardActive = false;
  while (Date.now() < shardDeadline) {
    const status = await client.collections("CLUSTERSTATUS", { collection });
    const replicas = status.cluster?.collections?.[collection]?.shards?.[shard]?.replicas ?? {};
    shardActive = Object.values(replicas).some(replica => replica.state === "active");
    if (shardActive) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(shardActive, true, "new implicit-router shard should have an active replica before routing updates");

  const routedClient = clientForCollection(collection);
  const id = `routed_${collection}`;
  const added = await routedClient.add(
    { id, marker_s: "routed-to-shard2" },
    { route: shard }
  );
  assert.equal(added.responseHeader?.status, 0, "routed update should be accepted");
  await routedClient.commit();

  const targetShard = await routedClient.query<{ response?: { numFound?: number } }>({
    query: `id:${id}`,
    limit: 1,
    params: { _route_: shard }
  });
  const otherShard = await routedClient.query<{ response?: { numFound?: number } }>({
    query: `id:${id}`,
    limit: 1,
    params: { _route_: "shard1" }
  });

  assert.equal(targetShard.response?.numFound, 1, "the target shard should contain the routed document");
  assert.equal(otherShard.response?.numFound, 0, "the other shard should not contain the routed document");
});

cloudIntegrationTest("SolrCloud commitWithin makes an added document searchable without an explicit commit", async ({
  clientForCollection,
  createCollection
}) => {
  const collection = await createCollection("integration_commit_within");
  const collectionClient = clientForCollection(collection);
  const id = `commit_within_${collection}`;

  const added = await collectionClient.add(
    { id, marker_s: "commit-within" },
    { commitWithin: 1_000 }
  );
  assert.equal(added.responseHeader?.status, 0, "commitWithin update should be accepted");

  const deadline = Date.now() + 15_000;
  let visible = false;
  while (Date.now() < deadline) {
    const result = await collectionClient.query<{ response?: { numFound?: number } }>({
      query: `id:${id}`,
      limit: 1
    });
    if (result.response?.numFound === 1) {
      visible = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  assert.equal(
    visible,
    true,
    "commitWithin should make the document searchable within the bounded polling window without a manual commit"
  );
});
