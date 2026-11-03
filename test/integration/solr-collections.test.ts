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
  const aliases = await client.collections("LISTALIASES");
  assert.equal(aliases.aliases?.[alias], name);

  const implicitName = await createImplicitCollection();
  const shard = "integration_shard";
  const createdShard = await client.collections("CREATESHARD", { collection: implicitName, shard });
  assert.equal(createdShard.responseHeader?.status, 0, "CREATESHARD should succeed");
  const withShard = await client.collections<{
    cluster?: { collections?: Record<string, { shards?: Record<string, unknown> }> };
  }>("CLUSTERSTATUS", { collection: implicitName });
  assert.ok(
    withShard.cluster?.collections?.[implicitName]?.shards?.[shard],
    `cluster status should contain shard ${shard}`
  );

  const deletedShard = await client.collections("DELETESHARD", { collection: implicitName, shard });
  assert.equal(deletedShard.responseHeader?.status, 0, "DELETESHARD should succeed");
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
  type ClusterStatus = {
    cluster?: {
      collections?: Record<string, {
        shards?: Record<string, { replicas?: Record<string, unknown> }>;
      }>;
    };
  };
  const status = await client.collections<ClusterStatus>("CLUSTERSTATUS", { collection });
  const replicas = status.cluster?.collections?.[collection]?.shards?.shard1?.replicas ?? {};
  const replica = Object.keys(replicas)[0];
  assert.ok(replica, "fixture collection should expose its initial replica");

  const added = await client.collections<{ responseHeader?: { status?: number } }>("ADDREPLICAPROP", {
    collection,
    shard: "shard1",
    replica,
    property: "integrationFlag",
    "property.value": "enabled"
  });
  assert.equal(added.responseHeader?.status, 0, "ADDREPLICAPROP should succeed");

  const removed = await client.collections<{ responseHeader?: { status?: number } }>("DELETEREPLICAPROP", {
    collection,
    shard: "shard1",
    replica,
    property: "integrationFlag"
  });
  assert.equal(removed.responseHeader?.status, 0, "DELETEREPLICAPROP should succeed");

  const balanced = await client.collections<{ responseHeader?: { status?: number } }>("BALANCESHARDUNIQUE", {
    collection,
    property: "preferredLeader"
  });
  assert.equal(balanced.responseHeader?.status, 0, "BALANCESHARDUNIQUE should succeed");
});

cloudIntegrationTest("Collections API moves a replica between live SolrCloud nodes", async ({
  client,
  createCollection
}) => {
  const collection = await createCollection("integration_move", 1);
  type Replica = { state?: string; node_name?: string; leader?: string };
  type ClusterStatus = {
    cluster?: {
      live_nodes?: string[];
      collections?: Record<string, {
        shards?: Record<string, { replicas?: Record<string, Replica> }>;
      }>;
    };
  };

  const before = await client.collections<ClusterStatus>("CLUSTERSTATUS", { collection });
  const liveNodes = before.cluster?.live_nodes ?? [];
  assert.ok(liveNodes.length >= 2, "multi-node SolrCloud should report at least two live nodes");
  const replicas = before.cluster?.collections?.[collection]?.shards?.shard1?.replicas ?? {};
  const [replicaName, replica] = Object.entries(replicas)[0] ?? [];
  assert.ok(replicaName && replica?.node_name, "fixture should expose the source replica and node");
  const targetNode = liveNodes.find(node => node !== replica.node_name);
  assert.ok(targetNode, "a live target node distinct from the source should exist");

  await client.collections("MOVEREPLICA", {
    collection,
    replica: replicaName,
    targetNode,
    timeout: 120
  });

  const after = await client.collections<ClusterStatus>("CLUSTERSTATUS", { collection });
  const movedReplicas = after.cluster?.collections?.[collection]?.shards?.shard1?.replicas ?? {};
  const activeReplicas = Object.values(movedReplicas).filter(item => item.state === "active");
  assert.equal(activeReplicas.length, 1, "move should leave exactly one active replica");
  assert.equal(activeReplicas[0]?.node_name, targetNode, "replica should be active on the requested target node");
}, true);

cloudIntegrationTest("Collections API rebalances a shard leader to its preferred replica", async ({
  client,
  createCollection
}) => {
  const collection = await createCollection("integration_rebalance_leaders", 2);
  type Replica = { state?: string; node_name?: string; leader?: string | boolean };
  type ClusterStatus = {
    cluster?: {
      collections?: Record<string, {
        shards?: Record<string, { replicas?: Record<string, Replica> }>;
      }>;
    };
  };

  const before = await client.collections<ClusterStatus>("CLUSTERSTATUS", { collection });
  const replicas = before.cluster?.collections?.[collection]?.shards?.shard1?.replicas ?? {};
  const activeReplicas = Object.entries(replicas).filter(([, replica]) => replica.state === "active");
  assert.equal(activeReplicas.length, 2, "two-replica fixture should have two active replicas");
  assert.notEqual(
    activeReplicas[0]?.[1].node_name,
    activeReplicas[1]?.[1].node_name,
    "replicas should be placed on distinct live nodes"
  );

  const isLeader = (replica: Replica): boolean =>
    replica.leader === true || replica.leader === "true";
  const currentLeaders = activeReplicas.filter(([, replica]) => isLeader(replica));
  assert.equal(currentLeaders.length, 1, "shard should have exactly one active leader");
  const [preferredReplicaName] = activeReplicas.find(([, replica]) => !isLeader(replica)) ?? [];
  assert.ok(preferredReplicaName, "fixture should expose an active non-leader replica");

  const propertyResult = await client.collections<{ responseHeader?: { status?: number } }>("ADDREPLICAPROP", {
    collection,
    shard: "shard1",
    replica: preferredReplicaName,
    property: "preferredLeader",
    "property.value": "true"
  });
  assert.equal(propertyResult.responseHeader?.status, 0, "preferredLeader property should be assigned");

  // Replica properties are written to ZooKeeper; allow the cluster-state watchers
  // on the Solr nodes to observe the preferredLeader change before rebalancing.
  await new Promise(resolve => setTimeout(resolve, 500));

  const rebalanceResult = await client.collections<{ responseHeader?: { status?: number } }>("REBALANCELEADERS", {
    collection,
    maxAtOnce: 1,
    maxWaitSeconds: 30
  });
  assert.equal(rebalanceResult.responseHeader?.status, 0, "REBALANCELEADERS should succeed");

  let preferredReplicaIsLeader = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    const after = await client.collections<ClusterStatus>("CLUSTERSTATUS", { collection });
    const replicasAfterRebalance = after.cluster?.collections?.[collection]?.shards?.shard1?.replicas ?? {};
    preferredReplicaIsLeader = isLeader(replicasAfterRebalance[preferredReplicaName] ?? {});
    if (preferredReplicaIsLeader) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(
    preferredReplicaIsLeader,
    true,
    "preferred active replica should become the shard leader within five seconds"
  );
}, true);
