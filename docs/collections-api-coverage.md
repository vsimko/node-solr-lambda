# Collections API action coverage

This matrix is deliberately action-specific. The public client infers a named response contract from each action literal. The lower-level request helpers remain available for callers that need to model server- or plugin-specific response payloads. Solr-version evidence below refers only to the pinned Solr 8.11.4, 9.11.0, and 10.1.0 integration jobs.

## V2 read-only discovery

The parallel V2 namespace exposes `client.v2.collections.list()` (`GET /api/collections`), `client.v2.collections.status(name)` (`GET /api/collections/{collection}`), and `client.v2.cluster.status()` (`GET /api/cluster`). These are separate from the V1 `collections()` action contracts below. They are read-only, use V2-specific extensible response types, and do not perform V1 fallback. The isolated SolrCloud and security-gate tests passed in CI run #43008748363. Collection listing is tested on Solr 8.11.4 / 9.11.0 / 10.1.0; per-collection status and cluster GET status are tested on 9.11.0 / 10.1.0 and explicitly not claimed on 8.11.4. Alias read operations are exposed separately as `client.v2.aliases.list()` (`GET /api/aliases`) and `client.v2.aliases.status(name)` (`GET /api/aliases/{alias}`). Both operations passed isolated SolrCloud integration on pinned 9.11.0 and 10.1.0 in CI #43211482752; Solr 8.11.4 remains explicitly unclaimed. Solr 10.1.0 returns 405 for the documented detail GET at runtime, so `status()` falls back only on 405 to the V2 list response. BasicAuth allow/deny checks cover both alias paths on the pinned security matrix. Standard alias create/delete and alias-property GET/PUT/DELETE operations are implemented in the separate V2 alias namespace (Solr 9.3+); routed-alias creation remains outside the typed surface.

## V2 lifecycle methods

The V2 namespace now has typed `create()`, `delete()`, and `reload()` methods in addition to read-only discovery. The implementation uses the post-Solr-9.3 routes and does not translate to the legacy Solr 8.11 command envelope. Exact serialization and consumer type fixtures are present. Integration and BasicAuth route-gate evidence has not yet been collected; these operations must not be described as runtime-tested until the pinned Solr 9.11.0 and 10.1.0 workflows pass. CREATE/DELETE/RELOAD tests must use disposable collections only.

## V2 collection backup operations

The separate V2 namespace exposes `client.v2.collections.backup(collection, backupName, params)`, `client.v2.backups.list(backupName, options)`, `client.v2.backups.delete(backupName, backupId, options)`, and `client.v2.backups.restore(backupName, params)`. These are not aliases for the V1 `BACKUP`, `LISTBACKUP`, `DELETEBACKUP`, or `RESTORE` actions: they use the redesigned REST routes and V2-specific request/response types introduced in Solr 9.3. Solr 8.11.4 is not claimed. Unit and consumer type tests exist; runtime/security tests remain pending. The operations require a shared SolrCloud backup repository, and restore replaces the target collection's index contents. See [V2 strategy](solr-v2-api-strategy.md).

## Action matrix

