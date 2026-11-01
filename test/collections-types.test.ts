import type {
  AddReplicaParams,
  CollectionAdminParams,
  CollectionReplicaType,
  DeleteReplicaParams
} from "../src/index.js";
import type { SolrClient } from "../src/client.js";

const replicaType: CollectionReplicaType = "NRT";
const addReplica = {
  collection: "books",
  shard: "shard1",
  type: replicaType,
  node: "127.0.0.1:8983_solr",
  waitForFinalState: true
} satisfies AddReplicaParams;

const deleteReplica = {
  collection: "books",
  shard: "shard1",
  replica: "core_node2",
  deleteInstanceDir: false,
  deleteDataDir: true,
  deleteIndex: true
} satisfies DeleteReplicaParams;

const addParams: CollectionAdminParams<"ADDREPLICA"> = addReplica;
const deleteParams: CollectionAdminParams<"DELETEREPLICA"> = deleteReplica;

declare const client: SolrClient;
void client.collections("ADDREPLICA", addParams);
void client.collections("DELETEREPLICA", deleteParams);

// @ts-expect-error Solr replica type is restricted to NRT, TLOG, or PULL.
const invalidReplicaType: AddReplicaParams = { type: "REPLICA" };

// @ts-expect-error deleteDataDir must be a boolean.
const invalidDeleteOption: DeleteReplicaParams = { deleteDataDir: "yes" };

void invalidReplicaType;
void invalidDeleteOption;
