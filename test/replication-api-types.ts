import { createSolrClient } from "../src/index.js";

const client = createSolrClient({ core: "catalog" });

void client.replication("indexversion");
void client.replication("details");
void client.replication("filelist", { generation: 12 });
void client.replication("filelist", { indexversion: 12 });
void client.replication("fetchindex", { leaderUrl: "http://leader:8983/solr/catalog", compression: "internal" });
void client.replication("enablereplication");
void client.replication("disablereplication");
void client.replication("enablepoll");
void client.replication("disablepoll");
void client.replication("abortfetch");
void client.replication("snappull", { leaderUrl: "http://leader:8983/solr/catalog" });
void client.replication("abort");
void client.replicationFile({ directoryType: "cf", filePath: "managed-schema", checksum: true });

// @ts-expect-error filelist requires a generation or indexversion
void client.replication("filelist");
// @ts-expect-error invalid compression modes are rejected
void client.replication("fetchindex", { compression: "gzip" });
// @ts-expect-error directory type is constrained to Solr's supported values
void client.replicationFile({ directoryType: "other", filePath: "segments_1" });
// @ts-expect-error file content requires a path
void client.replicationFile({ directoryType: "file" });
