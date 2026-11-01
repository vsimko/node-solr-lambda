# Solr API coverage

See [Client architecture](architecture.md) for the module boundaries and shared request conventions.

This table tracks the v4 implementation. A generic request method does not mean that every endpoint has a typed wrapper or tested version support.

| API area | Current v4 surface | Remaining work |
| --- | --- | --- |
| Client transport | Typed base URL, core/collection, Basic/Bearer auth, headers, timeout, custom fetch, request defaults, and opt-in retries | Advanced auth mechanisms and retry telemetry. |
| Errors | `SolrHttpError`, `SolrNetworkError`, and `SolrValidationError` | Timeout and caller-abort error classification is tracked in Issue #34. |
| Standard Query | `query()`, `queryJson()` | Typed parsers, facets, highlighting, grouping, stats, cursors, JSON Facet models, version tests. |
| Update / Documents | `add()`, `delete()`, `commit()`, `rollback()` | Atomic update models, soft commit options, optimize, extract, update parameter coverage. |
| Schema | `schema(command)` | Typed field, dynamic field, field type, copy field and schema response models. |
| Config | `config(command)` | Typed handlers, components, caches, listeners, update handlers and property models. |
| Core Admin | `coreAdmin(action, params)`, `ping()` | Full action-specific request and response models; async status and action coverage. |
| Collections | `collections(action, params)` | Action-specific models for aliases, shards, replicas, snapshots, backups and cluster state. |
| Security | `security(area, command)` | Authentication and authorization schemas, permissions, users and roles. |
| System / Metrics | `systemInfo()`, `metrics()` | Typed system, metric, health and node response models. |
| Streaming / Export | `stream()`, `export()` | Streaming response handling and raw export stream support. |

## Compatibility policy

See the [Solr server compatibility matrix](compatibility.md) for the documentation baselines, version-specific notes, and runtime verification status.

Test every supported endpoint against Solr 8.x, 9.x, and 10.x. Mark version-specific behavior in the endpoint documentation. Do not infer support from a successful TypeScript build.

An endpoint is complete when it has typed request and response models, documentation, unit tests, integration tests for each supported Solr major version, and a recorded compatibility result.
