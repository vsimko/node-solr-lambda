# Collections API action coverage

This matrix is deliberately action-specific. A generic `client.collections<T>()` call allows callers to describe a response shape, but it is not a named public response model and does not prove server compatibility. Solr-version evidence below refers only to the pinned Solr 8.11.4, 9.11.0, and 10.1.0 integration jobs.

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
| `DELETESHARD` | `DeleteShardParams` | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Deletes only the shard created by the test and verifies absence; all three pinned versions |\n| `MIGRATE` | `MigrateCollectionParams` (`collection`, V1 `split.key`, V1 `target.collection`, optional `forward.timeout`, `async`) | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Not integration-tested: data migration is destructive/long-running and requires a controlled compositeId source/target pair |
| `SPLITSHARD` | `SplitShardParams` (`shard` or V1 `split.key`; `ranges`, `numSubShards`, `splitMethod`, `async`) | `SolrCollectionShardOperationResponse` | Exact serialization and consumer type fixture | Not integration-tested: long-running, hash-router-only operation with disk and routing implications; unsuitable for shared CI collections |
| `ADDROLE` | `CollectionRoleParams` | `SolrCollectionRoleResponse` | Exact serialization and consumer type fixture | Not integration-tested: changes cluster-wide node role assignment; requires a dedicated isolated cluster policy fixture |
| `REMOVEROLE` | `CollectionRoleParams` | `SolrCollectionRoleResponse` | Exact serialization and consumer type fixture | Not integration-tested: changes cluster-wide node role assignment; requires a dedicated isolated cluster policy fixture |
| `BACKUP` | `CollectionBackupParams` | `SolrCollectionBackupResponse` | Named response type and compile-time API declarations | Async collection backup with shared storage; all three pinned versions |
| `RESTORE` | `CollectionRestoreParams` | `SolrCollectionBackupResponse` | Named response type and compile-time API declarations | Restore to a separate disposable collection and verify document read-back; all three pinned versions |
| `LISTBACKUP` | `CollectionListBackupParams` | `SolrCollectionBackupListResponse` | Named response type and compile-time API declarations | Reads backup metadata and backup ID; all three pinned versions |
| `DELETEBACKUP` | `CollectionDeleteBackupParams` | `SolrCollectionBackupDeleteResponse` | Named response type and compile-time API declarations | Deletes only the backup point created by the test; all three pinned versions |
| `REQUESTSTATUS` | `CollectionAsyncRequestStatusParams` | `SolrCollectionAsyncRequestStatusResponse` | Named response type and compile-time API declarations | Polls backup and restore request IDs to completion; all three pinned versions |
| `DELETESTATUS` | `CollectionAsyncRequestDeleteParams` | `SolrCollectionAsyncRequestDeleteResponse` | Named response type and compile-time API declarations | Deletes completed backup and restore request records; all three pinned versions |

The public `CollectionAdminResponse<A>` conditional type maps each action literal to its default exported response contract. Supplying an explicit generic to `client.collections<T>()` remains supported for custom server/plugin response extensions.

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
5. **Response contract boundaries:** `SolrCollectionAdminResponse`, `SolrCollectionReplicaResponse`, and `SolrCollectionRoleResponse` are intentionally extensible envelopes; they do not claim undocumented action-specific payload fields. `SolrCollectionListResponse` types the stable `collections` list. These contracts describe the client-side JSON shape, not blanket runtime certification for every action or Solr version.

The SolrCloud integration jobs exercise only the rows marked with integration evidence. The presence of a pinned Solr image or a generic transport method is not evidence that every action in the union works on that server version.
