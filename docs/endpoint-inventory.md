# Solr endpoint inventory

This inventory defines the boundary of the typed client API after review against the official Solr 8.11, 9.11, and 10.1 reference guides. It is an inventory of client scope, not a claim that every Solr request handler or plugin is implemented.

## Typed client surface

| Endpoint / API family | Client entry point | Scope and evidence |
| --- | --- | --- |
| Search handler `/select` | `query()` | Typed query options and response models for the documented query features in [API coverage](api-coverage.md); representative integration evidence and per-version status in [API inventory](api-inventory.json). |
| JSON Request API `/query` | `queryJson()` | Typed JSON query and JSON Facet API models; representative integration coverage on Solr 8.11.4, 9.11.0, and 10.1.0. |
| Update handlers `/update`, `/update/json`, `/update/json/docs` | `add()`, `update()`, `atomicUpdate()`, `updateCommands()`, `delete()`, `commit()`, `softCommit()`, `optimize()`, `rollback()` | Typed document and command APIs. The exact tested command shapes and unverified request-option effects are recorded in the compatibility matrix. |
| Schema API `/schema` | `schema()` | Typed schema command models; integration coverage is limited to the add-field and read-back flow. |
| Config API `/config` | `config()` | Typed component/configuration command models; integration coverage includes user-property set/read-back. |
| CoreAdmin V1 `/solr/admin/cores` | `coreAdmin()` | Action-specific parameter models include STATUS, CREATE, RELOAD, UNLOAD, RENAME, SWAP, MERGEINDEXES, SPLIT, REQUESTSTATUS, and REQUESTRECOVERY. Integration coverage includes isolated CREATE, STATUS discovery, RELOAD, and cleanup UNLOAD; async status/recovery actions have serialization coverage only. UPGRADEINDEX is intentionally excluded from the cross-version union because it is not part of the pinned Solr 8.11.4 baseline and is an in-place, non-SolrCloud operation. |
| Collections V1 `/solr/admin/collections` | `collections()` | Action-specific parameter models include BACKUP, RESTORE, LISTBACKUP, DELETEBACKUP, REQUESTSTATUS, and DELETESTATUS. The backup/restore cycle is integration-tested on all three pinned SolrCloud versions. Other unmodelled actions include MIGRATE, FORCELEADER, and selected cluster/node management commands; selected response models remain partial. |
| Security API `/solr/admin/authentication`, `/solr/admin/authorization` | `security()` | Authentication and authorization requests; dedicated security-enabled integration coverage is available on all three pinned versions. |
| Ping `/admin/ping` | `ping()` | Typed client method; response status tested on all three pinned versions. |
| System information `/solr/admin/info/system` | `systemInfo()` | Typed client method; representative response integration-tested on all three pinned versions. |
| Metrics API `/solr/admin/metrics` | `metrics()` | Typed response models; JSON metrics on Solr 8/9 and Prometheus exposition text on Solr 10.1 are documented. |
| Streaming Expressions `/stream` | `stream()` | Expression request support and JSON response parsing; tested against SolrCloud on all three pinned versions. |
| Export handler `/export` | `export()` | Raw response streaming; docValues sort-field flow tested on all three pinned versions. |
| ReplicationHandler V1 `/solr/{core}/replication` | `replication()`, `replicationFile()` | Typed commands include indexversion, details, filelist, fetch/poll/enable/disable/abort, backup, restore, restorestatus, and deletebackup (including Solr 8/9 snappull/abort aliases), plus raw file-content streaming. indexversion/details/filelist/filecontent, leader enablereplication/disablereplication, and full core backup/restore cycles are integration-tested on all three pinned versions. fetch/poll control command serialization is unit-tested; an end-to-end leader/follower fetch cycle is not yet certified. |
| Generic/custom request handlers | `request()`, `requestRaw()` | Escape hatches for custom paths and parameters. These do not imply typed support or integration certification for arbitrary endpoints. |

## Explicitly deferred or excluded endpoint families

| Endpoint / feature | Status | Reason / tracking |
| --- | --- | --- |
| V2 backup endpoints | No dedicated V2 wrappers | The client exposes V1 ReplicationHandler and Collections API backup actions; Solr V2 backup routes and JSON payloads remain outside the typed client surface. |
| Core backup/restore through ReplicationHandler | Not implemented as a dedicated typed module | Backup, details/status, restore, restorestatus, and deletebackup are asynchronous and depend on server-side backup repository/path configuration. Deferred to [Issue #96](https://github.com/vsimko/node-solr-lambda/issues/96). |
| SolrCloud Collections backup/restore | Not implemented as typed Collections actions | `BACKUP`, `RESTORE`, `LISTBACKUP`, and `DELETEBACKUP` are absent from the current `CollectionAdminAction` union. Deferred to [Issue #96](https://github.com/vsimko/node-solr-lambda/issues/96). |
| V2 API paths | No dedicated V2 wrappers | The typed client currently uses V1 paths for CoreAdmin, Collections, Schema, and Config. V2 paths and payloads differ and are not inferred from V1 types. Use the generic request escape hatch only when the caller owns the V2 contract. |
| Other built-in/custom request handlers and Search Components | No dedicated typed wrappers unless listed above | Examples include SQL, Terms, SpellCheck, Suggester, RealTime Get, Clustering, Query Elevation, and application-defined handlers/components. They remain callable through generic request methods where the endpoint accepts the supplied request, but are outside the current autocomplete-first typed surface. |
| Server/plugin-specific administration endpoints | Excluded from the stable typed surface | Plugin-specific, deployment-specific, and custom endpoints cannot be exhaustively modelled in a general-purpose client. Use the explicit raw/custom request escape hatch. |

## Important boundaries

- A generic transport method is not evidence that a particular endpoint is supported.
- A documented Solr endpoint is not automatically part of the typed client contract.
- SolrCloud Collections backup/restore and core-level ReplicationHandler backup/restore are distinct APIs with different topology and storage requirements.
- Solr 10.1 documents both V1 and V2 paths in several areas. The client’s V1 wrappers do not imply V2 compatibility.
- Every compatibility statement must name the tested behavior and pinned server version. See [Solr server compatibility](compatibility.md) and the [machine-readable API inventory](api-inventory.json).

## Official reference guides

- [Solr 8.11 Reference Guide](https://solr.apache.org/guide/8_11/index.html)
- [Solr 9.11 Reference Guide](https://solr.apache.org/guide/solr/9_11/index.html)
- [Solr 10.1 Reference Guide](https://solr.apache.org/guide/solr/10_1/)
- [Request Handlers and Search Components — Solr 10.1](https://solr.apache.org/guide/solr/10_1/configuration-guide/requesthandlers-searchcomponents.html)
- [Collections API — Solr 10.1](https://solr.apache.org/guide/solr/10_1/configuration-guide/collections-api.html)
- [V2 API — Solr 10.1](https://solr.apache.org/guide/solr/10_1/configuration-guide/v2-api.html)
- [User-Managed Index Replication — Solr 10.1](https://solr.apache.org/guide/solr/10_1/deployment-guide/user-managed-index-replication.html)
- [Backup and Restore — Solr 10.1](https://solr.apache.org/guide/solr/10_1/deployment-guide/backup-restore.html)
