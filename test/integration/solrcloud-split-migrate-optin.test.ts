import assert from "node:assert/strict";
import { cloudIntegrationTest } from "./fixtures.js";

const routeKey = "tenant!";

cloudIntegrationTest(
  "SPLITSHARD splits an isolated compositeId collection and preserves routed documents",
  async ({ client, createCollection, clientForCollection }) => {
    const collection = await createCollection("integration_splitshard_optin");
    const statusBefore = await client.collections("CLUSTERSTATUS", { collection });
    const liveNodes = statusBefore.cluster?.live_nodes ?? [];
    assert.ok(liveNodes.length >= 2, "opt-in verification requires at least two live SolrCloud nodes");
    const beforeShards = statusBefore.cluster?.collections?.[collection]?.shards ?? {};
    assert.equal(Object.keys(beforeShards).length, 1, "new disposable collection must start with exactly one shard");

    const source = clientForCollection(collection);
    const ids = [1, 2, 3].map(index => `${routeKey}split-${index}`);
    await source.add(ids.map(id => ({ id, title: "splitshard opt-in verification" })));
    await source.commit({ waitSearcher: true });

    const split = await client.collections("SPLITSHARD", {
      collection,
      "split.key": routeKey,
      waitForFinalState: true
    });
    assert.equal(split.responseHeader?.status, 0, "SPLITSHARD should complete successfully");

    const statusAfter = await client.collections("CLUSTERSTATUS", { collection });
    const shardsAfter = statusAfter.cluster?.collections?.[collection]?.shards ?? {};
    assert.ok(Object.keys(shardsAfter).length >= 2, "cluster state should expose the split child shards");
    assert.ok(
      Object.values(shardsAfter).every(shard => shard.state === "active"),
      "all resulting shards should be active"
    );
    const result = await source.query({ query: "*:*", fields: ["id"], limit: 10 });
    assert.equal(result.response?.numFound, ids.length, "all documents should remain searchable after the split");
  },
  true,
  true
);

cloudIntegrationTest(
  "MIGRATE moves an isolated compositeId routing prefix into a disposable target collection",
  async ({ client, createCollection, clientForCollection }) => {
    const sourceName = await createCollection("integration_migrate_source_optin");
    const targetName = await createCollection("integration_migrate_target_optin");
    const status = await client.collections("CLUSTERSTATUS");
    assert.ok((status.cluster?.live_nodes?.length ?? 0) >= 2, "opt-in verification requires at least two live SolrCloud nodes");
    const source = clientForCollection(sourceName);
    const target = clientForCollection(targetName);
    const ids = [1, 2, 3].map(index => `${routeKey}migrate-${index}`);

    await source.add(ids.map(id => ({ id, title: "migration opt-in verification" })));
    await source.commit({ waitSearcher: true });

    const targetBefore = await target.query({ query: "*:*", fields: ["id"], limit: 10 });
    assert.equal(targetBefore.response?.numFound, 0, "migration target must be empty before mutation");

    const migrated = await client.collections("MIGRATE", {
      collection: sourceName,
      "split.key": routeKey,
      "target.collection": targetName,
      "forward.timeout": 120
    });
    assert.equal(migrated.responseHeader?.status, 0, "MIGRATE should complete successfully");

    let targetCount = 0;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const result = await target.query({ query: "*:*", fields: ["id"], limit: 10 });
      targetCount = result.response?.numFound ?? 0;
      if (targetCount === ids.length) break;
      await new Promise(resolve => setTimeout(resolve, 1_000));
    }
    assert.equal(targetCount, ids.length, "target collection should contain every migrated routing-key document");
    const targetReadBack = await target.query({ query: "*:*", fields: ["id"], limit: 10 });
    const foundIds = new Set(targetReadBack.response?.docs?.map(document => String(document.id)) ?? []);
    for (const id of ids) assert.ok(foundIds.has(id), `target collection should contain migrated document ${id}`);
  },
  true,
  true
);
