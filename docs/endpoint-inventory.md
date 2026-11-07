# Solr endpoint inventory

This inventory defines the boundary of the typed client API after review against the official Solr 8.11, 9.11, and 10.1 reference guides. It describes the client scope; it does not claim that every Solr request handler or plugin is implemented.

## Typed client surface

| Endpoint / API family | Client entry point | Scope and evidence |
| --- | --- | --- |
| Search handler `/select` | `query()` | Typed query options and response models, including optional SpellCheck and Suggester components; the selected SearchHandler must have the corresponding component and dictionaries configured server-side. The Suggester component can be attached to `/select` or a custom handler; the client does not assume a `/suggest` path. Representative integration evidence and per-version status are in the [API coverage](api-coverage.md) and [machine-readable API inventory](api-inventory.json). |
| RealTime Get handler `/get` | `get()` | Typed mutually exclusive single-ID and multi-ID requests, generic response shapes, fields, filter queries, and custom parameters. Runtime status is tracked separately for each pinned Solr version. |
| JSON Request API `/query` | `queryJson()` | Typed JSON query and JSON Facet API models; representative integration coverage on Solr 8.11.4, 9.11.0, and 10.1.0. |
| Update handlers `/update`, `/update/json`, `/update/json/docs` | `add()`, `addStream()`, `update()`, `atomicUpdate()`, `updateCommands()`, `delete()`, `commit()`, `softCommit()`, `optimize()`, `rollback()` | Typed document and command APIs. `addStream()` sends a bounded-memory JSON-array request body from an `AsyncIterable`; retries are disabled for this non-replayable POST and partial-ingestion semantics are documented. Exact tested command shapes and unverified request-option effects are recorded in the compatibility matrix. |
| Schema API `/schema` | `schema()` | Typed schema command models; integration coverage includes field, field-type, dynamic-field, copy-field, and schema read operations. |
| Config API `/config` | `config()`, `getConfig()`, `getConfigOverlay()` | Typed POST command models and typed GET effective-config/overlay responses. Integration coverage includes user-property mutation/read-back; broader component mutation coverage is tracked separately in [Issue #75](https://github.com/vsimko/node-solr-lambda/issues/75). |
| CoreAdmin V1 `/solr/admin/cores` | `coreAdmin()` | Action-specific parameter models include STATUS, CREATE, RELOAD, UNLOAD, RENAME, SWAP, MERGEINDEXES, SPLIT, REQUESTSTATUS, and REQUESTRECOVERY. Integration coverage includes isolated CREATE, STATUS discovery, RELOAD, and cleanup UNLOAD; async status/recovery actions have serialization coverage only. UPGRADEINDEX is intentionally excluded from the cross-version union because it is not part of the pinned Solr 8.11.4 baseline and is an in-place, non-SolrCloud operation. |
| Collections V1 `/solr/admin/collections` | `collections()` | Action-specific request models and default named response contracts cover LIST, lifecycle/policy, replica, role, alias, cluster, shard, backup/restore, and async action literals. Response envelopes remain extensible; caller-supplied generics are still supported but are not the only response contract. Runtime evidence is action-specific and is listed in the [Collections action coverage matrix](collections-api-coverage.md). SPLITSHARD and MIGRATE have opt-in, loopback-only runtime checks in the manually dispatched workflow; they remain unverified until that workflow passes. Other unmodelled actions include FORCELEADER and selected cluster/node management commands. |
| Security API `/solr/admin/authentication`, `/solr/admin/authorization` | `security()` | Authentication and authorization requests; dedicated security-enabled integration coverage is available on all three pinned versions. |
| Ping `/admin/ping` | `ping()` | Typed client method; response status tested on all three pinned versions. |
| System information `/solr/admin/info/system` | `systemInfo()` | Typed client method; representative response integration-tested on all three pinned versions. |
| Metrics API `/solr/admin/metrics` | `metrics()` | Typed response models; JSON metrics on Solr 8/9 and Prometheus exposition text on Solr 10.1 are documented. |
| Streaming Expressions `/stream` | `stream()` | Expression request support and JSON response parsing; tested against SolrCloud on all three pinned versions. |
| Export handler `/export` | `export()`, `exportStream()` | Typed export parameters and raw backpressure-aware response/byte-stream access; docValues sort-field flow tested on all three pinned versions. |
| ReplicationHandler V1 `/solr/{core}/replication` | `replication()`, `replicationFile()` | Typed commands include indexversion, details, filelist, fetchindex/abortfetch, enablepoll/disablepoll, leader/follower control, backup, restore, restorestatus, and deletebackup, plus raw file-content streaming. Core backup/restore and one-shot leader/follower fetch/read-back are integration-tested on Solr 8.11.4, 9.11.0, and 10.1.0. In-progress abort/read-back is tested on Solr 9.11.0 and 10.1.0; Solr 8.11.4 remains explicitly unverified because no observable active-fetch state was exposed. `enablepoll`/`disablepoll` have serialization coverage only. |
| Generic/custom request handlers | `request()`, `requestRaw()` | Escape hatches for custom paths and parameters. These do not imply typed support or integration certification for arbitrary endpoints. |

## Explicitly deferred or excluded endpoint families

| Endpoint / feature | Status | Reason / tracking |
| --- | --- | --- |
| V2 backup endpoints | No dedicated V2 wrappers | Core-level and collection-level V2 backup/restore routes have distinct paths and payloads, and collection backup routes changed in Solr 9.3. See the [V2 compatibility strategy](solr-v2-api-strategy.md); do not reuse V1 backup models. |
| V2 API paths | No dedicated V2 wrappers | The typed client currently uses V1 paths for CoreAdmin, Collections, Schema, and Config. V2 routes and payloads are version-sensitive, including the Solr 9.3 route redesign. See the [V2 compatibility and typed-client strategy](solr-v2-api-strategy.md). Use the generic request escape hatch only when the caller owns the V2 contract. |
| Terms handler `/terms` | No dedicated typed wrapper | Deferred pending a concrete consumer requirement; generic `request()` remains available. Terms is distinct from Suggester and SpellCheck. |
| Suggester handler/component | Implemented as an optional Search Component in `query()` | Typed dictionary, lookup text, count, context-filter, build/reload, and suggestion response contracts are available. The SearchHandler and dictionary must be configured server-side. Unit and consumer type coverage exists; the disposable configured-handler integration test verifies indexed terms and weights and passed on pinned Solr 8.11.4, 9.11.0, and 10.1.0 (CI run #42392182590). |
| RealTime Get `/get` | Implemented — `get()` | Typed mutually exclusive single-ID and multi-ID request/response contracts, field selection, repeated filter queries, custom parameters, and shared request controls are implemented. Unit serialization/validation and consumer type fixtures exist; the integration test verifies uncommitted single-ID and multi-ID read-after-write behavior on pinned Solr 8.11.4, 9.11.0, and 10.1.0 (CI run #42392182590). |
| SpellCheck component | Implemented as an optional Search Component in `query()` | Typed request options and response contracts are available. The component and dictionaries must be configured server-side; The configured default-handler integration test verifies indexed suggestions, frequencies, and a corrected collation on pinned Solr 8.11.4, 9.11.0, and 10.1.0 (CI run #42392182590). |
| SQL, Clustering, Query Elevation, and application-defined handlers/components | No dedicated typed wrappers | They remain callable through generic request methods where supported by Solr, but are outside the current autocomplete-first typed surface. |
| Server/plugin-specific administration endpoints | Excluded from the stable typed surface | Plugin-specific, deployment-specific, and custom endpoints cannot be exhaustively modelled in a general-purpose client. Use the explicit raw/custom request escape hatch. |

## Important boundaries

- A generic transport method is not evidence that a particular endpoint is supported.
- A documented Solr endpoint is not automatically part of the typed client contract.
- SolrCloud Collections backup/restore and core-level ReplicationHandler backup/restore are distinct APIs with different topology and storage requirements; both V1 surfaces are implemented and have integration coverage on the pinned Solr 8.11.4, 9.11.0, and 10.1.0 versions.
- Solr 10.1 documents both V1 and V2 paths in several areas and no longer allows V2 to be disabled using the former enablement property. Secure V2 paths explicitly; the client’s V1 wrappers do not imply V2 compatibility. See the [V2 compatibility strategy](solr-v2-api-strategy.md).
- Every compatibility statement must name the tested behavior and pinned server version. See [Solr server compatibility](compatibility.md) and the [machine-readable API inventory](api-inventory.json).

## Official reference guides

- [Solr 8.11 Reference Guide](https://solr.apache.org/guide/8_11/index.html)
- [Solr 9.11 Reference Guide](https://solr.apache.org/guide/solr/9_11/index.html)
- [Solr 10.1 Reference Guide](https://solr.apache.org/guide/solr/10_1/)
- [Request Handlers and Search Components — Solr 10.1](https://solr.apache.org/guide/solr/10_1/configuration-guide/requesthandlers-searchcomponents.html)
- [Collections API — Solr 10.1](https://solr.apache.org/guide/solr/10_1/configuration-guide/collections-api.html)
- [V2 API — Solr 8.11](https://solr.apache.org/guide/8_11/v2-api.html)
- [V2 API — Solr 10.1](https://solr.apache.org/guide/solr/10_1/configuration-guide/v2-api.html)
- [Solr 9.11 release notes — V2 route changes](https://solr.apache.org/docs/9_11_0/changes/Changes.html)
- [User-Managed Index Replication — Solr 10.1](https://solr.apache.org/guide/solr/10_1/deployment-guide/user-managed-index-replication.html)
- [Backup and Restore — Solr 10.1](https://solr.apache.org/guide/solr/10_1/deployment-guide/backup-restore.html)


## Cross-client regression test decisions

The generic HTTP transport and open Solr document model are verified by tests inspired by Solarium and pysolr, without adding new endpoint wrappers:

- Nested parent/child/grandchild documents are indexed as ordinary JSON document data and retrieved with Solr's `[child]` document transformer. The client does not introduce a separate nested-document abstraction. Important: Solr's `/update/json/docs` convenience path flattens complex JSON by default; use `add([document])` to select `/update` and preserve nested pseudo-fields.
- Unicode strings and multi-valued fields are checked by exact integration read-back, rather than only checking that JSON.stringify accepts UTF-8.
- Long query parameters are preserved intact on the current GET `/select` contract. The client does not automatically switch oversized GET requests to POST; callers needing POST can use `queryJson()` or `request()` where appropriate. No automatic URL-length policy is implied.
- Generic `request()` preserves repeated query parameters and unknown plugin response fields.
- These standalone fidelity tests are distinct from security-enabled standalone and SolrCloud suites. Multi-node Cloud tests remain opt-in and are used only where multiple live nodes are essential.

See [ADR 0003](adr/0003-cross-client-test-strategy.md), [cross-client comparison](solr-client-comparison.md), and [issue #297](https://github.com/vsimko/node-solr-lambda/issues/297). The new integration assertions are pending execution in the pinned Solr CI matrix; do not treat their presence in source as completed compatibility evidence.


## Cross-client test coverage notes

The current transport contract is explicit: query operations use GET and do not automatically switch to POST based on URL length. Long-query preservation is tested as a transport invariant, not a claim that every proxy/server accepts arbitrarily large URLs. Generic custom-handler requests preserve repeated query parameters and extensible JSON response fields. Nested-document and Unicode round-trip cases are exercised through the ordinary JSON Update and Query APIs; they do not add a dedicated nested-document API.