| Action | Input contract | Response contract | Unit / type evidence | Integration evidence |
| --- | --- | --- | --- | --- |
| `LIST` | `ListCollectionsParams` | `SolrCollectionListResponse` (`collections` names plus response header) | Generic action serialization in `test/admin.test.ts` | Collection list includes the isolated collection in `test/integration/solr-collections.test.ts`; Solr 8.11.4 / 9.11.0 / 10.1.0 |
| `CREATE` | `CreateCollectionParams` | `SolrCollectionAdminResponse` | Serialization covers router, shard/replica counts, V1 placement flags, alias, legacy Solr 8 placement options, and `property.*` custom parameters; compile fixtures cover compositeId and implicit routers | Disposable collection creation in `solr-collections.test.ts` and backup fixture creation; all three pinned versions. Legacy `rule`/`snitch`/`policy`/`withCollection` options are Solr 8.11-only |
| `DELETE` | `DeleteCollectionParams` | `SolrCollectionAdminResponse` | No dedicated serialization fixture | Fixture cleanup deletes only collections created by the test; all three pinned versions |
| `RELOAD` | `ReloadCollectionParams` | `SolrCollectionAdminResponse` | Exact action, name serialization, and consumer fixture | Reloads a disposable collection and verifies it remains discoverable; all three pinned versions |
| `MODIFYCOLLECTION` | `ModifyCollectionParams` | `SolrCollectionAdminResponse` | Exact serialization and consumer fixtures cover replicationFactor, readOnly, autoAddReplicas, maxShardsPerNode, rule, and snitch | Not integration-tested: mutates collection configuration and has SolrCloud/version-specific behavior; shared CI does not alter collection policy |
| `CREATEALIAS` | `CreateAliasParams` | `SolrCollectionAliasResponse` | Serialization and compile fixture | Alias is created and then used by the test fixture; all three pinned versions |
| `DELETEALIAS` | `DeleteAliasParams` | `SolrCollectionAliasResponse` | Serialization and compile fixture | Alias cleanup removes only the alias created by the fixture; all three pinned versions |
| `LISTALIASES` | `ListAliasesParams` | `SolrCollectionAliasesResponse` | Serialization and compile fixture | Alias read-back verifies the created alias target; all three pinned versions |
| `CLUSTERSTATUS` | `ClusterStatusParams` | `SolrClusterStatusResponse` with extensible collection, shard, and replica models | Default response and nested access compile fixtures; representative runtime envelope unit fixture | Reads live nodes, collection/shard/replica state, and verifies lifecycle effects; all three pinned versions |
| `ADDREPLICA` | `AddReplicaParams` | `SolrCollectionReplicaResponse` | Serialization and compile fixtures | Adds a named NRT replica and verifies active state; all three pinned versions |
| `DELETEREPLICA` | `DeleteReplicaParams` | `SolrCollectionReplicaResponse` | Serialization and compile fixtures | Removes only the disposable replica created by the test; all three pinned versions |
| `MOVEREPLICA` | `MoveReplicaParams` | `SolrCollectionReplicaResponse` | Serialization and compile fixtures | Multi-node test verifies active replica on target node; all three pinned versions |
| `BALANCESHARDUNIQUE` | `BalanceShardUniqueParams` | `SolrCollectionReplicaResponse` | Serialization and compile fixtures | Preferred-leader balancing action returns success; all three pinned versions |
| `REBALANCELEADERS` | `RebalanceLeadersParams` | `SolrCollectionReplicaResponse` | Serialization and compile fixtures | Multi-node test verifies preferred replica becomes leader; all three pinned versions |
| `ADDREPLICAPROP` | `AddReplicaPropertyParams` | `SolrCollectionReplicaResponse` | Serialization and compile fixtures | Adds replica property; all three pinned versions |
| `DELETEREPLICAPROP` | `DeleteReplicaPropertyParams` | `SolrCollectionReplicaResponse` | Serialization and compile fixtures | Removes replica property; all three pinned versions |
| `CREATESHARD` | `CreateShardParams` | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Creates a shard on a disposable implicit collection and reads it through CLUSTERSTATUS; all three pinned versions |
| `DELETESHARD` | `DeleteShardParams` | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Deletes only the shard created by the test and verifies absence; all three pinned versions |
| `MIGRATE` | `MigrateCollectionParams` (`collection`, V1 `split.key`, V1 `target.collection`, optional `forward.timeout`, `async`) | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Opt-in only: disposable compositeId source/empty target; async completion plus target document read-back. Not yet executed against pinned versions; remains runtime-unverified |
| `SPLITSHARD` | `SplitShardParams` (`shard` or V1 `split.key`; `ranges`, `numSubShards`, `splitMethod`, `async`) | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Opt-in only: disposable one-shard compositeId collection; async completion, active child-shard state, and document read-back. Not yet executed against pinned versions; remains runtime-unverified |
| `FORCELEADER` | `ForceLeaderParams` (`collection`, `shard`) | `SolrCollectionShardOperationResponse` | Exact V1 query serialization and consumer type inference | Manual-only fault-injection harness implemented in `test/integration/solrcloud-forceleader-optin.test.ts` and `enable_forceleader_fault_injection`: separate ZooKeeper plus two labelled, loopback-only disposable Solr nodes; stops the follower during acknowledged writes, removes the old leader, promotes the stale replica, and verifies the documented data-loss boundary. Not yet manually executed; runtime remains unverified on all pinned versions. |
| `ADDROLE` | `CollectionRoleParams` | `SolrCollectionRoleResponse` | Exact serialization and consumer type fixture | Not integration-tested: changes cluster-wide node role assignment; requires a dedicated isolated cluster policy fixture |
| `REMOVEROLE` | `CollectionRoleParams` | `SolrCollectionRoleResponse` | Exact serialization and consumer type fixture | Not integration-tested: changes cluster-wide node role assignment; requires a dedicated isolated cluster policy fixture |
| `BACKUP` | `CollectionBackupParams` | `SolrCollectionBackupResponse` | Named response type and compile-time API declarations | Async collection backup with shared storage; all three pinned versions |
| `RESTORE` | `CollectionRestoreParams` | `SolrCollectionBackupResponse` | Named response type and compile-time API declarations | Restore to a separate disposable collection and verify document read-back; all three pinned versions |
| `LISTBACKUP` | `CollectionListBackupParams` | `SolrCollectionBackupListResponse` | Named response type and compile-time API declarations | Reads backup metadata and backup ID; all three pinned versions |
| `DELETEBACKUP` | `CollectionDeleteBackupParams` | `SolrCollectionBackupDeleteResponse` | Named response type and compile-time API declarations | Deletes only the backup point created by the test; all three pinned versions |
| `REQUESTSTATUS` | `CollectionAsyncRequestStatusParams` | `SolrCollectionAsyncRequestStatusResponse` | Named response type and compile-time API declarations | Polls backup and restore request IDs to completion; all three pinned versions |
| `DELETESTATUS` | `CollectionAsyncRequestDeleteParams` | `SolrCollectionAsyncRequestDeleteResponse` | Named response type and compile-time API declarations | Deletes completed backup and restore request records; all three pinned versions |

