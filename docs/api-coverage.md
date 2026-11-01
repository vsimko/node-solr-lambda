# Solr API coverage

This table tracks the v4 implementation. It does not claim full API coverage until each endpoint has typed models and integration tests.

| API area | Current status | Planned coverage |
| --- | --- | --- |
| Standard Query | Initial | Parameters, JSON Request API, parsers, filters, facets, highlighting, grouping, stats, cursors, streaming expressions. |
| Update / Documents | Initial | Add, overwrite, atomic update, delete by ID/query, commit, soft commit, rollback, optimize, extract. |
| Schema | Initial transport | Fields, dynamic fields, field types, copy fields, schema versions, managed schema. |
| Config | Initial transport | Request handlers, components, caches, listeners, update handlers, properties. |
| Core Admin | Partial | Status, create, reload, unload, rename, swap, merge, split, request status. |
| Collections | Planned | Create, delete, reload, modify, aliases, shards, replicas, cluster status. |
| Security | Planned | Authentication, authorization, permissions, users, roles. |
| System / Metrics | Planned | Ping, system info, metrics, health, node and JVM data. |
| Streaming / Export | Planned | Export handler and streaming expressions. |

Test every supported endpoint against Solr 8.x, 9.x, and 10.x. Mark version-specific behavior in the endpoint documentation. Do not infer support from a successful TypeScript build.

An endpoint is complete when it has typed request and response models, documentation, unit tests, integration tests for each supported Solr major version, and a recorded compatibility result.
