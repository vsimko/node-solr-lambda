# Solr V2 API strategy

This document records the V1/V2 compatibility audit requested by [Issue #327](https://github.com/vsimko/node-solr-lambda/issues/327). It is a design and documentation decision, not evidence that the client already implements or runtime-tests V2 operations.

## Decision

Keep the existing typed methods on Solr's V1 routes. Introduce V2 support as an explicit, parallel API surface (proposed namespace: `client.v2`) with operation-specific request and response contracts.

- Never silently redirect an existing V1 method to a V2 path.
- Never infer a V2 payload or response type from a V1 contract.
- Never perform automatic V1/V2 fallback. A fallback can change semantics, permissions, request bodies, or retry safety.
- Document the minimum Solr version and evidence for every V2 operation individually.
- Use Solr's `/_introspect` endpoint as a discovery and test aid, not as an unreviewed runtime source of public TypeScript types.
- Preserve `request()` and `requestRaw()` for caller-owned/custom V2 operations. Raw access is not typed V2 support.

This is deliberately a parallel namespace rather than a global `useV2` transport switch: V1 and V2 coexist on the server, but their routes, verbs, payload envelopes, and response shapes are not consistently interchangeable.

## What the official documentation establishes

| Solr baseline | V2 status and evidence | Consequence for this client |
| --- | --- | --- |
| 8.11 | The official 8.11 guide documents V2 route families, coexistence with V1, `/_introspect`, and the ability to disable V2 with `-Ddisable.v2.api=true`. The guide's route and command examples are an older snapshot. | V2 exists in the 8.11 line, but a route must be checked against the exact 8.11.4 server before it is claimed as supported. Do not assume later REST-style routes exist unchanged. |
| 9.11 | The 9.x V2 API remains experimental. Solr 9.3 introduced backwards-incompatible redesigns to shard, replica, backup, force-leader, collection reload/rename, and logging APIs. The 9.11 release notes list the current paths and request-body changes. | Treat 9.3 as a material route/payload boundary. Use the 9.11 reference and release notes for the pinned 9.11.0 baseline; do not copy pre-9.3 examples into a common contract. |
| 10.1 | The 10.1 guide documents V2 route families and introspection. Solr 10.1 no longer allows users to disable V2 using the former enablement system property; Solr tooling uses V2 internally. Security permissions must cover V2 paths. | V2 is operationally important in 10.1. Security documentation and authorization tests are required for any new V2 surface. |

V2 uses regularized paths and generally sends commands in JSON POST bodies, while also supporting GET and DELETE where appropriate. Its self-description is available by appending `/_introspect` to a valid V2 path. Introspection output itself is explicitly described as experimental and must not be treated as a stable schema contract.

## V1-to-V2 route map

The following is a route-family map, not a promise that every listed operation exists with the same path or payload on every Solr version.

| API family | Existing V1 client route family | Documented V2 route family | Important differences / status |
| --- | --- | --- | --- |
| Query and request handlers | `/{core-or-collection}/select`, `/get`, and custom handler paths | `/api/c/{collection}/{handlerName}`, including `select` and `get` | Handler methods, request parameters, response writers, and custom handler availability are server/configuration-dependent. V2 route prefix and introspection are documented; no V2 typed contract exists yet. |
| Update | `/{core-or-collection}/update` and JSON update paths | `/api/c/{collection}/update` | POST body framing and command models must be audited independently. Do not reuse V1 endpoint assumptions or infer streaming support from V1 `addStream()`. |
| Schema | `/{core-or-collection}/schema` | `/api/c/{collection}/schema` | Same API family, but command serialization and response models require V2-specific contract tests. |
| Config | `/{core-or-collection}/config` | `/api/c/{collection}/config` | Same API family, but request/response contracts and supported commands must be verified separately. |
| Collections | `/admin/collections?action=...` | `/api/collections`, `/api/collections/{collection}`, `/api/collections/{collection}/shards/...`, `/api/aliases` | Solr 9.3 changed multiple paths and removed/renamed command envelopes. Backup, alias, replica, shard, and force-leader routes need version-specific mappings. |
| Core Admin | `/admin/cores?action=...` | `/api/cores`, `/api/cores/{core}`, and operation subpaths such as `reload`, `rename`, `unload`, and `merge-indices` | V2 uses path parameters and JSON bodies for several actions. Core lifecycle operations are distinct from SolrCloud Collections operations. |
| Collection backups | Collections V1 backup/list/restore/delete actions | `/api/collections/backups/{backup}/versions`, `/api/backups/{backup}/versions`, and `/api/backups/{backup}/restore` | Solr 9.3 redesigned backup creation/list/deletion/restore routes. Do not reuse the V1 backup parameter model. |
| Core backups and replication | CoreAdmin and ReplicationHandler V1 routes | V2 equivalents include `/api/cores/{core}/backups`, `/api/cores/{core}/restore`, and `/api/cores/{core}/replication/backups` in the documented 9.x line | Core-level and collection-level backup APIs have different topology/storage semantics. Verify availability and payloads per pinned version. |
| Cluster and node administration | Collections cluster actions and node-specific V1 admin handlers | `/api/cluster`, `/api/node`, plus subpaths for health and logging | These operations have cluster-wide security and operational impact. Only expose named, scoped operations with clear authorization and risk documentation. |
| Security and metrics | Existing V1 security and metrics handlers | V2 coverage is not fully mapped in this audit | Keep out of the first V2 implementation tranche until official per-version route, permission, and response evidence is recorded. |

## Version-specific findings

### Solr 8.11

The 8.11 guide lists `/api/collections`, `/api/c/{collection}` query/config/schema/update handlers, shard routes, `/api/cores`, `/api/node`, and `/api/cluster`. It also documents `/_introspect`. However, these are not proof that the later 9.3 REST-style route redesign is present in 8.11.4. The first implementation tranche must inspect the 8.11.4 server's introspection output and exercise exact requests before including 8.11 in a method's support range.

### Solr 9.11

The 9.3 redesign is a hard compatibility boundary for several V2 operations. Examples documented in the 9.11 release notes include:

- `POST /api/collections/{collection}/shards/{shard}/force-leader`
- `POST /api/collections/{collection}/shards/{shard}/sync-shard`
- `POST /api/collections/{collection}/reload`
- `POST /api/collections/{collection}/rename`
- `POST /api/collections/{collection}/shards/{shard}/replicas` for add-replica
- `POST /api/collections/backups/{backup}/versions` for collection backup creation
- `POST /api/backups/{backup}/restore` for collection restore
- `GET /api/backups/{backup}/versions` and DELETE variants for backup versions

The 9.11 release notes also document alias, replica-property, collection-property, node logging, core reload/unload, and core backup/restore route changes. A single V2 request model shared with 8.11 is therefore unsafe without an explicit compatibility decision.

### Solr 10.1

Solr 10.1 documents the same broad route families and adds operational pressure to secure them correctly: the V2 API can no longer be disabled using the former system property, and Solr's own tooling uses V2 internally. Authorization rules must explicitly protect V2 paths. V2 support must therefore include security-focused integration tests, not just serialization tests.

## Recommended implementation order

1. **Foundation:** add a distinct `client.v2` namespace using the existing shared transport, URL safety, auth, timeout, cancellation, error, and custom-fetch behavior. Do not alter V1 methods. Establish a V2 request/response envelope policy and a version-support annotation convention.
2. **Read-only discovery and status:** add the smallest stable, high-value read operations first (for example collection/core/cluster status), with exact route tests and response models that preserve unknown fields.
3. **High-value cluster recovery:** implement FORCELEADER as its own explicitly dangerous operation, coordinated with [Issue #328](https://github.com/vsimko/node-solr-lambda/issues/328). Require per-version route verification and an opt-in, isolated multi-node SolrCloud test that verifies the resulting leader, not merely HTTP success.
4. **Core Admin lifecycle:** add V2 core status/reload/rename/unload/backup operations as separate contracts from V1 CoreAdmin.
5. **Schema and Config:** add V2 command methods only after command-specific request/response differences are recorded and consumer TypeScript tests exist.
6. **Collections backup/restore and remaining admin:** implement separately from core-level backups and only with explicit storage/topology semantics.
7. **Security, metrics, plugins:** defer until route, permission, and response coverage is documented for each supported Solr line.

Each operation must state its minimum supported Solr version. If an operation is only stable from 9.3 onward, expose and document that boundary rather than silently translating it for Solr 8.11.

## Required test evidence for each V2 operation

- Unit tests assert the exact HTTP method, path, query parameters, headers, JSON body, and response/error parsing.
- Consumer TypeScript fixtures assert inference, generics, valid inputs, and rejected invalid inputs.
- Integration tests execute against the pinned Solr versions claimed by the operation; tests inspect `/_introspect` where useful but assert actual request behavior as well.
- Security-enabled tests verify allowed and denied access to the V2 path, especially on Solr 10.1.
- SolrCloud state-changing tests use disposable collections and a loopback-only multi-node topology; destructive tests remain opt-in.
- Compatibility docs and `api-inventory.json` distinguish documented, serialization-tested, and runtime-tested states.

## Official sources

- [Solr 8.11 V2 API guide](https://solr.apache.org/guide/8_11/v2-api.html)
- [Solr 9.11 reference guide](https://solr.apache.org/guide/solr/9_11/index.html)
- [Solr 9.11 release notes](https://solr.apache.org/docs/9_11_0/changes/Changes.html)
- [Solr 9.11 major changes and V2 compatibility notes](https://solr.apache.org/guide/solr/9_11/upgrade-notes/major-changes-in-solr-9.html)
- [Solr 10.1 V2 API guide](https://solr.apache.org/guide/solr/10_1/configuration-guide/v2-api.html)
- [Solr 10 major changes and V2 security implications](https://solr.apache.org/guide/solr/latest/upgrade-notes/major-changes-in-solr-10.html)
