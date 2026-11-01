import assert from "node:assert/strict";
import { cloudIntegrationTest } from "./fixtures.js";

cloudIntegrationTest("Collections API creates, lists, and cleans up an isolated collection", async ({
  client,
  createCollection,
  createImplicitCollection,
  createAlias
}) => {
  const name = await createCollection();
  const result = await client.collections<{ collections?: string[] }>("LIST");
  assert.ok(result.collections?.includes(name), `collection list should contain ${name}`);

  const cluster = await client.collections<{
    cluster?: { live_nodes?: string[]; collections?: Record<string, unknown> };
  }>("CLUSTERSTATUS");
  assert.ok((cluster.cluster?.live_nodes?.length ?? 0) > 0, "cluster status should report live nodes");
  assert.ok(cluster.cluster?.collections?.[name], `cluster status should contain ${name}`);

  const alias = await createAlias(name);
  const aliases = await client.collections<{ aliases?: Record<string, string> }>("LISTALIASES");
  assert.equal(aliases.aliases?.[alias], name);

  const implicitName = await createImplicitCollection();
  const shard = "integration_shard";
  await client.collections("CREATESHARD", { collection: implicitName, shard });
  const withShard = await client.collections<{
    cluster?: { collections?: Record<string, { shards?: Record<string, unknown> }> };
  }>("CLUSTERSTATUS", { collection: implicitName });
  assert.ok(
    withShard.cluster?.collections?.[implicitName]?.shards?.[shard],
    `cluster status should contain shard ${shard}`
  );

  await client.collections("DELETESHARD", { collection: implicitName, shard });
  const withoutShard = await client.collections<{
    cluster?: { collections?: Record<string, { shards?: Record<string, unknown> }> };
  }>("CLUSTERSTATUS", { collection: implicitName });
  assert.equal(
    withoutShard.cluster?.collections?.[implicitName]?.shards?.[shard],
    undefined,
    `cluster status should not contain deleted shard ${shard}`
  );
});
