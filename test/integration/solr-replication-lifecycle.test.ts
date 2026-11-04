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
  const solrMajor = Number(process.env.SOLR_VERSION?.split(".")[0] ?? "0");
  // Solr 8 expects the handler URL; Solr 9+ appends /replication internally.
  const leaderUrl = `${baseUrl.replace(/\/$/, "")}/${leaderCore}${solrMajor === 8 ? "/replication" : ""}`;
  const documentId = createId("replication_lifecycle");

  const leaderConfig = await leader.config({
    "update-requesthandler": {
      name: "/replication",
      class: "solr.ReplicationHandler",
      handleSelect: true,
      customOptions: { leader: { replicateAfter: ["commit"] } }
    }
  });
  assert.equal(leaderConfig.responseHeader?.status, 0);
  const followerConfig = await follower.config({
    "update-requesthandler": {
      name: "/replication",
      class: "solr.ReplicationHandler",
      handleSelect: true,
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

  const fetchCommand = solrMajor >= 10 ? "fetchindex" : "snappull";
  const fetchResponse = await follower.replication(fetchCommand);
  assert.equal(fetchResponse.responseHeader?.status, 0, `${fetchCommand} should complete successfully`);

  // Replication copies Lucene index files asynchronously; assert the resulting
  // searchable state rather than treating the command's HTTP response as proof.
  let found = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await follower.query<{ response?: { numFound?: number } }>({ query: `id:"${documentId}"`, fields: ["id"], limit: 1 });
    if ((result.response?.numFound ?? 0) === 1) {
      found = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(found, "follower should expose the leader document after the fetch completes");

  const followerVersion = await follower.replication("indexversion");
  assert.equal(followerVersion.responseHeader?.status, 0);
  const followerGeneration = followerVersion.generation ?? Number(followerVersion.indexversion);
  assert.ok(Number.isFinite(followerGeneration) && followerGeneration > 0, "follower should publish its fetched index");
});
