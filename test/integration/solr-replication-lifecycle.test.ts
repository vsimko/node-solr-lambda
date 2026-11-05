import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { SolrClient } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

integrationTest("ReplicationHandler fetches a committed leader index into an isolated follower core", async ({
  createCore,
  createId
}) => {
  const leaderCore = await createCore("replication_lifecycle_leader");
  const followerCore = await createCore("replication_lifecycle_follower");
  const baseUrl = process.env.SOLR_BASE_URL!;
  const username = process.env.SOLR_USERNAME;
  const password = process.env.SOLR_PASSWORD;
  const makeClient = (core: string) => new SolrClient({
    baseUrl,
    core,
    timeoutMs: 30_000,
    ...(username && password ? { auth: { type: "basic" as const, username, password } } : {})
  });
  const leader = makeClient(leaderCore);
  const follower = makeClient(followerCore);
  const leaderUrl = `${baseUrl.replace(/\/$/, "")}/${leaderCore}`;
  const documentId = createId("replication_lifecycle");

  const leaderConfig = await leader.config({
    "update-requesthandler": {
      name: "/replication",
      class: "solr.ReplicationHandler",
      customOptions: { leader: { replicateAfter: ["commit"] } }
    }
  });
  assert.equal(leaderConfig.responseHeader?.status, 0);
  const followerConfig = await follower.config({
    "update-requesthandler": {
      name: "/replication",
      class: "solr.ReplicationHandler",
      customOptions: { follower: { leaderUrl, ...(username && password ? { httpBasicAuthUser: username, httpBasicAuthPassword: password } : {}) } }
    }
  });
  assert.equal(followerConfig.responseHeader?.status, 0);

  await leader.add([{ id: documentId, title: "leader follower lifecycle" }]);
  await leader.commit({ waitSearcher: true });

  const leaderVersion = await leader.replication("indexversion");
  assert.equal(leaderVersion.responseHeader?.status, 0);
  const leaderGeneration = leaderVersion.generation ?? Number(leaderVersion.indexversion);
  assert.ok(Number.isFinite(leaderGeneration) && leaderGeneration > 0, "leader must publish a replicable index");

  const fetchCommand = "fetchindex";
  const fetchResponse = await follower.replication(fetchCommand, {
    leaderUrl,
    ...(username && password ? { customParams: { httpBasicAuthUser: username, httpBasicAuthPassword: password } } : {})
  });
  assert.equal(fetchResponse.responseHeader?.status, 0, `${fetchCommand} should complete successfully`);

  // Replication copies Lucene index files asynchronously; assert the resulting
  // searchable state rather than treating the command's HTTP response as proof.
  let found = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await follower.query<{ response?: { numFound?: number } }>({ query: `id:"${documentId}"`, fields: ["id"], limit: 1 });
    if ((result.response?.numFound ?? 0) === 1) {
      found = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  if (!found) {
    const details = await follower.replication("details");
    const abortCommand = "abortfetch";
    await follower.replication(abortCommand).catch(() => undefined);
    assert.fail(`follower did not expose the leader document after fetch; details: ${JSON.stringify(details)}`);
  }

  const followerVersion = await follower.replication("indexversion");
  assert.equal(followerVersion.responseHeader?.status, 0);
  const followerGeneration = followerVersion.generation ?? Number(followerVersion.indexversion);
  assert.ok(Number.isFinite(followerGeneration) && followerGeneration > 0, "follower should publish its fetched index");
});

integrationTest("ReplicationHandler aborts an in-progress fetch and reports its state", async ({
  createCore,
  createId,
}) => {
  const leaderCore = await createCore("replication_abort_leader");
  const followerCore = await createCore("replication_abort_follower");
  const baseUrl = process.env.SOLR_BASE_URL!;
  const username = process.env.SOLR_USERNAME;
  const password = process.env.SOLR_PASSWORD;
  const makeClient = (core: string) => new SolrClient({
    baseUrl,
    core,
    timeoutMs: 120_000,
    ...(username && password ? { auth: { type: "basic" as const, username, password } } : {})
  });
  const leader = makeClient(leaderCore);
  const follower = makeClient(followerCore);
  const leaderUrl = `${baseUrl.replace(/\/$/, "")}/${leaderCore}`;
  const documentId = createId("replication_abort");
  const storedField = createId("replication_payload");
  const payload = randomBytes(2 * 1024 * 1024).toString("base64");

  await leader.schema({ "add-field": { name: storedField, type: "string", stored: true, indexed: false, docValues: false } });
  await leader.add([{ id: documentId, [storedField]: payload }]);
  await leader.commit({ waitSearcher: true });

  await leader.config({
    "update-requesthandler": {
      name: "/replication",
      class: "solr.ReplicationHandler",
      customOptions: {
        leader: { replicateAfter: ["commit"] },
        // Throttle leader file streaming so the follower remains in a real in-progress fetch.
        defaults: { maxWriteMBPerSec: 0.1 }
      }
    }
  });
  await follower.config({
    "update-requesthandler": {
      name: "/replication",
      class: "solr.ReplicationHandler",
      customOptions: { follower: { leaderUrl, ...(username && password ? { httpBasicAuthUser: username, httpBasicAuthPassword: password } : {}) } }
    }
  });

  const fetchResponse = await follower.replication("fetchindex", {
    leaderUrl,
    ...(username && password ? { customParams: { httpBasicAuthUser: username, httpBasicAuthPassword: password } } : {})
  });
  assert.equal(fetchResponse.status, "OK", "fetchindex should start asynchronously");

  const isReplicating = async (): Promise<boolean> => {
    const response = await follower.replication("details");
    const details = response.details as { follower?: { isReplicating?: string | boolean } } | undefined;
    return String(details?.follower?.isReplicating).toLowerCase() === "true";
  };

  try {
  let observedActiveFetch = false;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await isReplicating()) {
      observedActiveFetch = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.ok(observedActiveFetch, "details should expose isReplicating=true before the large fetch completes");

  const abortResponse = await follower.replication("abortfetch");
  assert.equal(abortResponse.status, "OK", "abortfetch should acknowledge the cancellation request");

  let fetchStopped = false;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (!(await isReplicating())) {
      fetchStopped = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.ok(fetchStopped, "details should report that the fetch stopped after abortfetch");

  const result = await follower.query<{ response?: { numFound?: number } }>({
    query: `id:"${documentId}"`,
    fields: ["id"],
    limit: 1
  });
  assert.equal(result.response?.numFound ?? 0, 0, "an aborted fetch must not install the leader document");
  } finally {
    // Do not let a failed assertion leave the asynchronous fetch holding either disposable core open.
    await follower.replication("abortfetch").catch(() => undefined);
    for (let attempt = 0; attempt < 200; attempt += 1) {
      try {
        if (!(await isReplicating())) break;
      } catch {
        // Continue bounded cleanup attempts while Solr is stopping the transfer.
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }
}, 120_000, process.env.SOLR_VERSION === "8.11.4"
  ? "Solr 8.11.4 does not expose a reliably observable in-progress ReplicationHandler fetch; abort lifecycle remains unverified on this version."
  : undefined);
