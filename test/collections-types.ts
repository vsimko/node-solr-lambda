import type {
  AddReplicaParams,
  CollectionAdminParams,
  CollectionReplicaType,
  DeleteReplicaParams
} from "../src/index.js";
import type { SolrClient } from "../src/client.js";

const replicaType: CollectionReplicaType = "nrt";
const addReplica = {
  collection: "books",
  shard: "shard1",
  type: replicaType,
  node: "127.0.0.1:8983_solr",
  waitForFinalState: true,
  customParams: { "property.zone": "hot" }
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

const moveParams = {
  collection: "books",
  replica: "core_node2",
  targetNode: "solr-node-2:8983_solr",
  timeout: 120
} satisfies import("../src/index.js").MoveReplicaParams;
const balanceParams = {
  collection: "books",
  property: "preferredLeader",
  onlyactivenodes: true
} satisfies import("../src/index.js").BalanceShardUniqueParams;
const addReplicaProperty = {
  collection: "books",
  shard: "shard1",
  replica: "core_node2",
  property: "preferredLeader",
  "property.value": "true"
} satisfies import("../src/index.js").AddReplicaPropertyParams;
const deleteReplicaProperty = {
  collection: "books",
  shard: "shard1",
  replica: "core_node2",
  property: "preferredLeader"
} satisfies import("../src/index.js").DeleteReplicaPropertyParams;

declare const moveClient: import("../src/client.js").SolrClient;
void moveClient.collections("MOVEREPLICA", moveParams);
void moveClient.collections("BALANCESHARDUNIQUE", balanceParams);
void moveClient.collections("ADDREPLICAPROP", addReplicaProperty);
void moveClient.collections("DELETEREPLICAPROP", deleteReplicaProperty);

// @ts-expect-error MOVEREPLICA requires a target node.
const invalidMove: import("../src/index.js").MoveReplicaParams = { collection: "books" };
void invalidMove;

const rebalanceParams = {
  collection: "books",
  maxAtOnce: 2,
  maxWaitSeconds: 30
} satisfies import("../src/index.js").RebalanceLeadersParams;
void moveClient.collections("REBALANCELEADERS", rebalanceParams);
