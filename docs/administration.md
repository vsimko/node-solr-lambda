# Core and collection administration

Create a client without a core name to use global administration endpoints.

Use `coreAdmin()` to send a Core Admin action.

```ts
const admin = createSolrClient({ baseUrl: "http://localhost:8983" });
const status = await admin.coreAdmin("STATUS", { core: "catalog" });
```

Use `collections()` to send a SolrCloud Collections API action.

```ts
const result = await admin.collections("LIST");
```

Use `systemInfo()` to read system information. Use `metrics()` to read metrics. Use `security()` to read or update authentication and authorization settings.

```ts
const system = await admin.systemInfo();
const metrics = await admin.metrics({ group: "jvm" });
```

Check the API coverage matrix for endpoint-specific models and version tests. The action parameter is typed. Some action parameters still use a general key-value map.

## Replica lifecycle parameters

`collections("ADDREPLICA", params)` accepts the exported `AddReplicaParams` model. It exposes the target collection and shard, replica type (`NRT`, `TLOG`, or `PULL`), placement node or candidate node set, optional replica name, final-state wait, and async request ID.

`collections("DELETEREPLICA", params)` accepts `DeleteReplicaParams`, including the target replica and explicit directory/index deletion flags. Both parameter models expose `customParams` for additional Solr options not yet modelled. These deletion flags are destructive; leave them unset unless the corresponding on-disk data should be removed.

The types improve editor completion but do not guarantee that a requested placement is possible in a particular SolrCloud topology. Runtime compatibility and safe lifecycle behavior must be verified against each supported Solr version.

## Replica lifecycle integration coverage

The SolrCloud integration suite creates a disposable one-shard collection with one replica, reads its live node and replica names from `CLUSTERSTATUS`, adds a second NRT replica to that node with `waitForFinalState=true`, verifies it becomes active, and deletes only that newly added replica by name. The test then verifies the original replica remains. The collection fixture is removed even if an assertion fails.

The V1 Collections API uses lowercase replica type values: `nrt`, `tlog`, and `pull`. Replica placement is constrained by live nodes, collection settings, and cluster topology; a successful type check does not guarantee that placement will succeed.

The ADDREPLICA and DELETEREPLICA request parameters follow the official [Solr 8.11](https://solr.apache.org/guide/8_11/replica-management.html), [Solr 9.11](https://solr.apache.org/guide/solr/9_11/deployment-guide/replica-management.html), and [Solr 10.1](https://solr.apache.org/guide/solr/10_1/deployment-guide/replica-management.html) Replica Management references. The V1 endpoints remain in use here; the client does not expose the distinct V2 routes.

## Replica movement and properties

The Collections API also exposes action-specific parameter models for `MOVEREPLICA`, `BALANCESHARDUNIQUE`, `REBALANCELEADERS`, `ADDREPLICAPROP`, and `DELETEREPLICAPROP`. These map to the V1 Collections API actions documented by Apache Solr.

`MOVEREPLICA` requires a destination node and either a replica name or the source node plus shard. Solr implements a move by creating the destination replica and then deleting the source replica. A timeout can leave an extra replica; it does not roll back the add operation. A dedicated multi-node SolrCloud CI path now exercises moving a named replica to a different live node and verifies that the replica is active on the requested target. The test runs against Solr 8.11.4, 9.11.0, and 10.1.0.

`BALANCESHARDUNIQUE` balances a shard-unique property such as `preferredLeader`. `ADDREPLICAPROP` and `DELETEREPLICAPROP` manage an individual replica's property. Property add/delete and preferred-leader balancing return successful responses on the pinned Solr 8.11.4, 9.11.0, and 10.1.0 images (CI #209). This verifies that the actions are accepted, not a cluster-state property read-back; the one-node topology cannot demonstrate cross-node distribution. `REBALANCELEADERS` has a typed request model and serialization coverage, but no runtime leader reassignment test.
