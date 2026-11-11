import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { SolrClient, type SolrClusterReplica, type SolrClusterStatusResponse } from "../../src/index.js";
import { cloudIntegrationTest } from "./fixtures.js";

interface NodeContainer {
  name: string;
  port: number;
}

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8" }).trim();
}

function isLeader(replica: { leader?: boolean | string }): boolean {
  return replica.leader === true || replica.leader === "true";
}

function nodeContainer(nodeName: string, containers: NodeContainer[]): NodeContainer {
  const match = containers.find(container => nodeName.includes(container.name));
  assert.ok(match, `Unexpected Solr node name outside the dedicated containers: ${nodeName}`);
  return match;
}

function nodeBaseUrl(baseUrl: string, port: number): string {
  const url = new URL(baseUrl);
  url.port = String(port);
  return url.toString().replace(/\/$/, "");
}

function clientAt(baseUrl: string, port: number, collection?: string): SolrClient {
  return new SolrClient({
    baseUrl: nodeBaseUrl(baseUrl, port),
    timeoutMs: 30_000,
    ...(collection ? { collection } : {})
  });
}

async function delay(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function assertDedicatedContainer(
  container: NodeContainer,
  expectedImage: string,
  labelKey: string,
  networkName: string
): void {
  const labels = JSON.parse(docker(["inspect", "--format", "{{json .Config.Labels}}", container.name])) as Record<string, string>;
  assert.equal(labels[labelKey], "true", `${container.name} must carry the workflow-owned container label`);
  assert.equal(docker(["inspect", "--format", "{{.Config.Image}}", container.name]), expectedImage);
  assert.equal(docker(["inspect", "--format", "{{.State.Running}}", container.name]), "true");

  const bindings = JSON.parse(docker(["inspect", "--format", "{{json .HostConfig.PortBindings}}", container.name])) as
    Record<string, Array<{ HostIp: string; HostPort: string }>>;
  const binding = bindings["8983/tcp"]?.[0];
  assert.equal(binding?.HostIp, "127.0.0.1", `${container.name} must publish only on loopback`);
  assert.equal(binding?.HostPort, String(container.port));

  const networks = JSON.parse(docker(["inspect", "--format", "{{json .NetworkSettings.Networks}}", container.name])) as
    Record<string, unknown>;
  assert.ok(networkName in networks, `${container.name} must be attached to the dedicated workflow network`);
}

async function waitForHttp(baseUrl: string, label: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {
      // The node may still be starting.
    }
    await delay(1_000);
  }
  throw new Error(`${label} did not become healthy within 60 seconds`);
}

async function queryIds(client: SolrClient): Promise<Set<string>> {
  const result = await client.query<{ response?: { docs?: Array<{ id?: string }> } }>({
    query: "*:*",
    fields: ["id"],
    limit: 100
  });
  return new Set((result.response?.docs ?? []).flatMap(document =>
    typeof document.id === "string" ? [document.id] : []
  ));
}

async function waitForIds(client: SolrClient, expected: string[], label: string): Promise<Set<string>> {
  let found = new Set<string>();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    found = await queryIds(client);
    if (expected.every(id => found.has(id))) return found;
    await delay(1_000);
  }
  throw new Error(`${label} did not become visible: expected ${expected.join(", ")}, found ${[...found].join(", ")}`);
}

