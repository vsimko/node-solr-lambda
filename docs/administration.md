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

## Collection creation parameters

The V1 `collections("CREATE", params)` contract exposes the documented collection layout options: `numShards`, `shards`, `replicationFactor`, `nrtReplicas`, `tlogReplicas`, and `pullReplicas`. Use `router.name` with `numShards` for the default `compositeId` router, or with `shards` for the `implicit` router. `router.field` selects the field used for compositeId routing instead of the unique key.

The V1 placement options include `createNodeSet` (a comma-separated node list or `EMPTY`), `createNodeSet.shuffle`, `maxShardsPerNode`, and `waitForFinalState`. `perReplicaState` selects per-replica state storage, `alias` creates an alias alongside the collection, and `collection.configName` selects an existing configset. Replica counts and placement are validated by the server against live cluster topology; the client does not predict whether the requested placement is feasible.

Core properties use V1 query parameters with the `property.` prefix. Pass them through `customParams`, for example `customParams: { "property.dataDir": "/var/solr/catalog" }`. This preserves the actual V1 wire format instead of sending a JSON `properties` object.

`rule`, `snitch`, `policy`, `withCollection`, and `autoAddReplicas` are legacy Solr 8.11 autoscaling/placement options. The autoscaling framework was removed in Solr 9, so these fields are not portable to the Solr 9.11 or 10.1 baselines and are retained only for callers explicitly targeting Solr 8.11.4. They are compile-time request options, not a claim that the same placement behavior is available on all supported majors.

The client uses the V1 `/solr/admin/collections` endpoint. V2-only names such as `nodeSet`, `shuffleNodes`, `config`, `router`, `shardNames`, and `createReplicas` must not be sent as V1 parameters. See `test/admin-api-types.ts` for compositeId, implicit-router, replica-type, placement, and config examples.

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

## Additional Core Admin actions

The typed V1 Core Admin surface includes `REQUESTSTATUS` and `REQUESTRECOVERY`:

- `REQUESTSTATUS` requires `requestid` and polls a previously submitted asynchronous Core Admin action. The ID is supplied by the caller in the original action's `async` parameter.
- `REQUESTRECOVERY` requires `core` and asks that core to synchronize with its leader. Apache documents this as an expert-level recovery operation; use it only when automatic recovery has failed and after verifying the target replica.

Both actions have action-specific exported parameter interfaces and request-serialization tests. The shared integration matrix does not invoke `REQUESTRECOVERY`, because forcing recovery on a shared CI node could interfere with SolrCloud replica availability. `REQUESTSTATUS` is not yet runtime-tested against a submitted Core Admin async job; only its request contract is covered.

`UPGRADEINDEX` is intentionally not in the shared `CoreAdminAction` union: it is documented in the Solr 9.11 and 10.1 guides but is not part of the pinned Solr 8.11.4 baseline. It is also an expensive, in-place index rewrite, unsupported in SolrCloud, and can discard non-stored/non-docValues fields. Use the generic request escape hatch only when the caller has explicitly established server-version and deployment-mode support, and test on a copy with a backup.


## Metrics API types and response formats

Use `metrics()` with `SolrMetricsParams` to filter by one or more groups, registry, metric-name prefix, or regular expression. Additional server-specific parameters can be passed through `customParams`. Group and registry names remain open strings because Solr plugins and deployments can register additional values.

The default response type is `SolrMetricsResponse`: a JSON registry map (`SolrMetricsJsonResponse`) or Prometheus exposition text. Registry and metric names are runtime-defined, and individual metric values can differ by plugin and Solr version; the types therefore provide a useful registry/value envelope without claiming a closed catalogue of every metric. Supply an explicit generic when the caller has negotiated a specific writer or validated a narrower payload.

The integration suite verifies the JVM metrics endpoint on the pinned Solr 8.11.4, 9.11.0, and 10.1.0 images. It accepts the observed JSON registry response on Solr 8/9 and Prometheus text on Solr 10. This evidence does not imply that every registry, group, plugin metric, or filter combination has been exercised.


## System diagnostics endpoints

The global System API exposes separate read-only methods for server information and diagnostics:

- `systemInfo()` reads `/admin/info/system` (Solr mode, Lucene, JVM, and related server metadata).
- `systemProperties()` reads `/admin/info/properties` (JVM and process properties).
- `systemThreads()` reads `/admin/info/threads` (a JVM thread dump; content and detail vary by runtime).
- `systemLogging()` reads `/admin/info/logging` (logger names, levels, and logging configuration).

Each method uses the global `/solr/admin/info/*` route and supports the standard request controls. Response models intentionally preserve unknown fields because JVM properties, thread details, logger metadata, and Solr versions vary. These methods are diagnostic reads; this client does not expose logger-level mutation through this System API surface. The current unit suite verifies route selection and representative response shapes; Solr-major runtime compatibility is not claimed until each endpoint is exercised in the corresponding integration job.

## Authorization API models

The `security("authorization")` overload defaults to `SolrAuthorizationResponse` and accepts `SolrAuthorizationCommand` for the built-in `RuleBasedAuthorizationPlugin` operations:

- `set-user-role` maps user IDs to one or more roles. Use `null` to remove a user's role mapping; Solr does not provide a separate delete-user-role command.
- `set-permission` creates a built-in or custom permission. Stable fields include `name`, `role`, `collection`, `path`, `method`, `params`, and `before`.
- `update-permission` updates an existing permission by its numeric `index`.
- `delete-permission` removes a permission by its numeric index.

