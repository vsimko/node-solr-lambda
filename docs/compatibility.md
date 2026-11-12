# Solr server compatibility

This page records the current client compatibility policy. It separates documentation evidence from runtime test evidence.

## Project support policy

The client publishes an evidence policy, not an upstream support guarantee. A compatibility claim applies only to the exact pinned server version and operation whose tests passed.

### Apache Solr

| Client tier | Exact server baseline | Policy |
| --- | --- | --- |
| Current primary target | Solr 10.1.0 | Newest official Solr release as of 2026-11-07; prioritize new-version qualification and feature verification here. |
| Current compatibility target | Solr 9.11.0 | Final release in the 9.x series; retain as a first-class tested compatibility baseline. |
| Legacy compatibility only | Solr 8.11.4 | Final 8.x release. The Solr PMC designated the 8.x line End of Life on 2024-10-25. Keep the pinned image as a v4 regression target, but do not recommend it for new production deployments or imply upstream security maintenance. |

The project does **not** claim blanket support for every patch in 8.x, 9.x, or 10.x. The exact runtime baselines are 8.11.4, 9.11.0, and 10.1.0; every operation has its own evidence status. Solr 8.11.4 being tested by this client does not reverse its upstream EOL status. Solr 9.11.0 and 10.1.0 being client compatibility targets does not create an Apache Solr support-window guarantee.

