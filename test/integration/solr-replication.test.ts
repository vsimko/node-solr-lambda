import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("ReplicationHandler exposes index version, details, file list, and raw file content", async ({
  client,
  addDocuments,
  commit,
  createId
}) => {
  await addDocuments([{ id: createId("replication"), title: "replication fixture" }]);
  await commit();

  const version = await client.replication("indexversion");
  assert.equal(version.responseHeader?.status, 0);
  const generation = Number(version.indexversion);
  assert.ok(Number.isFinite(generation) && generation >= 0);

  const details = await client.replication("details");
  assert.equal(details.responseHeader?.status, 0);

  const fileList = await client.replication("filelist", { generation });
  assert.equal(fileList.responseHeader?.status, 0);
  assert.ok(fileList.filelist);

  const files = fileList.filelist?.file;
  const firstFile = Array.isArray(files) ? files[0] : files;
  assert.ok(firstFile?.name, "filelist should include at least one Lucene index file");

  const file = await client.replicationFile({
    directoryType: "file",
    filePath: firstFile.name,
    generation
  });
  assert.equal(file.status, 200);
  assert.ok(file.body);
  assert.ok((await file.arrayBuffer()).byteLength > 0);
});