The permission and authorization configuration models remain extensible with unknown fields for custom plugins and future Solr additions. The type model covers the stable built-in RuleBasedAuthorizationPlugin contract; it does not claim that every plugin-specific authorization schema is modeled. Authentication commands remain generic under `security("authentication")` and are tracked separately in Issue #86.

`SolrAuthorizationRole`, `SolrAuthorizationPermission`, `SolrAuthorizationCommand`, and `SolrAuthorizationResponse` are exported from the package root. Compile-time fixtures cover role assignment/removal, permission create/update/delete, extension fields, and invalid command shapes. Serialization tests verify the exact JSON command body. Live Solr security integration tests verify authenticated authorization reads on Solr 8.11.4, 9.11.0, and 10.1.0; mutating authorization commands are not run against shared integration security state.

See the [Apache Solr Rule-Based Authorization Plugin guide](https://solr.apache.org/guide/solr/10_1/deployment-guide/rule-based-authorization-plugin.html) for the server-side permission and role semantics. The client intentionally models the common V1 command contract and leaves plugin-specific extensions open.
## Authentication API models

The `security("authentication")` overload defaults to `SolrAuthenticationResponse` and accepts `SolrAuthenticationCommand` for the Basic Authentication API:

- `set-user` creates a user or changes its password using a user-to-password map.
- `delete-user` removes one or more user IDs.
- `set-property` updates the BasicAuthPlugin properties `blockUnknown`, `realm`, and `forwardCredentials`.

The documented MultiAuthPlugin Basic scheme wrapper is accepted for `set-user` and `set-property`. The response model exposes `credentials` as strings because Solr returns stored credential hashes; these are sensitive security material and must not be logged or treated as plaintext passwords. Passwords supplied in `set-user` commands are request data and are not copied into client-generated error metadata. Server-controlled error response bodies remain caller-owned and should be redacted before logging.

These named types cover the stable BasicAuthPlugin operations and the documented Basic scheme wrapper, not every custom authentication plugin schema. Authentication commands remain separate from the RuleBasedAuthorizationPlugin types. The integration suite verifies authenticated reads and a `set-property`/read-back operation on pinned Solr 8.11.4, 9.11.0, and 10.1.0; user creation/deletion is covered by request serialization and compile-time tests rather than mutating shared CI security users.

See the [Apache Solr Basic Authentication Plugin guide](https://solr.apache.org/guide/solr/10_1/deployment-guide/basic-authentication-plugin.html) for the server-side command semantics. The V1 endpoint implemented here is `/solr/admin/authentication`; the Solr 10 V2 endpoint is not used by this client.

## Collections alias and cluster status response models

`collections("LISTALIASES")` defaults to `SolrCollectionAliasesResponse`, with an alias-to-collection map. `CREATEALIAS` and `DELETEALIAS` default to `SolrCollectionAliasResponse`.

`collections("CLUSTERSTATUS")` defaults to `SolrClusterStatusResponse`. The response model exposes `cluster.live_nodes`, aliases, collections, shards, and replicas, including common replica fields such as `core`, `node_name`, `state`, `type`, `leader`, and `properties`. Filtered responses may omit cluster-wide sections, and Solr versions or plugins may add fields; modeled properties are therefore optional and unknown fields remain accessible.

The alias and cluster-status integration checks exercise alias read-back, collection/shard/replica state, and lifecycle effects on pinned Solr 8.11.4, 9.11.0, and 10.1.0. See the [per-action Collections matrix](collections-api-coverage.md); untested actions are not certified by these response models.

## Shard lifecycle and document migration

`CREATESHARD` and `DELETESHARD` use `CreateShardParams` and `DeleteShardParams` and return `SolrCollectionShardOperationResponse`. Their lifecycle is integration-tested against disposable implicit collections on Solr 8.11.4, 9.11.0, and 10.1.0. The tests verify creation/read-back and deletion/read-back, with fixture cleanup.

`SPLITSHARD` uses the V1 Collections API parameter `split.key` (not the V2 camel-case `splitKey`). Supply either `shard` or `split.key`; `ranges` accepts comma-separated hexadecimal hash ranges, and `numSubShards`, `splitMethod`, `waitForFinalState`, and `async` are available where supported by the server. The operation applies to hash-routed collections created with `numShards`, may run for a long time, and with the default `rewrite` method needs more than twice the index size in free disk space on the parent leader. Use `async` for long operations. It is deliberately not run in shared CI and remains runtime-unverified.

`MIGRATE` uses the V1 wire names `collection`, `split.key`, `target.collection`, and `forward.timeout` (default 60 seconds), plus `async`. It migrates documents for a compositeId routing-key prefix from a source collection to a target collection. The target must not receive writes while migration is running; the action does not deduplicate documents already present in the target. It is long-running and may create temporary collections, so the client has typed request/response contracts and serialization coverage but no shared-CI runtime claim.

The V1 parameter spellings are intentional: this client calls `/solr/admin/collections`, not the Solr 10 V2 `/api/collections` resources. The V2 API maps `split.key` to `splitKey` and `target.collection` to `target`; those V2 names must not be sent through this V1 client.

Reference guides: [Solr 8.1 Collections API](https://archive.apache.org/dist/lucene/solr/ref-guide/apache-solr-ref-guide-8.1.pdf), [Solr 9.2 Collection Management](https://solr.apache.org/guide/solr/9_2/deployment-guide/collection-management.html), [Solr 9.10 Shard Management](https://solr.apache.org/guide/solr/9_10/deployment-guide/shard-management.html), and [Solr 10.0 Collections API](https://solr.apache.org/guide/solr/10_0/configuration-guide/collections-api.html).
