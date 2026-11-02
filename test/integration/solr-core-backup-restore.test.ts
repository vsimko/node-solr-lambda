import assert from "node:assert/strict";
import { SolrClient } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

integrationTest("ReplicationHandler core backup and asynchronous restore cycle", async ({ createCore, createId }) => {
  const coreName = await createCore("backup_restore");
  const username = process.env.SOLR_USERNAME;
  const password = process.env.SOLR_PASSWORD;
  const client = new SolrClient({
    baseUrl: process.env.SOLR_BASE_URL!,
    core: coreName,
    timeoutMs: 30_000,
    ...(username && password ? { auth: { type: "basic" as const, username, password } } : {})
  });

  const id = createId("core_backup");
  const backupName = createId("snapshot");
  await client.add([{ id, title: "before backup" }]);
  await client.commit({ waitSearcher: true });

  const location = process.env.SOLR_BACKUP_LOCATION;
  const backupParams = { name: backupName, ...(location ? { location } : {}) };
  const backup = await client.replication("backup", backupParams);
  assert.equal(backup.responseHeader?.status, 0);

  let backupState: string | undefined;
  for (let attempt = 0; attempt < 120; attempt++) {
    const details = await client.replication("details");
    const backupDetails = details.details?.backup ?? details.backup;

    // Solr 8 completes ReplicationHandler backups but does not expose a backup
    // status in the details response. The subsequent restore verifies the
    // snapshot is usable on those versions.
    if (!backupDetails) break;

    backupState = backupDetails.status;
    if (backupState === "success") break;
    if (backupState === "failed" || backupDetails.snapShootException) throw new Error(JSON.stringify(details));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (backupState !== undefined) {
    assert.equal(backupState, "success", "core backup did not finish successfully");
  }

  await client.add([{ id, title: "after backup" }]);
  await client.commit({ waitSearcher: true });

  const restore = await client.replication("restore", backupParams);
  assert.equal(restore.responseHeader?.status, 0);

  let restoreState = "";
  for (let attempt = 0; attempt < 120; attempt++) {
    const status = await client.replication("restorestatus");
    restoreState = status.restorestatus?.status ?? status.status ?? "";
    if (restoreState === "success") break;
    if (restoreState === "failed") throw new Error(JSON.stringify(status));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.equal(restoreState, "success", "core restore did not finish successfully");

  const result = await client.query({ query: `id:${id}`, limit: 1 }) as {
    response?: { numFound?: number; docs?: readonly { title?: string | readonly string[] }[] };
  };
  assert.equal(result.response?.numFound, 1);
  assert.ok(result.response?.docs?.[0]?.title?.includes("before backup"));

  const deleted = await client.replication("deletebackup", backupParams);
  assert.equal(deleted.responseHeader?.status, 0);
});
