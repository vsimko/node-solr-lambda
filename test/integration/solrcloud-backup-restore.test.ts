import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cloudIntegrationTest, type SolrCloudIntegrationFixture } from "./fixtures.js";

async function waitForCollectionRequest(
  client: SolrCloudIntegrationFixture["client"],
  requestid: string
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt++) {
    const status = await client.collections("REQUESTSTATUS", { requestid });
    const state = status.status?.state;
    if (state === "completed") return;
    if (state === "failed" || state === "notfound") {
      throw new Error(`Collection request ${requestid} ended in ${state}: ${JSON.stringify(status)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for collection request ${requestid}`);
}

cloudIntegrationTest("SolrCloud collection backup, list, restore, and delete cycle", async ({
  client,
  clientForCollection,
  createCollection
}) => {
  const location = process.env.SOLR_BACKUP_LOCATION;
  assert.ok(location, "SOLR_BACKUP_LOCATION must point to shared storage mounted in every SolrCloud node");

  const source = await createCollection("backup_source", 2);
  const target = await createCollection("backup_target", 2);
  const sourceClient = clientForCollection(source);
  const targetClient = clientForCollection(target);
  const id = `cloud_backup_${randomUUID().replaceAll("-", "")}`;
  const backupName = `backup_${randomUUID().replaceAll("-", "")}`;
  const backupRequest = `backup_${randomUUID().replaceAll("-", "")}`;
  const restoreRequest = `restore_${randomUUID().replaceAll("-", "")}`;

  await sourceClient.add([{ id, title: "solrcloud backup fixture" }]);
  await sourceClient.commit({ waitSearcher: true });

  const backup = await client.collections("BACKUP", {
    name: backupName,
    collection: source,
    location,
    async: backupRequest,
    backupConfigset: true,
    incremental: true,
    indexBackup: "copy-files"
  });
  assert.equal(backup.responseHeader?.status, 0);
  await waitForCollectionRequest(client, backupRequest);

  const listed = await client.collections("LISTBACKUP", { name: backupName, location });
  const backupPoint = listed.backups?.[0];
  assert.ok(backupPoint, JSON.stringify(listed));

  const restore = await client.collections("RESTORE", {
    name: backupName,
    collection: target,
    location,
    backupId: backupPoint.backupId,
    async: restoreRequest
  });
  assert.equal(restore.responseHeader?.status, 0);
  await waitForCollectionRequest(client, restoreRequest);

  const restored = await targetClient.query({ q: `id:${id}`, rows: 1 }) as {
    response?: { numFound?: number; docs?: readonly { title?: string }[] };
  };
  assert.equal(restored.response?.numFound, 1);
  assert.equal(restored.response?.docs?.[0]?.title, "solrcloud backup fixture");

  const deleted = await client.collections("DELETEBACKUP", {
    name: backupName,
    location,
    backupId: backupPoint.backupId!
  });
  assert.equal(deleted.responseHeader?.status, 0);
  await client.collections("DELETESTATUS", { requestid: backupRequest });
  await client.collections("DELETESTATUS", { requestid: restoreRequest });
});
