# Backup and restore APIs

Solr exposes two distinct backup/restore surfaces. Use the core-level ReplicationHandler for standalone cores, and the Collections API for SolrCloud collections. They have different storage requirements and status mechanisms.

## Core-level backup and restore

Core backups use the ReplicationHandler at `/solr/{core}/replication`. With no `location`, Solr stores the snapshot under the core's data directory. A custom filesystem location must be permitted by the server's `SOLR_HOME`, `SOLR_DATA_HOME`, or `solr.xml` `allowPaths` configuration.

```ts
// Create a timestamped snapshot of the current committed index.
await client.replication("backup", {
  numberToKeep: 5
});

// Restore the latest timestamped snapshot. Restore runs asynchronously.
await client.replication("restore");

let state = "";
while (state !== "success") {
  const result = await client.replication("restorestatus");
  state = result.restorestatus?.status ?? result.status ?? "";
  if (state === "failed") throw new Error(JSON.stringify(result));
  if (state !== "success") await new Promise(resolve => setTimeout(resolve, 500));
}

// Remove a core-level snapshot when it is no longer needed.
await client.replication("deletebackup", { name: "nightly" });
```

Important details:

- Commit the documents first with `client.commit()`; the `backup` command creates a backup only when committed index data exists.
- `name` is optional for backup/restore. When omitted, Solr generates a timestamp-based snapshot name and restore selects the latest timestamped snapshot.
- `numberToKeep` is a per-request retention option for timestamp-named backups. Solr ignores it when `name` is supplied, and rejects it when the handler is configured with `maxNumberOfBackups`; the server-side setting takes precedence.
- `commitName` selects a named commit created with the CoreAdmin `CREATESNAPSHOT` action.
- `repository` defaults to the local filesystem repository.
- `restorestatus` returns `In Progress`, `success`, or `failed`; a failure includes an exception.
- `backupAfter` and `maxNumberOfBackups` are ReplicationHandler server configuration, not client-side backup commands.

## SolrCloud collection backup and restore

Collection backups use the V1 Collections API actions. The location must be on shared storage available to the overseer and every node that may host collection replicas. A mounted path should therefore be mounted at the same location on all SolrCloud nodes.

```ts
const location = "file:///mnt/solr-backups";
const backupName = "catalog-backup";
const backupRequestId = "catalog-backup-2026-01";
const restoreRequestId = "catalog-restore-2026-01";

await client.collections("BACKUP", {
  name: backupName,
  collection: "catalog",
  location,
  async: backupRequestId,
  backupConfigset: true,
  incremental: true,
  indexBackup: "copy-files"
});

// Poll asynchronous completion.
const status = await client.collections("REQUESTSTATUS", {
  requestid: backupRequestId
});
if (status.status?.state === "failed") throw new Error(JSON.stringify(status));

// Inspect available backup points and select one to restore.
const backups = await client.collections("LISTBACKUP", {
  name: backupName,
  location
});
const backupId = backups.backups?.[0]?.backupId;
if (backupId === undefined) throw new Error("No backup point found");

await client.collections("RESTORE", {
  name: backupName,
  collection: "catalog-restored",
  location,
  backupId,
  async: restoreRequestId
});

// Poll REQUESTSTATUS with restoreRequestId until completed or failed.
// Remove the stored async status records after handling them.
await client.collections("DELETESTATUS", { requestid: backupRequestId });
await client.collections("DELETESTATUS", { requestid: restoreRequestId });

// Remove one backup point; the deletion strategy is mutually exclusive.
await client.collections("DELETEBACKUP", {
  name: backupName,
  location,
  backupId
});
```

Collection backup parameters include:

- `name` and `collection` (required for BACKUP), plus `location` unless a repository/cluster default is configured.
- `repository`, `async`, `maxNumBackupPoints`, `backupConfigset`, `incremental`, `indexBackup`, and `commitName`.
- `incremental` defaults to true. Full backups (`incremental: false`) are deprecated by Solr.
- `backupConfigset` defaults to true. A configset must exist in ZooKeeper or be included in the backup for restore to succeed.
- `indexBackup` accepts `copy-files` or `none`.
- RESTORE requires `name` and `collection`; `backupId` selects a specific point and otherwise the latest point is used.
- DELETEBACKUP requires exactly one deletion strategy: `backupId`, `maxNumBackupPoints`, or `purgeUnused: true`.

Asynchronous collection operations use `async` request IDs. Poll `REQUESTSTATUS` until `status.state` is `completed` or `failed`. Completed and failed statuses remain stored in ZooKeeper until `DELETESTATUS` removes them; use `DELETESTATUS { flush: true }` only when intentionally clearing all stored statuses.

The `LISTBACKUP` and `DELETEBACKUP` actions require the incremental backup format introduced in Solr 8.9. Older-format backups may still be restored, but cannot be listed or deleted with those actions.

## Compatibility boundary

- Core-level ReplicationHandler backup, restore, restorestatus, and deletebackup are integration-tested on Solr 8.11.4, 9.11.0, and 10.1.0.
- SolrCloud Collections BACKUP, LISTBACKUP, RESTORE, DELETEBACKUP, REQUESTSTATUS, and DELETESTATUS are integration-tested on all three pinned versions using a shared filesystem volume mounted in both test nodes.
- The client exposes V1 paths and action parameters. V2 backup endpoints are not wrapped by dedicated typed methods.
- Filesystem repositories are tested. S3 and other pluggable backup repositories are not certified by this integration suite.

See the official [ReplicationHandler backup/restore guide](https://solr.apache.org/guide/solr/10_1/deployment-guide/user-managed-index-replication.html), [Collections API](https://solr.apache.org/guide/solr/10_1/configuration-guide/collections-api.html), [Collection Management Commands](https://solr.apache.org/guide/solr/10_1/deployment-guide/collection-management.html), and [Solr 8.11](https://solr.apache.org/guide/8_11/index.html) / [Solr 9.11](https://solr.apache.org/guide/solr/9_11/index.html) reference guides.
