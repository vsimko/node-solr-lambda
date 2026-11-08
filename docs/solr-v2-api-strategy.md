# Solr V2 API strategy

This document records the V1/V2 compatibility audit requested by [Issue #327](https://github.com/vsimko/node-solr-lambda/issues/327). The generic namespace foundation is implemented; this strategy does not claim operation-specific V2 support or runtime compatibility.

## Decision

Keep the existing typed methods on Solr's V1 routes. Expose V2 through an explicit, parallel `client.v2` namespace. The initial generic request methods are implemented; operation-specific request and response contracts remain follow-up work.

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

1. **Foundation — implemented in #332:** a distinct `client.v2` namespace uses the existing shared transport, including auth, timeout, cancellation, errors, and custom Fetch. It rejects path traversal and does not alter V1 methods. The generic methods do not imply operation-specific contracts or version support.
2. **Read-only discovery and status — Core Admin implemented in #333:** `GET /api/cores/` and `GET /api/cores/{core}` have typed, extensible response contracts and runtime evidence on Solr 9.11.0/10.1.0. The 8.11.4 CoreAdmin guide documents only V1; its V2 Core Admin status remains unverified.
3. **High-value cluster recovery:** implement FORCELEADER as its own explicitly dangerous operation, coordinated with [Issue #328](https://github.com/vsimko/node-solr-lambda/issues/328). Require per-version route verification and an opt-in, isolated multi-node SolrCloud test that verifies the resulting leader, not merely HTTP success.
4. **Core Admin lifecycle — implemented in #333:** V2 reload/rename/unload are separate contracts from V1 CoreAdmin and are integration-tested on Solr 9.11.0/10.1.0. Core backup/restore remains deferred pending independent route and behavior review.
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


## Implemented namespace foundation

Issue #332 adds an explicit `client.v2` namespace backed by the same transport instance as V1. The initial surface is intentionally limited to:

- `client.v2.request<T>("/api/…", options)` for JSON requests.
- `client.v2.requestRaw("/api/…", options)` for raw responses and streaming/custom writers.
- Shared authentication, configured headers, request defaults, timeout, cancellation, retry policy, JSON codec, validation, and custom Fetch behavior.
- A TypeScript template-literal path constraint and runtime guard requiring a relative `/api/` path; pass query parameters through `options.query`.
- A test-only `fetchV2Introspection()` helper appends `/_introspect` and preserves the result as an open JSON document. It is discovery evidence only; the package does not generate public types from introspection.

This is a low-level V2 escape hatch, not operation-specific typed support. It performs no V1 fallback, does not change existing V1 methods, and makes no runtime compatibility claim for any Solr release. Operation-specific Core Admin and Collections methods remain in #333 and #334. The namespace foundation must pass its unit and consumer type tests before #332 is closed.


### Introspection fixture policy

The test-only helper in `test/helpers/v2-introspection.ts` fetches `{V2 resource path}/_introspect` through the public namespace. Tests retain raw, version-labelled introspection JSON from the exact pinned image. The standalone CI job uploads `v2-core-admin-introspection-9.11.0` and `v2-core-admin-introspection-10.1.0` artifacts; the captured `cores.json` files are committed under `test/fixtures/v2-introspection/` after successful CI. Fixtures must preserve the original response and capture metadata (Solr image tag, endpoint path, and capture date). Do not normalize away unknown fields, treat the experimental document as a stable schema, or generate package declarations from it. A fixture is evidence for route discovery; actual request integration tests remain necessary before marking an operation supported.
