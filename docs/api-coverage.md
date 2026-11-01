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
| Standard Query | `query()`, `queryJson()`; named types for query, filter, fields, sort, limit, offset, parser options, and response writer; exported sort, field-list, alias, function, and local-params helpers; explicit custom `params` escape hatch | Typed parser-specific nested options, facets, highlighting, grouping, stats, cursors, JSON Facet models, and response sections. See Issues #44–#59 and umbrella Issue #121. |
| Update / Documents | `add()`, `update()`, `delete()`, `commit()`, `softCommit()`, `optimize()`, `rollback()` | Atomic update models, JSON update commands, typed response models, and precise operation validation. See Issues #60–#67. |
| Schema | `schema(command)` | Typed field, dynamic field, field type, copy field, and schema response models. See Issues #68–#72. |
| Config | `config(command)` | Typed handlers, components, caches, listeners, update handlers, and property models. See Issues #73–#76. |
| Core Admin | `coreAdmin(action, params)`, `ping()` | Full action-specific request and response models; async status and action coverage. See Issues #77–#79. |
| Collections | `collections(action, params)` | Action-specific models for aliases, shards, replicas, snapshots, backups, and cluster state. See Issues #80–#85. |
| Security | `security(area, command)` | Authentication and authorization schemas, permissions, users, and roles. See Issues #86–#88. |
| System / Metrics | `systemInfo()`, `metrics()` | Typed system, metric, health, and node response models. See Issues #89–#91. |
| Streaming / Export | `stream()`, `export()` | Typed Streaming Expressions, streaming response handling, and raw export stream support. See Issues #92–#94. |
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
