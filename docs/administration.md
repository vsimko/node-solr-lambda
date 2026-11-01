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
