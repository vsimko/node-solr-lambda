# Collections API action coverage

This matrix is deliberately action-specific. A generic `client.collections<T>()` call allows callers to describe a response shape, but it is not a named public response model and does not prove server compatibility. Solr-version evidence below refers only to the pinned Solr 8.11.4, 9.11.0, and 10.1.0 integration jobs.

## Action matrix

| Action | Input contract | Response contract | Unit / type evidence | Integration evidence |
| --- | --- | --- | --- | --- |
| `LIST` | `ListCollectionsParams` | Consumer-shaped generic response; no named list response model | Generic action serialization in `test/admin.test.ts` | Collection list includes the isolated collection in `test/integration/solr-collections.test.ts`; Solr 8.11.4 / 9.11.0 / 10.1.0 |
| `CREATE` | `CreateCollectionParams` | Consumer-shaped generic response | Serialization covers router, shard/replica counts, V1 placement flags, alias, legacy Solr 8 placement options, and `property.*` custom parameters; compile fixtures cover compositeId and implicit routers | Disposable collection creation in `solr-collections.test.ts` and backup fixture creation; all three pinned versions. Legacy `rule`/`snitch`/`policy`/`withCollection` options are Solr 8.11-only |
| `DELETE` | `DeleteCollectionParams` | Consumer-shaped generic response | No dedicated serialization fixture | Fixture cleanup deletes only collections created by the test; all three pinned versions |
| `RELOAD` | `ReloadCollectionParams` | Consumer-shaped generic response | Exact action, name serialization, and consumer fixture | Reloads a disposable collection and verifies it remains discoverable; all three pinned versions |
| `MODIFYCOLLECTION` | `ModifyCollectionParams` | Consumer-shaped generic response | Exact serialization and consumer fixtures cover replicationFactor, readOnly, autoAddReplicas, maxShardsPerNode, rule, and snitch | Not integration-tested: mutates collection configuration and has SolrCloud/version-specific behavior; shared CI does not alter collection policy |
| `CREATEALIAS` | `CreateAliasParams` | `SolrCollectionAliasResponse` | Serialization and compile fixture | Alias is created and then used by the test fixture; all three pinned versions |
| `DELETEALIAS` | `DeleteAliasParams` | `SolrCollectionAliasResponse` | Serialization and compile fixture | Alias cleanup removes only the alias created by the fixture; all three pinned versions |
| `LISTALIASES` | `ListAliasesParams` | `SolrCollectionAliasesResponse` | Serialization and compile fixture | Alias read-back verifies the created alias target; all three pinned versions |
| `CLUSTERSTATUS` | `ClusterStatusParams` | `SolrClusterStatusResponse` with extensible collection, shard, and replica models | Default response and nested access compile fixtures; representative runtime envelope unit fixture | Reads live nodes, collection/shard/replica state, and verifies lifecycle effects; all three pinned versions |
| `ADDREPLICA` | `AddReplicaParams` | Consumer-shaped generic response | Serialization and compile fixtures | Adds a named NRT replica and verifies active state; all three pinned versions |
| `DELETEREPLICA` | `DeleteReplicaParams` | Consumer-shaped generic response | Serialization and compile fixtures | Removes only the disposable replica created by the test; all three pinned versions |
| `MOVEREPLICA` | `MoveReplicaParams` | Consumer-shaped generic response | Serialization and compile fixtures | Multi-node test verifies active replica on target node; all three pinned versions |
| `BALANCESHARDUNIQUE` | `BalanceShardUniqueParams` | Consumer-shaped generic response | Serialization and compile fixtures | Preferred-leader balancing action returns success; all three pinned versions |
| `REBALANCELEADERS` | `RebalanceLeadersParams` | Consumer-shaped generic response | Serialization and compile fixtures | Multi-node test verifies preferred replica becomes leader; all three pinned versions |
| `ADDREPLICAPROP` | `AddReplicaPropertyParams` | Consumer-shaped generic response | Serialization and compile fixtures | Adds replica property; all three pinned versions |
| `DELETEREPLICAPROP` | `DeleteReplicaPropertyParams` | Consumer-shaped generic response | Serialization and compile fixtures | Removes replica property; all three pinned versions |
| `CREATESHARD` | `CreateShardParams` | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Creates a shard on a disposable implicit collection and reads it through CLUSTERSTATUS; all three pinned versions |
| `DELETESHARD` | `DeleteShardParams` | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Deletes only the shard created by the test and verifies absence; all three pinned versions |\n| `MIGRATE` | `MigrateCollectionParams` (`collection`, V1 `split.key`, V1 `target.collection`, optional `forward.timeout`, `async`) | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Not integration-tested: data migration is destructive/long-running and requires a controlled compositeId source/target pair |
| `SPLITSHARD` | `SplitShardParams` (`shard` or V1 `split.key`; `ranges`, `numSubShards`, `splitMethod`, `async`) | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Not integration-tested: long-running, hash-router-only operation with disk and routing implications; unsuitable for shared CI collections |
| `ADDROLE` | `CollectionRoleParams` | Consumer-shaped generic response | Exact serialization and consumer type fixture | Not integration-tested: changes cluster-wide node role assignment; requires a dedicated isolated cluster policy fixture |
| `REMOVEROLE` | `CollectionRoleParams` | Consumer-shaped generic response | Exact serialization and consumer type fixture | Not integration-tested: changes cluster-wide node role assignment; requires a dedicated isolated cluster policy fixture |
| `BACKUP` | `CollectionBackupParams` | `SolrCollectionBackupResponse` | Named response type and compile-time API declarations | Async collection backup with shared storage; all three pinned versions |
| `RESTORE` | `CollectionRestoreParams` | `SolrCollectionBackupResponse` | Named response type and compile-time API declarations | Restore to a separate disposable collection and verify document read-back; all three pinned versions |
| `LISTBACKUP` | `CollectionListBackupParams` | `SolrCollectionBackupListResponse` | Named response type and compile-time API declarations | Reads backup metadata and backup ID; all three pinned versions |
| `DELETEBACKUP` | `CollectionDeleteBackupParams` | `SolrCollectionBackupDeleteResponse` | Named response type and compile-time API declarations | Deletes only the backup point created by the test; all three pinned versions |
| `REQUESTSTATUS` | `CollectionAsyncRequestStatusParams` | `SolrCollectionAsyncRequestStatusResponse` | Named response type and compile-time API declarations | Polls backup and restore request IDs to completion; all three pinned versions |
| `DELETESTATUS` | `CollectionAsyncRequestDeleteParams` | `SolrCollectionAsyncRequestDeleteResponse` | Named response type and compile-time API declarations | Deletes completed backup and restore request records; all three pinned versions |

