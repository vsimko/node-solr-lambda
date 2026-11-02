import { createSolrClient } from "../src/index.js";

const client = createSolrClient({ core: "catalog" });

void client.replication("backup", { name: "nightly" });
void client.replication("backup", { numberToKeep: 3, commitName: "before-import" });
void client.replication("restore", { name: "nightly" });
void client.replication("restorestatus");
void client.replication("deletebackup", { name: "nightly" });

void client.collections("BACKUP", { name: "nightly", collection: "catalog", incremental: true });
void client.collections("RESTORE", { name: "nightly", collection: "catalog-restored", backupId: 1 });
void client.collections("LISTBACKUP", { name: "nightly" });
void client.collections("DELETEBACKUP", { name: "nightly", backupId: 1 });
void client.collections("DELETEBACKUP", { name: "nightly", maxNumBackupPoints: 2 });
void client.collections("DELETEBACKUP", { name: "nightly", purgeUnused: true });
void client.collections("REQUESTSTATUS", { requestid: "backup-1" });
void client.collections("DELETESTATUS", { requestid: "backup-1" });
void client.collections("DELETESTATUS", { flush: true });

// @ts-expect-error backup requires a collection name
void client.collections("BACKUP", { name: "nightly" });
// @ts-expect-error async status requires a request ID
void client.collections("REQUESTSTATUS", {});
// @ts-expect-error core-level backup deletion requires a backup name
void client.replication("deletebackup");
// @ts-expect-error core-level backup deletion requires a backup name
void client.replication("deletebackup", { location: "/backups" });
// @ts-expect-error DELETEBACKUP requires exactly one deletion strategy
void client.collections("DELETEBACKUP", { name: "nightly" });
// @ts-expect-error DELETEBACKUP cannot combine strategies
void client.collections("DELETEBACKUP", { name: "nightly", backupId: 1, purgeUnused: true });
// @ts-expect-error DELETESTATUS requires requestid or flush
void client.collections("DELETESTATUS", {});
// @ts-expect-error unsupported index backup mode is rejected
void client.collections("BACKUP", { name: "nightly", collection: "catalog", indexBackup: "zip" });
