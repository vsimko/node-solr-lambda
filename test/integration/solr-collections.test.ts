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


cloudIntegrationTest("Collections API adds and deletes a named replica", async ({
  client,
  createCollection
}) => {
  const collection = await createCollection();
  type Replica = { state?: string; node_name?: string; type?: string };
  type ClusterStatus = {
    cluster?: {
      live_nodes?: string[];
      collections?: Record<string, {
        shards?: Record<string, { replicas?: Record<string, Replica> }>;
      }>;
    };
  };

  const before = await client.collections<ClusterStatus>("CLUSTERSTATUS", { collection });
  const liveNode = before.cluster?.live_nodes?.[0];
  const initialReplicas = before.cluster?.collections?.[collection]?.shards?.shard1?.replicas ?? {};
  assert.ok(liveNode, "cluster status should report a live node");
  assert.equal(Object.keys(initialReplicas).length, 1, "fixture collection should start with one replica");

  await client.collections("ADDREPLICA", {
    collection,
    shard: "shard1",
    node: liveNode,
    type: "nrt",
    waitForFinalState: true
  });

  const afterAdd = await client.collections<ClusterStatus>("CLUSTERSTATUS", { collection });
  const replicasAfterAdd = afterAdd.cluster?.collections?.[collection]?.shards?.shard1?.replicas ?? {};
  assert.equal(Object.keys(replicasAfterAdd).length, 2, "ADDREPLICA should create a second replica");
  const addedReplica = Object.keys(replicasAfterAdd).find(name => !(name in initialReplicas));
  assert.ok(addedReplica, "cluster status should expose the newly added replica");
  assert.equal(replicasAfterAdd[addedReplica]?.state, "active", "new replica should reach active state");

  await client.collections("DELETEREPLICA", {
    collection,
    shard: "shard1",
    replica: addedReplica,
    deleteInstanceDir: true,
    deleteDataDir: true,
    deleteIndex: true
  });

  const afterDelete = await client.collections<ClusterStatus>("CLUSTERSTATUS", { collection });
  const replicasAfterDelete = afterDelete.cluster?.collections?.[collection]?.shards?.shard1?.replicas ?? {};
  assert.deepEqual(
    Object.keys(replicasAfterDelete).sort(),
    Object.keys(initialReplicas).sort(),
    "DELETEREPLICA should remove only the named replica"
  );
});


cloudIntegrationTest("Collections API adds, balances, and deletes replica properties", async ({
  client,
  createCollection
}) => {
  const collection = await createCollection();
  type Replica = Record<string, unknown>;
  type ClusterStatus = {
    cluster?: {
      collections?: Record<string, {
        shards?: Record<string, { replicas?: Record<string, Replica> }>;
      }>;
    };
  };
  const readReplicas = async () => {
    const status = await client.collections<ClusterStatus>("CLUSTERSTATUS", { collection });
    return status.cluster?.collections?.[collection]?.shards?.shard1?.replicas ?? {};
  };

  const initial = await readReplicas();
  const replica = Object.keys(initial)[0];
  assert.ok(replica, "fixture collection should expose its initial replica");

  await client.collections("ADDREPLICAPROP", {
    collection,
    shard: "shard1",
    replica,
    property: "integrationFlag",
    "property.value": "enabled"
  });
  const withProperty = await readReplicas();
  assert.equal(withProperty[replica]?.["property.integrationFlag"], "enabled");

  await client.collections("DELETEREPLICAPROP", {
    collection,
    shard: "shard1",
    replica,
    property: "integrationFlag"
  });
  const withoutProperty = await readReplicas();
  assert.equal(withoutProperty[replica]?.["property.integrationFlag"], undefined);

  await client.collections("BALANCESHARDUNIQUE", {
    collection,
    property: "preferredLeader"
  });
  const balanced = await readReplicas();
  const preferred = Object.values(balanced).filter(
    item => item["property.preferredLeader"] === "true" || item["property.preferredLeader"] === true
  );
  assert.equal(preferred.length, 1, "BALANCESHARDUNIQUE should assign preferredLeader to one replica");
});