## Evidence files

- Action and parameter union: `src/types.ts` (`CollectionAdminAction`, `CollectionAdminParams<A>`).
- Request serialization: `src/apis/collections.ts`.
- Package-root exports: `src/index.ts`.
- Compile-time consumer examples: `test/admin-api-types.ts`, `test/collections-types.ts`.
- Unit serialization: `test/admin.test.ts`.
- Collection, alias, shard, replica, and cluster-status runtime checks: `test/integration/solr-collections.test.ts`.
- Backup/restore and async status runtime checks: `test/integration/solrcloud-backup-restore.test.ts`.
- Pinned server matrix: `test/integration/fixtures.ts` and the SolrCloud jobs in the CI workflow.

## Gaps and scope boundaries

1. **Cluster status response typing:** `SolrClusterStatusResponse` now models the stable live-node, alias, collection, shard, and replica envelope. Unknown and version-specific fields remain open; it is not a closed schema for every SolrCloud response variation.
2. **Shard split and migration:** `SPLITSHARD` and `MIGRATE` have typed V1 parameter and response contracts plus serialization/type fixtures, but no shared-CI runtime test. Both remain explicitly unverified because they can be long-running and affect routing/data placement. `MIGRATE` additionally requires a compositeId router and a quiescent target collection.
3. **Collection role operations:** `ADDROLE` and `REMOVEROLE` share `CollectionRoleParams` and now have exact serialization and consumer type fixtures. They remain runtime-unverified because they mutate cluster-wide node role assignments.
4. **Collection `RELOAD` and `MODIFYCOLLECTION`:** `RELOAD` now has an isolated integration assertion on the pinned matrix. `MODIFYCOLLECTION` has serialization/type coverage but remains runtime-unverified because it mutates collection policy and behavior varies with SolrCloud configuration.
5. **Generic response typing:** all non-backup actions currently rely on the caller-supplied generic response type or inferred local test shapes. Do not mistake these for exported, version-certified response contracts.

The SolrCloud integration jobs exercise only the rows marked with integration evidence. The presence of a pinned Solr image or a generic transport method is not evidence that every action in the union works on that server version.
