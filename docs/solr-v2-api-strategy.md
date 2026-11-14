# Solr V2 API strategy

This document records the V1/V2 compatibility audit requested by [Issue #327](https://github.com/vsimko/node-solr-lambda/issues/327). The explicit namespace, Core Admin operations, and the initial read-only Collections/cluster operations are implemented as separate typed layers; compatibility remains operation- and version-specific.

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
2. **Read-only discovery and status — Core Admin implemented in #333:** `GET /api/cores/` and `GET /api/cores/{core}` have typed, extensible response contracts and runtime evidence on Solr 8.11.4/9.11.0/10.1.0. The 8.11.4 CoreAdmin guide documents V1, while the separate 8.11 V2 API guide lists `/api/cores` and `/api/cores/{core}` lifecycle routes. The 8.11.4 runtime result is pending the current integration run.
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
- [Solr 8.11 CoreAdmin API (V1)](https://solr.apache.org/guide/8_11/coreadmin-api.html)
- [Solr 8.11 V2 API guide (Core Admin V2 routes)](https://solr.apache.org/guide/8_11/v2-api.html)
- [Solr 9.11 CoreAdmin API](https://solr.apache.org/guide/solr/9_11/configuration-guide/coreadmin-api.html)
- [Solr 10.1 CoreAdmin API](https://solr.apache.org/guide/solr/10_1/configuration-guide/coreadmin-api.html)
- [Solr 10.1 V2 API guide](https://solr.apache.org/guide/solr/10_1/configuration-guide/v2-api.html)
- [Solr 10 major changes and V2 security implications](https://solr.apache.org/guide/solr/latest/upgrade-notes/major-changes-in-solr-10.html)


## Implemented namespace foundation

Issue #332 adds an explicit `client.v2` namespace backed by the same transport instance as V1. The initial surface is intentionally limited to:

- `client.v2.request<T>("/api/…", options)` for JSON requests.
- `client.v2.requestRaw("/api/…", options)` for raw responses and streaming/custom writers.
- Shared authentication, configured headers, request defaults, timeout, cancellation, retry policy, JSON codec, validation, and custom Fetch behavior. V2 URLs resolve at the server-root `/api` mount (not `/solr/api`); a reverse-proxy prefix is retained while a terminal `/solr` context segment is removed.
- A TypeScript template-literal path constraint and runtime guard requiring a relative `/api/` path; pass query parameters through `options.query`.
- A test-only `fetchV2Introspection()` helper appends `/_introspect` and preserves the result as an open JSON document. It is discovery evidence only; the package does not generate public types from introspection.

This is a low-level V2 escape hatch, not operation-specific typed support by itself. It performs no V1 fallback and does not change existing V1 methods. Typed Core Admin methods are implemented separately in #333; typed Collections methods remain in #334.


### Introspection fixture policy

The test-only helper in `test/helpers/v2-introspection.ts` fetches `{V2 resource path}/_introspect` through the public namespace. Tests retain raw, version-labelled introspection JSON from the exact pinned image. The standalone CI job uploads `v2-core-admin-introspection-8.11.4`, `v2-core-admin-introspection-9.11.0`, and `v2-core-admin-introspection-10.1.0` artifacts. Version-labelled fixtures are committed under `test/fixtures/v2-introspection/` with the image tag, resource paths, capture timestamp, and the list/per-core response specifications. The 8.11.4 fixture is a curated projection: its volatile `availableSubPaths` map contains generated core-specific paths and is omitted; the 9.11.0 and 10.1.0 resource documents are retained as returned. Do not treat experimental introspection as a stable schema or generate package declarations from it. A fixture is evidence for route discovery; actual request integration tests remain necessary before marking an operation supported.


## Core Admin V2 implementation status

Issue #333 adds `client.v2.coreAdmin` with list/status, reload, rename, and unload operations. The contracts are distinct from V1 CoreAdmin and preserve unknown response fields. Exact routes and payloads are tested on pinned Solr 9.11.0 and 10.1.0, including authenticated/anonymous security checks. Solr 8.11.4 has a separate V2 API guide that documents the Core Admin route family; runtime verification on the pinned 8.11.4 image is pending. Core Admin V2 is for standalone/user-managed cores; SolrCloud management must use Collections APIs.

The integration workflow captures per-operation `/_introspect` responses as CI artifacts for Solr 9.11.0 and 10.1.0. These raw outputs are retained as version-labelled fixtures and are discovery evidence only, not stable generated types.


## Collections V2 read-only implementation status

Issue #334 begins with the low-risk discovery surface only:

- `client.v2.collections.list()` — `GET /api/collections`, returning the cluster collection names.
- `client.v2.collections.status(name, options?)` — `GET /api/collections/{collection}`, returning the collection-keyed status. The exposed flags are limited to `coreInfo`, `segments`, `fieldInfo`, and `sizeInfo`; this is not full parity with V1 COLSTATUS index/size-analysis options.
- `client.v2.cluster.status()` — `GET /api/cluster`. The response contract remains extensible. GET CLUSTERSTATUS is documented from Solr 9.11; the Solr 8.11 guide lists other cluster command routes but does not document this GET operation.

The methods use the shared V2 transport and do not call V1 methods or fall back to V1 routes. Collection names are path-encoded and empty/path-like names are rejected before Fetch. Unit serialization, consumer type fixtures, isolated SolrCloud read-back tests, and authenticated/anonymous route-gate tests are included. Collection listing is tested across the pinned Solr 8.11.4 / 9.11.0 / 10.1.0 matrix; per-collection status is limited to Solr 9.3+ (therefore pinned 9.11.0 / 10.1.0), and GET cluster status is limited to Solr 9.11+ (therefore pinned 9.11.0 / 10.1.0). CI results must pass before runtime certification is recorded.

Official route and behavior references:
- [Solr 8.11 V2 API guide](https://solr.apache.org/guide/8_11/v2-api.html) — `/api/collections`, `/api/cluster`, and introspection.
- [Solr 10.1 V2 API guide](https://solr.apache.org/guide/solr/10_1/configuration-guide/v2-api.html) — current V2 route families and experimental contract boundary.
- [Solr Collection Management guide](https://solr.apache.org/guide/solr/latest/deployment-guide/collection-management.html) — LIST and COLSTATUS V2 routes and response semantics.
- [Solr 9.11 release notes](https://solr.apache.org/docs/9_11_0/changes/Changes.html) — route changes for aliases and cluster status.

Alias CRUD, collection lifecycle, shard/replica management, backup/restore, and destructive actions remain outside this first read-only tranche. Their V2 routes changed during the Solr 9.3 redesign and require their own request/response contracts, minimum-version decisions, and isolated behavior tests. FORCELEADER remains coordinated with #328/#341.

## Collections V2 lifecycle implementation status

Issue #409 adds the first state-changing V2 collection methods independently of the V1 Collections action API:

- `client.v2.collections.create(params)` — `POST /api/collections` with the flat request body introduced by the Solr 9.3-era redesign. The required typed fields are `name` and `config`; commonly used shard and replica placement fields are optional.
- `client.v2.collections.delete(name, options?)` — `DELETE /api/collections/{collection}`. Directory deletion controls are explicit opt-ins and are omitted unless supplied.
- `client.v2.collections.reload(name)` — `POST /api/collections/{collection}/reload`, documented as the REST-style V2 route from Solr 9.3.

These methods use V2-specific contracts and the shared authenticated transport. They do not reuse V1 request models, infer a V1 fallback, or claim Solr 8.11 compatibility. The Solr 8.11 guide predates the flat create-body and REST-style lifecycle redesign; its legacy command envelope is intentionally not synthesized by these methods. The current unit and consumer fixtures assert method, path, body/query serialization, input validation, and response extensibility. Runtime compatibility and security-gate checks remain pending; source presence is not runtime evidence.

Official evidence:
- [Solr 9.11 release notes](https://solr.apache.org/docs/9_11_0/changes/Changes.html) — SOLR-16391 records the flat `POST /api/collections` create body; SOLR-16398 records `POST /api/collections/{collection}/reload`.
- [Solr 10.1 Collections API guide](https://solr.apache.org/guide/solr/10_1/configuration-guide/collections-api.html) — current collection lifecycle API family.
- [Solr V2 API guide](https://solr.apache.org/guide/solr/10_1/configuration-guide/v2-api.html) — V2 route and request-body model.

Collection deletion, create and reload are state-changing operations. Runtime tests must use uniquely named disposable collections and verify state before cleanup; no shared or user data may be targeted.

## V2 shard and replica administration (issue #411)

The first typed administration slice is intentionally limited to additive replica creation and deletion of one explicitly named replica:

- client.v2.collections.addReplica(collection, params, options?) — POST /api/collections/{collection}/shards/{shard}/replicas; accepts a typed shard selector or route, optional node / nodeSet, replica type (nrt, tlog, pull), replica counts, and waitForFinalState. With route and no shard, the route is sent in the body to the collection-level shards endpoint.
- client.v2.collections.deleteReplica(collection, shard, replica, options?) — DELETE /api/collections/{collection}/shards/{shard}/replicas/{replica}; this wrapper only deletes the exact named replica, never a count-selected group.

The delete wrapper deliberately sends deleteInstanceDir=false, deleteDataDir=false, and deleteIndex=false unless the caller explicitly opts in. This differs from Solr's server defaults, which delete these directories by default, and protects callers from accidental filesystem deletion. onlyIfDown, followAliases, and async are exposed as documented query controls. No bulk/count delete helper is exposed.

The Solr 10.1 Replica Management guide documents the add route/body and exact replica-delete route. The 9.0 guide already documents the REST-style named-replica delete route; 8.11's older V2 API guide does not document these redesigned REST-style shard/replica routes, so no Solr 8.11.4 support is claimed. Runtime coverage is limited to the pinned Solr 9.11.0 and 10.1.0 targets after the new isolated test runs; the tests verify replica topology before and after operations and clean up only the newly created replica.

Deferred from this slice:
- moveReplica: internally performs add-then-delete and can leave an extra replica after timeout; its operational semantics deserve a separate typed contract and failure-recovery test.
- Replica property add/delete: useful for preferred-leader and custom properties, but deferred until the property contract and read-back surface are separately modeled.
- Bulk/count replica deletion and scale operations: omitted because they can affect multiple replicas and need stronger explicit safety design.
- splitShard, forceLeader, migrate, and other shard topology/failover operations: remain separate due their destructive or fault-injection behavior and existing issues #232/#341/#328. No such tests are run by ordinary CI.

Official route evidence:
- Solr 10.1 Replica Management — ADDREPLICA and named DELETEREPLICA V2 routes, payload fields, async behavior, and filesystem flags.
- Solr 9.0 Replica Management — documents the named V2 replica DELETE route.
- Solr 8.11 V2 API guide — documents the earlier command-style V2 route family, not these REST-style replica routes.

## V2 alias read operations

The read-only alias slice exposes `client.v2.aliases.list()` (`GET /api/aliases`) and `client.v2.aliases.status(name)` (`GET /api/aliases/{alias}`). The Solr 9.2, 9.11, and 10.1 Alias Management guides document both response shapes: the list returns an `aliases` name-to-collection mapping and optional per-alias `properties`; the detail response returns `alias`, a `collections` array, and optional `properties`.

The Solr 9.11 release notes record the alias mutation redesign in Solr 9.3, including the move of alias creation to `POST /api/aliases` and the updated delete route; this does not change the documented GET read paths described above. Runtime claims are limited to pinned Solr 9.11.0 and 10.1.0; Solr 8.11.4 remains explicitly unclaimed. Solr 10.1.0 currently returns 405 (`Allow: DELETE,OPTIONS`) for the documented detail GET, despite the route being present in the release notes and Javadocs. `status()` therefore uses the direct GET first and falls back only on 405 to `GET /api/aliases`, deriving the requested alias's mapping and properties from that V2 response. It does not use V1 fallback and propagates 401/403/404 and other errors. Unit tests cover the fallback and error propagation; isolated SolrCloud tests verify exact target mapping on 9.11.0 and 10.1.0 in CI #43211482752. BasicAuth allow/deny checks cover both list and detail paths on the pinned security matrix.

## V2 alias mutation implementation status

Issue #410 adds the standard-alias and metadata-property operations to `client.v2.aliases`:

- `create({ name, collections })` — `POST /api/aliases`, creating or replacing a standard alias over one or more existing collections.
- `delete(name, { async? })` — `DELETE /api/aliases/{alias}`; only the alias is removed, not its target collections.
- `getProperties(name)` / `getProperty(name, property)` — read all or one property using the property subresource GET routes.
- `setProperties(name, properties, { async? })` — bulk `PUT /api/aliases/{alias}/properties` with a `{ properties }` body.
- `setProperty(name, property, value, { async? })` — property-level `PUT` with a `{ value }` body.
- `deleteProperty(name, property, { async? })` — property-level `DELETE`.

The standard create contract requires a non-empty collection mapping. Routed-alias creation (time/category routers and `create-collection` options) is deliberately not included in this typed method yet; advanced routed aliases can still use the generic V2 request escape hatch with caller-owned contracts. Property writes accept string values, matching Solr's alias metadata map contract. Empty strings are rejected by the convenience methods because Solr interprets an empty property value as removal; callers should use `deleteProperty()` for explicit deletion. The optional `async` option is sent as the documented query parameter for create/delete/property mutations.

The redesigned alias route family is documented from Solr 9.3. The Solr 8.11 V2 guide documents the earlier Collections command route family (including alias commands through `/api/collections`), not these redesigned `/api/aliases` and `/properties` routes. The implementation therefore makes no Solr 8.11.4 compatibility claim and performs no legacy-envelope or V1 fallback. Solr 9.11.0 and 10.1.0 are the documented target baselines; the new isolated SolrCloud and BasicAuth tests are added but runtime results remain pending until CI completes.

Official route and payload evidence:
- [Solr 10.1 Alias Management](https://solr.apache.org/guide/solr/10_1/deployment-guide/alias-management.html) — standard alias `POST /api/aliases`, `DELETE /api/aliases/{alias}`, bulk and property-level mutation, property reads, and async parameters.
- [Solr 9.5 Alias Management](https://solr.apache.org/guide/solr/9_5/deployment-guide/alias-management.html) — confirms the redesigned alias and property routes before the 9.11 baseline.
- [Solr 9.11 release notes](https://solr.apache.org/docs/9_11_0/changes/Changes.html) — records the alias mutation redesign introduced in the Solr 9.3 line.
- [Solr 8.11 V2 API guide](https://solr.apache.org/guide/8_11/v2-api.html) — documents the earlier `/api/collections` command route family; no modern alias-route compatibility is claimed.

Runtime tests use a uniquely named disposable collection and alias, verify mapping/property state after each mutation, and remove the alias in a `finally` cleanup. The BasicAuth matrix probes each new HTTP method against a unique nonexistent alias so the authentication test cannot mutate shared cluster state.



Validation: the pinned Node.js 22/24/26 CI matrix passed in [run #43211482752](https://github.com/vsimko/node-solr-lambda/actions/runs/43210450787) with 33 successful jobs and two expected skips. This includes SolrCloud alias list/detail verification on Solr 9.11.0 and 10.1.0, plus BasicAuth allow/deny coverage. The 10.1.0 detail GET 405 compatibility fallback is exercised by the same integration suite.

## Collections V2 backup and restore operations (#412)

The first typed collection-backup slice exposes the post-Solr-9.3 REST-style routes through the separate V2 namespace. It does not change the V1 `collections("BACKUP" | "RESTORE" | ...)` contracts and does not translate requests to the legacy Solr 8.11 V2 command envelope.

| Client method | HTTP route | Purpose |
| --- | --- | --- |
| `v2.collections.backup(collection, backupName, params)` | `POST /api/collections/{collection}/backups/{backup}/versions` | Create an incremental collection backup point |
| `v2.backups.list(backupName, { location, repository? })` | `GET /api/backups/{backup}/versions` | List backup-point metadata |
| `v2.backups.delete(backupName, backupId, { location, repository? })` | `DELETE /api/backups/{backup}/versions/{backupId}` | Delete one backup point |
| `v2.backups.restore(backupName, params)` | `POST /api/backups/{backup}/restore` | Restore a selected backup point to a collection |

The collection backup request body models the documented `location`, `repository`, `maxNumBackupPoints`, `backupConfigset`, `extraProperties`, `incremental`, `backupStrategy`, and `snapshotName` options. The async request ID is sent as a query parameter. Listing and deletion require the same repository location used to create the backup. Restore accepts `collection`, optional `location`/ `repository`, an optional `backupId` selector, and the V2 `create-collection` object for creation overrides.

**Compatibility boundary:** the redesigned REST routes are documented from Solr 9.3. The pinned Solr 8.11.4 guide predates this route/payload design, so these typed methods do not claim Solr 8.11.4 support and do not fall back to V1. Runtime and BasicAuth evidence remains pending for Solr 9.11.0 and 10.1.0 until isolated integration jobs pass.

**Operational requirements:** SolrCloud collection backups require a shared repository location mounted or configured consistently across all nodes. A location that is mounted only on current collection replicas can still fail if the overseer changes. Restore replaces the target collection's index contents; test against a separate disposable collection. Backup deletion permanently removes the selected backup point and can orphan index files; use the documented purge workflow deliberately rather than assuming point deletion also garbage-collects all unused files.

The initial API intentionally excludes backup-retention deletion (`retainLatest`), `purgeUnused`, backup repository configuration, and core-level backup/restore. These are separate follow-up surfaces with their own safety and compatibility review.

Official references:
- [Solr 10.1 Collection Management — BACKUP/LISTBACKUP/RESTORE/DELETEBACKUP](https://solr.apache.org/guide/solr/10_1/deployment-guide/collection-management.html)
- [Solr 9.11 release notes — V2 route redesign](https://solr.apache.org/docs/9_11_0/changes/Changes.html)
- [Solr 9.3 Collection Management — redesigned backup routes](https://solr.apache.org/guide/solr/9_3/deployment-guide/collection-management.html)
- [Solr 8.11 V2 API guide — legacy route baseline](https://solr.apache.org/guide/8_11/v2-api.html)

Unit serialization and consumer type fixtures are in `test/v2-collections.test.ts` and `test/v2-types.ts`. An isolated SolrCloud backup/list/restore/read-back/delete scenario is in `test/integration/solrcloud-backup-restore.test.ts`; it skips Solr 8.11.4 because that line predates the redesigned routes. BasicAuth route probes for create/list/delete/restore are included in `test/integration/solr-v2-security.test.ts` on Solr 9.11.0 and 10.1.0. Runtime and security evidence remains pending CI; the inventory intentionally records all pinned versions as unverified until the corresponding jobs pass.
