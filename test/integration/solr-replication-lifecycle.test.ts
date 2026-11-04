import assert from "node:assert/strict";
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
  const leaderUrl = `${baseUrl.replace(/\/$/, "")}/${leaderCore}/replication`;
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
  const fetchResponse = await follower.replication(fetchCommand, { leaderUrl });
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