The public `CollectionAdminResponse<A>` conditional type maps each action literal to its default exported response contract. FORCELEADER is typed separately from ordinary shard lifecycle actions because its safety implications are materially different. Supplying an explicit generic to `client.collections<T>()` remains supported for custom server/plugin response extensions.

## Evidence files

- Action and parameter union: `src/types.ts` (`CollectionAdminAction`, `CollectionAdminParams<A>`).
- Request serialization: `src/apis/collections.ts`.
- Package-root exports: `src/index.ts`.
- Compile-time consumer examples: `test/admin-api-types.ts`, `test/collections-types.ts`.
- Unit serialization: `test/admin.test.ts`.
- Collection, alias, shard, replica, and cluster-status runtime checks: `test/integration/solr-collections.test.ts`.
- Destructive, opt-in SPLITSHARD and MIGRATE verification: `test/integration/solrcloud-split-migrate-optin.test.ts` (manual workflow dispatch only).
- Expert-only FORCELEADER stale-replica fault injection: `test/integration/solrcloud-forceleader-optin.test.ts` (separate manual workflow job with independent ZooKeeper and labelled disposable Solr containers; not yet executed).
- Backup/restore and async status runtime checks: `test/integration/solrcloud-backup-restore.test.ts`.
- Pinned server matrix: `test/integration/fixtures.ts` and the SolrCloud jobs in the CI workflow.

## Gaps and scope boundaries

1. **Cluster status response typing:** `SolrClusterStatusResponse` now models the stable live-node, alias, collection, shard, and replica envelope. Unknown and version-specific fields remain open; it is not a closed schema for every SolrCloud response variation.
2. **Shard split and migration:** `SPLITSHARD` and `MIGRATE` have typed V1 parameter and response contracts plus serialization/type fixtures, but no normal-CI runtime test. A manually dispatched, loopback-only two-node workflow now contains opt-in tests that poll asynchronous completion and verify cluster/data state; until that workflow passes for a pinned version, both actions remain explicitly runtime-unverified because they can be long-running and affect routing/data placement. `MIGRATE` additionally requires a compositeId router and a quiescent target collection.
3. **Collection role operations:** `ADDROLE` and `REMOVEROLE` share `CollectionRoleParams` and now have exact serialization and consumer type fixtures. They remain runtime-unverified because they mutate cluster-wide node role assignments.
4. **Collection `RELOAD` and `MODIFYCOLLECTION`:** `RELOAD` now has an isolated integration assertion on the pinned matrix. `MODIFYCOLLECTION` has serialization/type coverage but remains runtime-unverified because it mutates collection policy and behavior varies with SolrCloud configuration.
5. **Response contract boundaries:** `SolrCollectionAdminResponse`, `SolrCollectionReplicaResponse`, and `SolrCollectionRoleResponse` are intentionally extensible envelopes; they do not claim undocumented action-specific payload fields. `SolrCollectionListResponse` types the stable `collections` list. These contracts describe the client-side JSON shape, not blanket runtime certification for every action or Solr version.

FORCELEADER is serialization/type-covered and now has a dedicated manual-only stale-replica fault-injection harness. It deliberately remains runtime-unverified until the new `enable_forceleader_fault_injection` workflow input is manually dispatched and passes for each pinned Solr version. The SolrCloud integration jobs exercise only the rows marked with integration evidence. The presence of a pinned Solr image or a generic transport method is not evidence that every action in the union works on that server version.
