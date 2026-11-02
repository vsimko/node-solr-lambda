# Solr API coverage

See [Client architecture](architecture.md) for module boundaries, type-model guidelines, and shared request conventions. The [roadmap](roadmap.md) tracks priorities and links to implementation issues.

See the [machine-readable API inventory](api-inventory.json) for each operation, request path, type coverage, unit-test status, and per-version integration status.

A generic request method does not mean that every endpoint has a typed wrapper, useful IDE autocomplete, or tested version support. For supported features, the primary public API should expose named TypeScript properties and nested models that IDEs can complete and validate. Custom parameters remain available through an explicit escape hatch.

| API area | Current public surface | Remaining work |
| --- | --- | --- |
| Package exports | ESM and CommonJS runtime entries; conditional TypeScript declarations for both module systems | Older TypeScript resolution modes use the top-level declaration entry. |
| Client transport | Typed base URL, core/collection, Basic/Bearer auth, headers, client and per-request timeouts, AbortSignal controls, custom fetch, request defaults, and opt-in retries | Advanced auth mechanisms and retry telemetry. |
| Errors | `SolrHttpError`, `SolrNetworkError`, `SolrTimeoutError`, `SolrAbortError`, and `SolrValidationError` | Solr-version-specific error payloads still need integration evidence. |
| Validation | Optional input/output schema interface; optional Zod peer; async parsing; rejection and thrown-parser errors; disabled by default | Additional schema adapters and operation-specific schema examples. |
| Standard Query | `query()`, `queryJson()`; typed query, filter, fields, sort, parser, cursorMark, and response-writer options; `SolrJsonQueryRequest` and recursive terms/query/range JSON Facet API models with nested metrics and domain changes; generic `SolrResponse<TDocument>` and `SolrQueryResponse<TDocument, TJsonFacet>` response models with typed document metadata, classic facets, caller-shaped JSON facets, highlighting, grouping, stats, and debug sections; typed classic field/query/numeric-and-date-range facet options with per-field overrides and range methods; typed highlighting options for fields, snippets, fragments, alternate fields, phrase/multi-term highlighting, encoders, tags, and per-field overrides; typed Result Grouping field/function/query options and grouped responses; typed Collapsing Query Parser and Expand component options/responses; typed Stats Component field/local options, facets, percentiles, cardinality, and nested response statistics; typed MoreLikeThis Search Component field selection, term/document thresholds, limits, and per-document similar-result responses; tagged filter models and query helpers; typed geofilt/bbox filters and geodist helpers; typed debug component selection, structured/plain explain response models, and explainOther query support | JSON Request API round-trip passes CI #145 on pinned Solr 8.11.4/9.11.0/10.1.0. Facets, highlighting, grouping, stats, JSON Facet models, and response sections. CursorMark pagination now has multi-page integration coverage on the pinned Solr 8.11.4, 9.11.0, and 10.1.0 images; broader endpoint coverage remains unverified. See Issues #44–#59 and umbrella Issue #121. |
| Update / Documents | `add()`, `update()`, `delete()`, `commit()`, `softCommit()`, `optimize()`, `rollback()` | Add, full-document update, delete-by-ID, and hard commit have passing integration tests on pinned Solr 8.11.4/9.11.0/10.1.0. Soft commit and rollback pass CI #145 on pinned Solr 8.11.4/9.11.0/10.1.0. Optimize test passes CI #145 on pinned Solr 8.11.4/9.11.0/10.1.0. Atomic update models, JSON update commands, and typed response models remain unverified. See Issues #42, #60–#67. |
| Schema | `schema(command)` | Add-field and GET field read-back pass CI #145 on pinned Solr 8.11.4/9.11.0/10.1.0. Broader schema commands and typed response models remain. See Issues #68–#72. |
| Config | `config(command)` | Set/unset user property plus GET /config/overlay read-back pass CI #166 on pinned Solr 8.11.4/9.11.0/10.1.0. Typed handlers, components, caches, listeners, update handlers, and property models remain. See Issues #73–#76. |
| Core Admin | `coreAdmin(action, params)`, `ping()` | Ping plus CREATE, STATUS, RELOAD, and cleanup UNLOAD pass CI #123 on pinned Solr 8.11.4/9.11.0/10.1.0. Other action-specific request/response models remain. See Issues #77–#79. |
| Collections | `collections(action, params)` | SolrCloud CREATE/LIST/DELETE, alias lifecycle, implicit-router shard lifecycle, named ADDREPLICA/DELETEREPLICA lifecycle, and replica property/balance actions pass on Solr 8.11.4/9.11.0/10.1.0. Multi-node MOVEREPLICA and REBALANCELEADERS runtime tests verify replica placement and preferred-leader reassignment on all three versions (PR #142, CI #224). Snapshot, backup, and cluster-state response models remain. See Issues #80–#85. |
| Security | `security(area, command)` | Dedicated security-enabled standalone matrix passes on Solr 8.11.4/9.11.0/10.1.0 (CI #162): anonymous rejection, authenticated authentication/authorization reads, and authentication property mutation/read-back. See Issues #86–#88. |
| System / Metrics | `systemInfo()`, `metrics()` | System info and JVM Metrics API tests pass CI #145 on pinned Solr 8.11.4/9.11.0/10.1.0. Metrics response format differs: JSON on 8/9 and Prometheus text on 10. Typed system, metric, health, and node response models. See Issues #89–#91. |
| Streaming / Export | `stream()`, `export()` | Streaming Expressions search against a SolrCloud collection and Export response handling pass CI #145 on Solr 8.11.4/9.11.0/10.1.0. Typed expression builders, streaming response handling, and raw export stream support. See Issues #92–#94. |
| Advanced / Raw | Raw request support and generic endpoint access | A documented typed raw-request escape hatch with safe request options. See Issue #98. |

## Request controls

Typed client methods support per-request cancellation and timeout controls. Caller cancellation throws `SolrAbortError`; a configured timeout throws `SolrTimeoutError`. The timeout remains active while JSON response bodies are read and while raw export streams are consumed. See [error handling](errors.md).

## Definition of done

An API feature is complete when it has:

1. Named, exported request and response types that provide useful IDE autocomplete.
2. Compile-time consumer examples, including typo/invalid-option checks where applicable.
3. Unit tests for serialization, request path, and response typing.
4. Documentation with realistic examples and version-specific notes.
5. Integration tests for each target Solr major version, or an explicit unverified/unsupported status.
6. A recorded compatibility result in [compatibility.md](compatibility.md).

Test every target endpoint against Solr 8.x, 9.x, and 10.x. Do not infer server support from a successful TypeScript build.
