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

Core Admin and Collections API actions now use action-specific exported parameter models. For example, `coreAdmin("CREATE", ...)` exposes core creation settings, while `collections("CREATE", ...)` exposes collection routing, shard, replica, and config-set options. Each action model has a `customParams` property for valid Solr parameters not yet represented by a named property; this escape hatch is explicit and does not weaken completion for the standard options. See the TypeScript consumer fixture in `test/admin-api-types.ts` for accepted and rejected examples.

`CoreAdminParams<A>` and `CollectionAdminParams<A>` map each action literal to its corresponding parameter interface. Unsupported or version-specific server options should be supplied through `customParams` and checked against the documentation for the target Solr version.

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

`BALANCESHARDUNIQUE` balances a shard-unique property such as `preferredLeader`. `ADDREPLICAPROP` and `DELETEREPLICAPROP` manage an individual replica's property. Property add/delete and preferred-leader balancing return successful responses on the pinned Solr 8.11.4, 9.11.0, and 10.1.0 images (CI #209). The multi-node SolrCloud suite also assigns `preferredLeader` to an active non-leader replica, runs `REBALANCELEADERS`, and verifies through `CLUSTERSTATUS` that the preferred replica becomes leader. This runtime test runs against Solr 8.11.4, 9.11.0, and 10.1.0.

## Core Admin STATUS response

Use the exported `CoreAdminStatusResponse` type when reading `coreAdmin("STATUS")`. The response models the optional response header, per-core status map, initialization failures, core paths/configuration metadata, and index statistics returned when `indexInfo=true`. Individual properties are optional because unloaded/unavailable cores and requests without index details return smaller payloads. Index signatures preserve additional server- or version-specific metadata.

The unit suite checks both a minimal response and a detailed response containing index statistics and an unknown future field. The isolated-core integration test requests index information, checks the returned core paths and document count, and repeats STATUS after RELOAD on each pinned Solr 8.11.4, 9.11.0, and 10.1.0 CI image. These assertions verify the exercised response shape; they do not claim every optional field is present on every version.

## Core Admin lifecycle safety and evidence

The typed Core Admin action set is `STATUS`, `CREATE`, `RELOAD`, `UNLOAD`, `RENAME`, `SWAP`, `MERGEINDEXES`, and `SPLIT`. The current shared integration suite exercises isolated `CREATE`, filtered and unfiltered `STATUS`, `RELOAD`, and fixture-cleanup `UNLOAD`. The `UNLOAD` cleanup test removes only a core created by that test fixture.

| Action | Operational effect and safety boundary | Shared CI evidence |
| --- | --- | --- |
| `UNLOAD` | Removes a core from the running Solr node. `deleteIndex`, `deleteDataDir`, and `deleteInstanceDir` can permanently remove on-disk data; do not set them for a core whose data must be retained. | Used only for cleanup of a uniquely created test core with all three deletion flags enabled. |
| `RENAME` | Changes the registered core name. Update clients, aliases, and operational references that use the old name; do not rename a shared fixture. | Not exercised; no shared fixture is renamed. |
| `SWAP` | Exchanges the names of two existing cores. Both cores must be disposable and isolated; the operation changes which data each name resolves to. | Not exercised; no shared fixture names are swapped. |
| `MERGEINDEXES` | Merges index segments from source core(s) or index directories into the target core. Validate schema/field compatibility and target contents; use disposable cores and backups because this mutates the target index. | Not exercised; it requires isolated source and target indexes. |
| `SPLIT` | Splits a core's index into target cores or filesystem paths. It can create or overwrite substantial index data and depends on valid split ranges/keys and target configuration. | Not exercised; target paths/cores and disk effects are environment-specific. |

`CREATE` and `RELOAD` are covered by the existing isolated lifecycle test. A separate discovery test creates a unique core, calls `STATUS` without the optional `core` filter, and verifies that the returned status map includes that core. Both tests use the fixture's `finally` cleanup, which unloads only cores registered by the test. These lifecycle assertions run against the pinned Solr 8.11.4, 9.11.0, and 10.1.0 images; they do not certify the untested destructive actions above.


## System diagnostics endpoints

The global System API exposes separate read-only methods for server information and diagnostics:

- `systemInfo()` reads `/admin/info/system` (Solr mode, Lucene, JVM, and related server metadata).
- `systemProperties()` reads `/admin/info/properties` (JVM and process properties).
- `systemThreads()` reads `/admin/info/threads` (a JVM thread dump; content and detail vary by runtime).
- `systemLogging()` reads `/admin/info/logging` (logger names, levels, and logging configuration).

Each method uses the global `/solr/admin/info/*` route and supports the standard request controls. Response models intentionally preserve unknown fields because JVM properties, thread details, logger metadata, and Solr versions vary. These methods are diagnostic reads; this client does not expose logger-level mutation through this System API surface. The current unit suite verifies route selection and representative response shapes; Solr-major runtime compatibility is not claimed until each endpoint is exercised in the corresponding integration job.
