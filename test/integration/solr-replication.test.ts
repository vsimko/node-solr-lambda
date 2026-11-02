import assert from "node:assert/strict";
import { SolrClient } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

integrationTest("ReplicationHandler exposes index version, details, file list, and raw file content", async ({
  client,
  createCore,
  createId
}) => {
  const core = await createCore("replication_leader");
  const baseUrl = process.env.SOLR_BASE_URL!;
  const username = process.env.SOLR_USERNAME;
  const password = process.env.SOLR_PASSWORD;
  const replicationClient = new SolrClient({
    baseUrl,
    core,
    timeoutMs: 30_000,
    ...(username && password ? { auth: { type: "basic" as const, username, password } } : {})
  });
  await replicationClient.config({
    "update-requesthandler": {
      name: "/replication",
      class: "solr.ReplicationHandler",
      customOptions: { leader: { replicateAfter: "commit" } }
    }
  });
  await replicationClient.add([{ id: createId("replication"), title: "replication fixture" }]);
  await replicationClient.commit({ waitSearcher: true });

  const version = await replicationClient.replication("indexversion");
  assert.equal(version.responseHeader?.status, 0);
  const generation = Number(version.indexversion);
  assert.ok(Number.isFinite(generation) && generation > 0, JSON.stringify(version));
  assert.equal((await replicationClient.replication("enablereplication")).responseHeader?.status, 0);
  assert.equal((await replicationClient.replication("disablereplication")).responseHeader?.status, 0);

  const details = await replicationClient.replication("details");
  assert.equal(details.responseHeader?.status, 0);

  const fileList = await replicationClient.replication("filelist", { generation });
  assert.equal(fileList.responseHeader?.status, 0);
  assert.ok(fileList.filelist, JSON.stringify(fileList));

  const files = fileList.filelist?.file;
  const firstFile = Array.isArray(files) ? files[0] : files;
  assert.ok(firstFile?.name, "filelist should include at least one Lucene index file");

  const file = await replicationClient.replicationFile({
    directoryType: "file",
    filePath: firstFile.name,
    generation
  });
  assert.equal(file.status, 200);
  assert.ok(file.body);
  assert.ok((await file.arrayBuffer()).byteLength > 0);
});