cloudIntegrationTest(
  "FORCELEADER promotes a deliberately stale replica after the former leader is unavailable",
  async ({ client, createCollection }) => {
    const baseUrl = process.env.SOLR_BASE_URL;
    const version = process.env.SOLR_VERSION;
    const primaryName = process.env.SOLR_FORCELEADER_PRIMARY_CONTAINER;
    const secondaryName = process.env.SOLR_FORCELEADER_SECONDARY_CONTAINER;
    const zkName = process.env.SOLR_FORCELEADER_ZK_CONTAINER;
    const labelKey = process.env.SOLR_FORCELEADER_CONTAINER_LABEL;
    const networkName = process.env.SOLR_FORCELEADER_NETWORK;
    const primaryPort = Number(process.env.SOLR_FORCELEADER_PRIMARY_PORT);
    const secondaryPort = Number(process.env.SOLR_FORCELEADER_SECONDARY_PORT);

    assert.ok(baseUrl && version && primaryName && secondaryName && zkName && labelKey && networkName,
      "The manual FORCELEADER workflow must provide its dedicated container identity");
    assert.ok(Number.isInteger(primaryPort) && primaryPort > 0);
    assert.ok(Number.isInteger(secondaryPort) && secondaryPort > 0);
    const endpoint = new URL(baseUrl);
    assert.ok(["localhost", "127.0.0.1", "::1"].includes(endpoint.hostname),
      "FORCELEADER fault injection must use a loopback-only Solr endpoint");
    assert.equal(endpoint.port, String(primaryPort));

    const containers: NodeContainer[] = [
      { name: primaryName, port: primaryPort },
      { name: secondaryName, port: secondaryPort }
    ];
    assert.notEqual(containers[0]!.name, containers[1]!.name);
    assert.notEqual(containers[0]!.port, containers[1]!.port);

    assertDedicatedContainer(containers[0]!, `solr:${version}`, labelKey, networkName);
    assertDedicatedContainer(containers[1]!, `solr:${version}`, labelKey, networkName);
    const zkLabels = JSON.parse(docker(["inspect", "--format", "{{json .Config.Labels}}", zkName])) as Record<string, string>;
    assert.equal(zkLabels[labelKey], "zookeeper", "ZooKeeper must be the separately labelled workflow-owned service");
    assert.equal(docker(["inspect", "--format", "{{.State.Running}}", zkName]), "true",
      "ZooKeeper must remain independent from both Solr node containers");

    const collection = await createCollection("forceleader_stale_replica", 2);
    const shardName = "shard1";
    let initial: SolrClusterStatusResponse | undefined;
    let initialReplicas: Array<[string, SolrClusterReplica]> = [];
    for (let attempt = 0; attempt < 60; attempt += 1) {
      initial = await client.collections("CLUSTERSTATUS", { collection });
      const shard = initial.cluster?.collections?.[collection]?.shards?.[shardName];
      initialReplicas = Object.entries(shard?.replicas ?? {});
      const leaders = initialReplicas.filter(([, replica]) => isLeader(replica));
      if (initialReplicas.length === 2 &&
        initialReplicas.every(([, replica]) => replica.state === "active") &&
        new Set(initialReplicas.map(([, replica]) => replica.node_name)).size === 2 &&
        leaders.length === 1) break;
      await delay(1_000);
    }
    assert.ok(initial, "The disposable collection must expose cluster status");
    const initialShard = initial.cluster?.collections?.[collection]?.shards?.[shardName];
    assert.ok(initialShard, "The disposable collection must expose shard1");
    assert.equal(initialReplicas.length, 2, "The shard must have exactly two replicas");
    assert.ok(initialReplicas.every(([, replica]) => replica.state === "active"),
      "Both replicas must be active before fault injection");
    assert.equal(new Set(initialReplicas.map(([, replica]) => replica.node_name)).size, 2,
      "The replicas must be placed on distinct Solr nodes");

    const initialLeaders = initialReplicas.filter(([, replica]) => isLeader(replica));
    assert.equal(initialLeaders.length, 1, "The shard must start with exactly one leader");
    const [leaderReplicaName, leaderReplica] = initialLeaders[0]!;
    const staleReplicaEntry = initialReplicas.find(([name]) => name !== leaderReplicaName);
    assert.ok(staleReplicaEntry, "A distinct follower replica must be available to make stale");
    const staleReplica = staleReplicaEntry[1];
    assert.ok(leaderReplica.node_name && staleReplica.node_name, "Both replicas must expose node_name");

    const leaderContainer = nodeContainer(leaderReplica.node_name, containers);
    const staleContainer = nodeContainer(staleReplica.node_name, containers);
    assert.notEqual(leaderContainer.name, staleContainer.name);
    const leaderClient = clientAt(baseUrl, leaderContainer.port, collection);
    const staleClient = clientAt(baseUrl, staleContainer.port, collection);
    const baselineIds = [1, 2, 3].map(index => `baseline-${randomUUID()}-${index}`);
    const acknowledgedAfterStale = [1, 2, 3].map(index => `late-${randomUUID()}-${index}`);
    const stopped = new Set<string>();

    console.log("FORCELEADER_INITIAL_CLUSTER_STATE", JSON.stringify(initial));

    try {
      await leaderClient.add(baselineIds.map(id => ({ id, phase: "committed-baseline" })));
      await leaderClient.commit({ waitSearcher: true });
      await waitForIds(leaderClient, baselineIds, "leader baseline");
      await waitForIds(staleClient, baselineIds, "follower baseline");

      docker(["stop", "--time", "10", staleContainer.name]);
      stopped.add(staleContainer.name);

      await leaderClient.add(acknowledgedAfterStale.map(id => ({ id, phase: "acknowledged-while-follower-offline" })));
      await leaderClient.commit({ waitSearcher: true });
      await waitForIds(leaderClient, [...baselineIds, ...acknowledgedAfterStale], "old leader acknowledged updates");

      docker(["stop", "--time", "10", leaderContainer.name]);
      stopped.add(leaderContainer.name);

      docker(["start", staleContainer.name]);
      stopped.delete(staleContainer.name);
      await waitForHttp(nodeBaseUrl(baseUrl, staleContainer.port), "stale replica node");

      let stateWithoutLeader: SolrClusterStatusResponse | undefined;
      let noLeader = false;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        try {
          const state = await staleClient.collections("CLUSTERSTATUS", { collection });
          const liveNodes = state.cluster?.live_nodes ?? [];
          const shard = state.cluster?.collections?.[collection]?.shards?.[shardName];
          const replicas = Object.values(shard?.replicas ?? {});
          stateWithoutLeader = state;
          if (liveNodes.length === 1 && liveNodes[0] === staleReplica.node_name &&
            replicas.every(replica => !isLeader(replica))) {
            noLeader = true;
            break;
          }
        } catch {
          // The old leader's ZooKeeper session may still be expiring.
        }
        await delay(1_000);
      }
      assert.ok(noLeader,
        `The stale replica must be the only live node with no shard leader before FORCELEADER. Last state: ${JSON.stringify(stateWithoutLeader)}`);
      console.log("FORCELEADER_PRE_PROMOTION_CLUSTER_STATE", JSON.stringify(stateWithoutLeader));

      const forced = await staleClient.collections("FORCELEADER", {
        collection,
        shard: shardName
      });
      assert.equal(forced.responseHeader?.status, 0, "FORCELEADER should be accepted only after the shard has no leader");

      let postState: SolrClusterStatusResponse | undefined;
      let promoted = false;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        postState = await staleClient.collections("CLUSTERSTATUS", { collection });
        const shard = postState.cluster?.collections?.[collection]?.shards?.[shardName];
        const newLeader = Object.values(shard?.replicas ?? {}).find(isLeader);
        if (newLeader?.node_name === staleReplica.node_name && newLeader.state === "active") {
          promoted = true;
          break;
        }
        await delay(1_000);
      }
      assert.ok(promoted,
        `FORCELEADER must promote the deliberately stale replica ${staleReplica.node_name}. Last state: ${JSON.stringify(postState)}`);
      console.log("FORCELEADER_POST_PROMOTION_CLUSTER_STATE", JSON.stringify(postState));

      const promotedClient = clientAt(baseUrl, staleContainer.port, collection);
      const visibleAfterPromotion = await waitForIds(promotedClient, baselineIds, "promoted stale replica baseline");
      for (const id of acknowledgedAfterStale) {
        assert.equal(visibleAfterPromotion.has(id), false,
          `Acknowledged update ${id} from the unavailable former leader must be absent on the stale promoted replica`);
      }
      console.log("FORCELEADER_ACKNOWLEDGED_DATA_LOSS_BOUNDARY", JSON.stringify({
        preservedBaselineIds: baselineIds,
        acknowledgedOnFormerLeaderWhileFollowerOffline: acknowledgedAfterStale,
        expectedAbsentAfterStalePromotion: acknowledgedAfterStale,
        promotedNode: staleReplica.node_name
      }));
    } finally {
      const cleanupErrors: unknown[] = [];
      for (const container of containers) {
        try {
          const running = docker(["inspect", "--format", "{{.State.Running}}", container.name]) === "true";
          if (!running) docker(["start", container.name]);
          await waitForHttp(nodeBaseUrl(baseUrl, container.port), `restarted ${container.name}`);
          stopped.delete(container.name);
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, "Failed to restart the dedicated FORCELEADER Solr nodes");
      }
    }
  },
  true,
  true,
  undefined,
  300_000
);