Official release sources: the [Solr PMC board minutes](https://apache.org/foundation/board/minutes/Solr.html) record the 8.x EOL designation; the [official Solr downloads page](https://solr.apache.org/downloads.html) identifies 10.1.0 as the latest release and 9.11.0 as the final 9.x release. Solr releases are not scheduled in advance; the project publishes them when maintainers judge there are sufficient changes.

### Node.js

- **Supported production targets:** Node.js 26.x (Active LTS), 24.x and 22.x (Maintenance LTS).
- **Unsupported:** Node.js 20.x reached EOL on 2026-04-30 and is excluded from the package engine range and CI. Version 4 is a new package line that has not yet established a legacy consumer base, so retaining an EOL runtime would add maintenance and CI cost without a meaningful compatibility benefit.
- The exact engine range is `^22.0.0 || ^24.0.0 || ^26.0.0`. No broad `>=22` compatibility claim is made.

The [Node.js Release Working Group schedule](https://github.com/nodejs/Release#release-schedule) is authoritative for LTS/EOL status and dates. Reassess the Node matrix when a supported LTS line changes lifecycle phase or reaches EOL.

### Evidence levels

- **Current tested baseline:** exact pinned release, with completed unit/type, standalone integration, security-enabled integration, and SolrCloud jobs where applicable.
- **Legacy tested baseline:** exact pinned release retained for regression coverage after upstream EOL; this is not a security-maintenance recommendation.
- **Documented only:** present in an official reference guide, but the exact behavior has not passed the relevant integration test.
- **Unverified:** no exact runtime evidence exists for that operation/version.
- **Not covered:** no dedicated typed client method exists.

A configured CI matrix is not a passed matrix. The public website and compatibility records must derive runtime status from completed workflow runs, while showing configured-but-pending combinations separately.

### New-release qualification procedure

For every new Solr release selected for support:

1. Pin the exact Docker image and record its official release notes and reference-guide baseline.
2. Add it to standalone, security-enabled, and SolrCloud CI matrices; keep existing pinned baselines until a deliberate deprecation decision.
3. Run unit, consumer TypeScript, serialization/contract, standalone, authentication/authorization, and SolrCloud suites. Run destructive SPLITSHARD/MIGRATE checks only through the loopback-only opt-in workflow.
4. Review changed/deprecated V1 and V2 routes, request bodies, response shapes, auth permissions, Java/runtime requirements, and plugin changes.
5. Update `docs/compatibility.md`, `docs/api-inventory.json`, API coverage, endpoint inventory, release notes, and generated website data from completed evidence.
6. Mark each operation as tested only after its exact behavior passes. Record unsupported or partially tested cases instead of inferring support from a green matrix.
7. Revisit legacy baselines at the next major client release and document a deprecation window before removing them.

The current matrix is intentionally pinned rather than dynamically claiming compatibility with all releases. A weekly workflow checks the official Apache Solr download index and opens a qualification issue for each stable release missing from the matrix. It does not edit the matrix, merge changes, or certify support automatically; reviewed qualification remains required. See [Issue #335](https://github.com/vsimko/node-solr-lambda/issues/335). For a candidate newer than the pinned baseline, a maintainer can manually dispatch the CI workflow with `candidate_solr_version` set to the exact upstream version. The candidate is validated against the official Apache download directory and added only to that run's standalone, security-enabled, and SolrCloud matrices for Node.js 22/24/26; the pinned support matrix and compatibility policy remain unchanged. The candidate matrix disables fail-fast so all combinations can report evidence.

## Status terms

- **Documented** means the endpoint or feature appears in the official reference guide for the listed Solr documentation baseline.
- **Tested** means the exact behavior named in the runtime-test column passed against the pinned Docker image for that Solr line; it does not certify other parameters or actions.
- **Unverified** means this repository has not run an integration test for that operation against that Solr server version.
- **Not covered** means the current typed client does not provide a dedicated method for that endpoint.

Documentation evidence does not prove that every patch release behaves in the same way.

## Interpreting unverified operations

An exposed action or parameter is not runtime-certified merely because it has a TypeScript model or serialization test. The API coverage page records the current triage of deferred and intentionally out-of-scope gaps. Destructive Core Admin actions and cluster-wide Collections policy mutations remain unverified until isolated runtime evidence is added; SPLITSHARD/MIGRATE still require the opt-in workflow in [#232](https://github.com/vsimko/node-solr-lambda/issues/232). FORCELEADER now has a dedicated manual-only stale-replica harness using separate ZooKeeper and labelled loopback-only Solr nodes, but no runtime evidence is claimed until the new workflow input has been dispatched successfully for each pinned version. Export `includeStoredFields=true` is verified specifically on Solr 10.1.0 (PR [#263](https://github.com/vsimko/node-solr-lambda/pull/263)); ReplicationHandler in-progress abort is verified on Solr 9.11.0 and 10.1.0 only, with Solr 8.11.4 explicitly unverified (PR [#264](https://github.com/vsimko/node-solr-lambda/pull/264)). Issues #258 and #259 are closed; they are historical evidence, not outstanding verification tasks.

## Reference baselines

| Solr line | Documentation baseline | Pinned runtime baseline | Client tier | Documentation |
| --- | --- | --- | --- | --- |
| 8.x (upstream EOL) | 8.11 | 8.11.4 | Legacy compatibility only | [Solr 8.11 Reference Guide](https://solr.apache.org/guide/8_11/index.html) |
| 9.x | 9.11 | 9.11.0 | Current compatibility target | [Solr 9.11 Reference Guide](https://solr.apache.org/guide/solr/9_11/index.html) |
| 10.x | 10.1 | 10.1.0 | Current primary target | [Solr 10.1 Reference Guide](https://solr.apache.org/guide/solr/10_1/) |

The 8.11, 9.11, and 10.1 guides describe the API families below. The Replica Management Commands sections document ADDREPLICA, MOVEREPLICA, and DELETEREPLICA. These are documentation and runtime baselines, not blanket claims for every patch release.

## Node.js runtime matrix

The package engine range is `^22.0.0 || ^24.0.0 || ^26.0.0`. Node.js 26 is Active LTS; Node.js 24 and 22 are Maintenance LTS. Node.js 20 reached end-of-life on 2026-04-30 and is not supported by this new v4 package line. See the [official Node.js release schedule](https://github.com/nodejs/Release#release-schedule). The CI workflow defines Node.js 22, 24, and 26 jobs for type checking, consumer type fixtures, unit tests, builds, and release/documentation checks. Each standalone Solr, authenticated Solr, and SolrCloud integration suite uses the Cartesian product of those three Node versions and the three exact pinned Solr baselines.

Streaming ingestion was delivered in #300, hardened in #317, and completed with independent test coverage in #321. The final lifecycle matrix in CI run [#42392182590](https://github.com/vsimko/node-solr-lambda/actions/runs/42392182590) passed the previous 30-job matrix across Node.js 20/22/24 and pinned Solr 8.11.4/9.11.0/10.1.0 standalone, security-enabled, and SolrCloud suites; the 250-document `addStream()` fixture was read back with exact count/order on all three Solr versions. The consumer/test follow-up run [#42392800998](https://github.com/vsimko/node-solr-lambda/actions/runs/42392800998) also passed 30/30. Documentation reconciliation in #325 passed the dedicated docs/API-inventory checks. This certifies the tested JSON-array ingestion behavior on those pinned images; it does not certify atomicity or behavior on other Solr releases.

## Endpoint matrix

| Client operation | Solr 8.11 docs | Solr 9.11 docs | Solr 10.1 docs | Runtime test |
| --- | --- | --- | --- | --- |
| `query()` — `GET /solr/{core}/select` | Documented | Documented | Documented | Tested: basic query, cursorMark pagination, classic field/query/numeric-range/date-range facets, configured highlighting snippets, field grouping, collapse selection, expanded group documents, numeric Stats Component aggregates/facet breakdowns, MoreLikeThis Search Component similar-document responses, geofilt/bbox inclusion and exclusion, and geodist distance sorting on pinned 8.11.4 / 9.11.0 / 10.1.0 images. SpellCheck request/response contracts, including suggestions, frequencies, and collations, passed the pinned integration matrix on Solr 8.11.4, 9.11.0, and 10.1.0. Suggester typed request/response contracts and the disposable configured-handler integration test passed on pinned Solr 8.11.4, 9.11.0, and 10.1.0 in CI run [#42392182590](https://github.com/vsimko/node-solr-lambda/actions/runs/42392182590). group.func and distributed collapse behavior remain subject to Solr semantics |
| `get()` — `GET /solr/{core-or-collection}/get` | Documented | Documented | Documented | Tested: single-ID and multi-ID reads return uncommitted documents before searcher visibility on pinned Solr 8.11.4, 9.11.0, and 10.1.0 (CI run [#42392182590](https://github.com/vsimko/node-solr-lambda/actions/runs/42392182590)) |
| `queryJson()` — `POST /solr/{collection}/query` | Documented JSON Request API | Documented JSON Request API | Documented JSON Request API | Tested: JSON query round-trip plus nested terms/query/range JSON facets, metrics, and excludeTags domain changes on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `add()`, `addStream()`, `update()`, `atomicUpdate()`, `delete()`, `updateCommands()` — update handlers | Documented | Documented | Documented | Tested: add, full-document update, delete by ID/query, atomic update, single/array JSON documents, and JSON updateCommands add/commit, delete-by-ID/query, optimize, and rollback with persisted-state assertions on pinned 8.11.4 / 9.11.0 / 10.1.0 images. `addStream()` has a deterministic 250-document integration test with count/order read-back, passed on pinned Solr 8.11.4, 9.11.0, and 10.1.0 in CI run [#42376175065](https://github.com/vsimko/node-solr-lambda/actions/runs/42376175065) (30/30 jobs across Node.js 20/22/24 and standalone, authenticated, and SolrCloud matrices). The test certifies this request framing and ingestion path only; partial ingestion remains possible after a producer/network failure. SolrCloud add/update `_route_` is verified by shard-scoped read-back, and `commitWithin` visibility is verified without manual commit using the pinned `_default` configset; hard/soft commit selection remains server-configuration-dependent. Unverified: delete-option route/commitWithin runtime effects and optimize-specific `openSearcher` behavior |
| `commit()`, `softCommit()`, `optimize()`, `rollback()` — update commands | Documented | Documented | Documented | Tested: hard commit, soft commit, rollback, and optimize preserving committed documents on pinned 8.11.4 / 9.11.0 / 10.1.0 images. `expungeDeletes` and `openSearcher=false` commit behavior are tested; optimize-specific `openSearcher` runtime effect remains unverified |
| `ping()` — `/admin/ping` | Documented | Documented | Documented | Tested: ping returns OK on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `schema()` — `/schema` | Documented | Documented | Documented | Tested: add-field and GET /{core}/schema/fields read-back on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `config()` / `getConfig()` / `getConfigOverlay()` — `/config`, `/config/overlay` | Documented | Documented | Documented | Tested: isolated request-handler add/read/update/delete and GET /config read-back; Config API property set/unset and GET /config/overlay read-back on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `coreAdmin()` — `/solr/admin/cores` | Documented | Documented | Documented | Tested: CREATE, STATUS, RELOAD, and fixture UNLOAD cleanup on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `v2.coreAdmin` — `/api/cores` | V2 Core Admin route family documented in 8.11 V2 guide | Documented | Documented | Tested on 9.11.0 and 10.1.0: list/status, reload, rename round-trip, unload with state verification, `/_introspect`, and security allow/deny. Solr 8.11.4 runtime verification is pending in the V2-specific integration test. |
| `v2.collections.list()` — `GET /api/collections` | Documented in the 8.11 V2 guide | Documented | Documented | Tested on pinned 8.11.4 / 9.11.0 / 10.1.0 in CI run #43211482752 (Node.js 22/24/26); isolated SolrCloud integration verifies a newly created collection appears in the returned list. | 
| `v2.collections.status()` — `GET /api/collections/{collection}` | Not documented / not claimed | Documented from Solr 9.3 | Documented | Tested on pinned 9.11.0 and 10.1.0 in CI run #43211482752 (Node.js 22/24/26); 8.11.4 is explicitly skipped because the V2 CollectionStatus route was introduced after the 8.11 line. This endpoint is not a substitute for all V1 COLSTATUS detail flags. |
| `v2.cluster.status()` — `GET /api/cluster` | Cluster V2 command routes documented; GET CLUSTERSTATUS not documented / not claimed | Documented from Solr 9.11 | Documented | Tested on pinned 9.11.0 and 10.1.0 in CI run #43211482752 (Node.js 22/24/26); 8.11.4 is explicitly skipped because GET CLUSTERSTATUS was added later. Response remains open to accommodate version-specific cluster fields. |
| `v2.aliases.list()` — `GET /api/aliases` | Not documented / not claimed | Documented | Documented | Tested on pinned Solr 9.11.0 and 10.1.0 in CI #43211482752 (Node.js 22/24/26); Solr 8.11.4 is explicitly unclaimed. The V2 list response includes alias-to-collection mappings and optional alias properties. |
| `v2.aliases.status()` — `GET /api/aliases/{alias}` | Not documented / not claimed | Documented | Documented | Tested on pinned Solr 9.11.0 and 10.1.0 in CI #43211482752 (Node.js 22/24/26); Solr 8.11.4 is explicitly unclaimed. Solr 10.1.0 returns 405 (`Allow: DELETE,OPTIONS`) for the documented detail GET at runtime, so the client falls back only on 405 to `GET /api/aliases` and derives the alias detail from that V2 response. No V1 fallback. |
| `collections()` — `/solr/admin/collections` | Documented | Documented | Documented | Partial, per action: CREATE/LIST/DELETE; CREATEALIAS/LISTALIASES/DELETEALIAS; CLUSTERSTATUS; CREATESHARD/DELETESHARD; ADDREPLICA/DELETEREPLICA; ADDREPLICAPROP/DELETEREPLICAPROP; BALANCESHARDUNIQUE; MOVEREPLICA/REBALANCELEADERS; BACKUP/LISTBACKUP/RESTORE/DELETEBACKUP; REQUESTSTATUS/DELETESTATUS are tested on pinned 8.11.4 / 9.11.0 / 10.1.0. MODIFYCOLLECTION, SPLITSHARD, MIGRATE, ADDROLE, and REMOVEROLE remain unverified. RELOAD is tested on all three pinned versions. See [per-action Collections coverage](collections-api-coverage.md). |
| `systemInfo()` — `/solr/admin/info/system` | Documented | Documented | Documented | Tested: non-empty server metadata and at least one stable system section on pinned 8.11.4 / 9.11.0 / 10.1.0 images. Optional sections remain version/runtime-dependent |
| `systemProperties()` — `/solr/admin/info/properties` | Documented | Documented | Documented | Tested: non-empty JVM/process properties on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `systemThreads()` — `/solr/admin/info/threads` | Documented | Documented | Documented | Tested: non-empty JVM thread dump on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `systemLogging()` — `/solr/admin/info/logging` | Documented | Documented | Documented | Tested: logger levels, loggers, or watcher metadata on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `metrics()` — `/solr/admin/metrics` | Documented | Documented | Documented | Tested: non-empty JVM registry/metric entries for JSON or a Prometheus metric declaration/sample on pinned 8.11.4 / 9.11.0 / 10.1.0; observed JSON on Solr 8/9 and Prometheus text on Solr 10.1 |
| `security()` — authentication and authorization handlers | Documented | Documented | Documented | Tested: authenticated BasicAuth/RuleBasedAuthorization reads, anonymous 401 on both handlers, authentication `set-property` read-back, and malformed JSON rejection on pinned 8.11.4 / 9.11.0 / 10.1.0 images. Unit tests verify Basic/Bearer credentials are not exposed by client HTTP errors |
| `stream()` — `/stream` | Documented | Documented | Documented | Tested: Streaming Expressions search against a disposable SolrCloud collection on pinned 8.11.4 / 9.11.0 / 10.1.0 images (CI #145) |
| `export()` — `/export` | Documented | Documented | Documented | Tested: raw response with docValues sort field on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `replication()` / `replicationFile()` — `/solr/{core}/replication` | Documented | Documented | Documented | Tested: indexversion, details, filelist (generation on newer versions / legacy indexversion on older versions), streamed filecontent, enablereplication/disablereplication, core backup, restorestatus, restore, and deletebackup on pinned 8.11.4 / 9.11.0 / 10.1.0 images. A disposable two-core leader/follower fetch using `fetchindex` with follower query read-back passed the full standalone/security matrix on Solr 8.11.4 / 9.11.0 / 10.1.0 (CI #640). A bounded in-progress `abortfetch` test passes on Solr 9.11.0 and 10.1.0; it is skipped/deferred on 8.11.4 because `details` did not expose an observable active-fetch state in repeated CI runs. `enablepoll`/`disablepoll` retain unit serialization coverage only |
| Core and collection backup/restore | `replication("backup" | "restore" | "restorestatus" | "deletebackup")`, `collections("BACKUP" | "RESTORE" | "LISTBACKUP" | "DELETEBACKUP" | "REQUESTSTATUS" | "DELETESTATUS")` | Documented | Documented | Documented | Tested: full core backup/restore/read-back and SolrCloud collection backup/list/restore/read-back/delete with asynchronous status polling on pinned 8.11.4 / 9.11.0 / 10.1.0 images using local filesystem repositories and shared SolrCloud storage |
| `request()` / `requestRaw()` — generic caller-defined transport | Depends on the selected endpoint | Depends on the selected endpoint | Depends on the selected endpoint | Generic transport behavior has unit tests only; no endpoint-independent live Solr integration claim is made. Each custom endpoint remains unverified until tested individually |

The matrix records documentation and narrowly scoped runtime evidence separately. It does not certify every request parameter, response model, or action variant. The classic Facet Component coverage is limited to the field, query, and numeric/date range combinations exercised by the integration suite; legacy `facet.date` is not supported because it was removed in Solr 6.

## Version-specific notes

### Solr 8.x

Use the 8.11 guide as the documentation baseline. It documents the Schema API, Collections API, CoreAdmin API, Config API, Metrics API, security features, Streaming Expressions, and export operations.

Solr 8.11 introduced additional authentication and authorization plugins, including support for multiple authentication schemes. The client currently sends HTTP Basic credentials when configured. It does not configure Solr security plugins.

### Solr 9.x

Use the 9.11 guide as the documentation baseline. It documents both V1 and V2 API surfaces for several administration and configuration areas.

The current client uses the V1 paths for CoreAdmin and Collections operations. Do not assume that V1 and V2 request paths or response shapes are interchangeable.

### Solr 10.x

Use the 10.1 guide as the documentation baseline.

- Solr 10.1 no longer permits disabling the V2 API with `solr.api.v2.enabled`. Review proxy rules and authorization policies for the `/api` path when upgrading.
- Solr 10.1 removes PKI Authentication v1. Nodes must use the newer PKI authentication header.
- The JWT authentication plugin now defaults `blockUnknown` to `true`. Review existing `security.json` files during an upgrade.
- The Solr 10 server requires Java 21 or later. This is a server requirement. It does not change the Node.js runtime requirement for this client.

The client does not yet provide dedicated typed wrappers for the V2 API.

See the [machine-readable API inventory](api-inventory.json) for operation-level test and version status.

## Client-side JSON codec

`SolrClientConfig.jsonCodec` is a client-side parser/serializer extension point, not a Solr server feature. It is independent of Solr 8/9/10 compatibility and does not change the native JSON behavior used when no codec is supplied. The caller owns the codec's correctness and the types returned by its parser. The transport applies it to structured success/error payloads and JSON request bodies, while raw string bodies and successful raw response streams remain untouched.

## Current support policy

The current tiers and lifecycle rules are defined in [Project support policy](#project-support-policy) above. Runtime certification remains operation-specific; a successful TypeScript build, unit test, or documentation lookup is not server compatibility evidence. If an endpoint differs by version, record the difference here and add a focused test before changing its status.

## Integration test infrastructure

CI starts pinned official Solr images and runs standalone, security-enabled standalone, and SolrCloud integration suites on Solr 8.11.4, 9.11.0, and 10.1.0. Each integration suite covers Node.js 22, 24, and 26 across all three pinned Solr images: a 3 × 3 Cartesian product per suite (27 integration combinations across the three suites), in addition to the three Node.js unit/type/build/release jobs and documentation checks. The expanded matrix passed in CI run [#42398855690](https://github.com/vsimko/node-solr-lambda/actions/runs/42398855690). Earlier runs such as CI #162, #177, and #522 provide historical evidence for individual behaviors or the former three-Node matrix; they should not be read as evidence that Node.js 26 was tested in those runs. The passing SolrCloud coverage includes Collections CREATE/LIST/DELETE, alias lifecycle, implicit-router shard create/delete with CLUSTERSTATUS read-back, and Streaming Expressions search. The security-enabled matrix verifies anonymous rejection on both authentication and authorization handlers, authenticated reads, authentication property mutation/read-back, malformed JSON rejection, and that negative response bodies do not echo configured credentials. Unit tests also assert request Authorization headers are not copied into client HTTP error properties.

| Solr line | Pinned Docker image | Client tier |
| --- | --- | --- |
| 8.x (upstream EOL) | `solr:8.11.4` | Legacy compatibility only |
| 9.x | `solr:9.11.0` | Current compatibility target |
| 10.x | `solr:10.1.0` | Current primary target |

Run the same suite locally after starting a Solr container and creating an isolated core:

```sh
SOLR_BASE_URL=http://localhost:8983/solr SOLR_CORE=integration npm run test:integration

# For the security-enabled job, also set:
SOLR_BASE_URL=http://localhost:8983/solr SOLR_CORE=integration SOLR_SECURITY=true SOLR_USERNAME=integration-admin SOLR_PASSWORD=integration-password npm run test:integration
```

CI #145 passed standalone and SolrCloud integration jobs on all three pinned Solr images. Covered behavior includes CRUD, hard/soft commit, rollback, ping, schema field lifecycle, config user properties, CoreAdmin core lifecycle, JSON Request API, optimize, system info, metrics, export, Collections CREATE/LIST/DELETE, Streaming Expressions search, and basic query/cursorMark pagination. These results do not certify every endpoint, query option, update-command variant, or action in the compatibility matrix. The typed `updateCommands()` add/commit, delete-by-ID/query, optimize, and rollback variants are separately exercised with persisted-state assertions on all three pinned images.

## Remaining gaps and explicit non-certification

The endpoint families listed in the matrix have representative integration evidence on the three pinned images. The following narrower behaviors remain explicitly unverified and must not be described as generally Solr-8/9/10-compatible until focused tests exist:

- Delete-option `_route_` and `commitWithin` runtime effects; add/update routing and commitWithin visibility are covered separately by the SolrCloud integration suite.
- The optimize-specific runtime effect of `openSearcher`; the option is serialized but has no isolated server-side assertion.
- Generic `request()` and `requestRaw()` against arbitrary endpoint families. These are transport escape hatches, not blanket compatibility certification; each custom endpoint requires its own test.
- Distinct Collections snapshot semantics beyond the tested BACKUP/LISTBACKUP/RESTORE/DELETEBACKUP flows, and unobserved cluster-state response fields. The tested backup/restore flows are documented in the per-action matrix; do not generalize that evidence to every snapshot operation or response field.
- Function grouping and distributed collapse behavior beyond the documented Solr semantics and the specific standalone cases tested.

The machine-readable inventory is authoritative for operation-level status. Keep `integrationTests: not-run` / `versions: unverified` for generic transport methods, and record these narrower gaps in the operation notes rather than promoting the whole API family to tested.

## Reference notes

- [Solr 8.11.4 release notes](https://solr.apache.org/docs/8_11_4/changes/Changes.html) record the final 8.11 patch release and security-related changes.
- [Solr 9.11.1 release notes](https://solr.apache.org/docs/9_11_0/changes/Changes.html) record V2 API additions and changes in the 9.11 line.
- [Solr 10.1 upgrade notes](https://solr.apache.org/guide/solr/10_1/upgrade-notes/major-changes-in-solr-10.html) describe the V2 API, PKI authentication, and JWT default changes.
- [Solr 10.1 release notes](https://solr.apache.org/docs/10_1_0/changes/Changes.html) record release-specific changes.


## Cross-client regression test additions

The normal standalone integration suite now includes tests for nested parent/child/grandchild document round-trip and exact Unicode/multi-valued field read-back in `test/integration/solr-document-fidelity.test.ts`. The nested test uses `add([document])` deliberately: Solr's `/update/json/docs` convenience path flattens nested JSON by default, while the array form routes through `/update`. These tests are scheduled by the existing Solr 8.11.4, 9.11.0, and 10.1.0 standalone integration matrix; their successful execution must be confirmed in CI before they are counted as new runtime evidence.

Unit tests additionally verify that a long `query()` parameter remains intact on the existing GET contract and that generic `request()` preserves repeated parameters and unknown custom-handler response fields. These are transport contract tests and do not certify that arbitrarily long URLs will be accepted by every reverse proxy or Solr deployment.

Topology remains explicit: the fidelity integration tests require standalone Solr only; security-enabled standalone tests exercise authentication configuration; SolrCloud tests use disposable collections; tests requiring multiple live Cloud nodes must declare and opt into that requirement. This project does not claim ZooKeeper discovery or SolrJ-style replica routing. See [ADR 0003](adr/0003-cross-client-test-strategy.md).
