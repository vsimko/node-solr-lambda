# Solr server compatibility

This page records the v4 client compatibility policy. It separates documentation evidence from runtime test evidence.

## Status terms

- **Documented** means the endpoint or feature appears in the official reference guide for the listed Solr documentation baseline.
- **Unverified** means this repository has not run an integration test against that Solr server version.
- **Not covered** means the current typed client does not provide a dedicated method for that endpoint.

Documentation evidence does not prove that every patch release behaves in the same way.

## Reference baselines

| Solr line | Documentation baseline | Documentation |
| --- | --- | --- |
| 8.x | 8.11 | [Solr 8.11 Reference Guide](https://solr.apache.org/guide/8_11/index.html) |
| 9.x | 9.10 | [Solr 9.10 Reference Guide](https://solr.apache.org/guide/solr/9_10/index.html) |
| 10.x | 10.1 | [Solr 10.1 Reference Guide](https://solr.apache.org/guide/solr/latest/) |

The 8.11, 9.10, and 10.1 guides describe the API families below. These baselines are references for review. They do not define a minimum supported patch release.

## Endpoint matrix

| Client operation | Solr 8.11 docs | Solr 9.10 docs | Solr 10.1 docs | Runtime test |
| --- | --- | --- | --- | --- |
| `query()` — `GET /solr/{core}/select` | Documented | Documented | Documented | Unverified |
| `queryJson()` — `POST /solr/{collection}/query` | Documented JSON Request API | Documented JSON Request API | Documented JSON Request API | Unverified |
| `add()`, `update()`, `delete()` — `POST /update` | Documented | Documented | Documented | Unverified |
| `commit()`, `softCommit()`, `optimize()`, `rollback()` — update commands | Documented | Documented | Documented | Unverified |
| `ping()` — `/admin/ping` | Documented | Documented | Documented | Unverified |
| `schema()` — `/schema` | Documented | Documented | Documented | Unverified |
| `config()` — `/config` | Documented | Documented | Documented | Unverified |
| `coreAdmin()` — `/solr/admin/cores` | Documented | Documented | Documented | Unverified |
| `collections()` — `/solr/admin/collections` | Documented | Documented | Documented | Unverified |
| `systemInfo()` — `/solr/admin/info/system` | Documented | Documented | Documented | Unverified |
| `metrics()` — `/solr/admin/metrics` | Documented | Documented | Documented | Unverified |
| `security()` — authentication and authorization handlers | Documented | Documented | Documented | Unverified |
| `stream()` — `/stream` | Documented | Documented | Documented | Unverified |
| `export()` — `/export` | Documented | Documented | Documented | Unverified |
| `requestRaw()` — caller-defined path | Depends on the selected endpoint | Depends on the selected endpoint | Depends on the selected endpoint | Unverified |

The matrix records that the official guides describe these endpoint families. It does not certify the current request parameters, response models, or all action variants. Integration evidence is still required.

## Version-specific notes

### Solr 8.x

Use the 8.11 guide as the documentation baseline. It documents the Schema API, Collections API, CoreAdmin API, Config API, Metrics API, security features, Streaming Expressions, and export operations.

Solr 8.11 introduced additional authentication and authorization plugins, including support for multiple authentication schemes. The client currently sends HTTP Basic credentials when configured. It does not configure Solr security plugins.

### Solr 9.x

Use the 9.10 guide as the documentation baseline. It documents both V1 and V2 API surfaces for several administration and configuration areas.

The current client uses the V1 paths for CoreAdmin and Collections operations. Do not assume that V1 and V2 request paths or response shapes are interchangeable.

### Solr 10.x

Use the 10.1 guide as the documentation baseline.

- Solr 10.1 no longer permits disabling the V2 API with `solr.api.v2.enabled`. Review proxy rules and authorization policies for the `/api` path when upgrading.
- Solr 10.1 removes PKI Authentication v1. Nodes must use the newer PKI authentication header.
- The JWT authentication plugin now defaults `blockUnknown` to `true`. Review existing `security.json` files during an upgrade.
- The Solr 10 server requires Java 21 or later. This is a server requirement. It does not change the Node.js runtime requirement for this client.

The client does not yet provide dedicated typed wrappers for the V2 API.

## Current support policy

- The v4 target lines are Solr 8.x, 9.x, and 10.x.
- The minimum supported patch release for each line is **not established**.
- No Solr major line is runtime-certified by this repository yet.
- Treat all operations in the endpoint matrix as **unverified** until the integration matrix passes.
- A successful TypeScript build, unit test, or documentation lookup is not server compatibility evidence.
- If an endpoint differs by version, record the difference here and add a focused test before changing its status.

## Required integration evidence

For each supported Solr line, run the same integration suite against a pinned patch release. Record the exact image tag and test result.

The suite must cover:

1. Query and JSON Request API.
2. Add, update, delete, commit, soft commit, optimize, and rollback.
3. Ping and error response parsing.
4. Schema and Config API reads and writes.
5. CoreAdmin and Collections actions.
6. System information and Metrics API.
7. Authentication and authorization requests with a test security configuration.
8. Streaming Expressions and export response handling.

Do not mark a row as supported until the relevant integration test passes. Record unsupported or unavailable operations as such, with the exact server version and reason.
