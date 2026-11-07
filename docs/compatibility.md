# Solr server compatibility

This page records the current client compatibility policy. It separates documentation evidence from runtime test evidence.

## Status terms

- **Documented** means the endpoint or feature appears in the official reference guide for the listed Solr documentation baseline.
- **Tested** means the exact behavior named in the runtime-test column passed against the pinned Docker image for that Solr line; it does not certify other parameters or actions.
- **Unverified** means this repository has not run an integration test for that operation against that Solr server version.
- **Not covered** means the current typed client does not provide a dedicated method for that endpoint.

Documentation evidence does not prove that every patch release behaves in the same way.

## Upstream support policy (2026-11-07)

### Apache Solr

- **Current feature-release line:** Solr 10.x; 10.1.0 is the latest release at the time of this policy review.
- **Previous maintenance line:** Solr 9.11.x; 9.11.0 is the final 9.x release and may receive occasional critical security or bug-fix releases.
- **Legacy compatibility only:** Solr 8.11.4 remains in the CI matrix to detect regressions for existing users, but upstream classifies versions older than 9.11 as EOL. Passing the 8.11.4 client test matrix is compatibility evidence, not an upstream security-support claim or a recommendation for new deployments.
- **EOL:** Solr versions below 9.11 are no longer updated by Apache Solr. The client does not promise active feature qualification or upstream security fixes for those lines.

Source: [Apache Solr downloads and version-support policy](https://solr.apache.org/downloads).

### Node.js

- **Actively maintained LTS:** Node.js 22.x and 24.x are in Maintenance LTS; 26.x is in Active LTS.
- **Legacy compatibility only:** Node.js 20.x reached EOL on 2026-04-30. It remains in the v4 engine range and CI temporarily for compatibility, but is not recommended for new production deployments and receives no upstream security fixes.
- The next major release should revisit removing Node 20 from the package engine range; this policy does not make that breaking change in v4.

Sources: [Node.js Release schedule](https://github.com/nodejs/Release#release-schedule) · [Node.js previous releases](https://nodejs.org/en/about/previous-releases).

## Interpreting unverified operations

An exposed action or parameter is not runtime-certified merely because it has a TypeScript model or serialization test. The API coverage page records the current triage of deferred and intentionally out-of-scope gaps. Destructive Core Admin actions and cluster-wide Collections policy mutations remain unverified until isolated runtime evidence is added; SPLITSHARD/MIGRATE still require the opt-in workflow in [#232](https://github.com/vsimko/node-solr-lambda/issues/232). Export `includeStoredFields=true` is verified specifically on Solr 10.1.0 (PR [#263](https://github.com/vsimko/node-solr-lambda/pull/263)); ReplicationHandler in-progress abort is verified on Solr 9.11.0 and 10.1.0 only, with Solr 8.11.4 explicitly unverified (PR [#264](https://github.com/vsimko/node-solr-lambda/pull/264)). Issues #258 and #259 are closed; they are historical evidence, not outstanding verification tasks.

## Reference baselines

| Solr line | Documentation baseline | Documentation |
| --- | --- | --- |
| 8.x | 8.11 | [Solr 8.11 Reference Guide](https://solr.apache.org/guide/8_11/index.html) |
| 9.x | 9.11 | [Solr 9.11 Reference Guide](https://solr.apache.org/guide/solr/9_11/index.html) |
| 10.x | 10.1 | [Solr 10.1 Reference Guide](https://solr.apache.org/guide/solr/10_1/) |

The 8.11, 9.11, and 10.1 guides describe the API families below. The Replica Management Commands sections document ADDREPLICA, MOVEREPLICA, and DELETEREPLICA. These baselines are references for review. They do not define a minimum supported patch release.

## Node.js runtime matrix

The package engine range is `^20.0.0 || ^22.0.0 || ^24.0.0 || ^26.0.0`. The CI workflow is configured for Node.js 20, 22, 24, and 26 in type checking, consumer type fixtures, unit tests, builds, and release/documentation checks. Node 20 is the legacy compatibility lane; Node 22/24/26 are the actively maintained LTS targets. The standalone Solr, authenticated Solr, and SolrCloud integration jobs combine all four Node versions with Solr 8.11.4, 9.11.0, and 10.1.0 (a 4 × 3 matrix per integration suite). PR #329 adds Node 26; its full 40-job matrix is the qualification run for that runtime.

Streaming ingestion was delivered in #300, hardened in #317, and completed with independent test coverage in #321. The final lifecycle matrix in CI run [#42392182590](https://github.com/vsimko/node-solr-lambda/actions/runs/42392182590) passed 30/30 jobs across Node.js 20/22/24 and pinned Solr 8.11.4/9.11.0/10.1.0 standalone, security-enabled, and SolrCloud matrices; the 250-document `addStream()` fixture was read back with exact count/order on all three Solr versions. The consumer/test follow-up run [#42392800998](https://github.com/vsimko/node-solr-lambda/actions/runs/42392800998) also passed 30/30. Documentation reconciliation in #325 passed the dedicated docs/API-inventory checks. This certifies the tested JSON-array ingestion behavior on those pinned images; it does not certify atomicity or behavior on other Solr releases.

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

- Target Solr server lines are 8.x, 9.x, and 10.x.
- The minimum supported patch release for each line is **not established**.
- The selected endpoint behaviors listed as Tested have passed against the pinned patch images; this does not certify every endpoint or all patch releases in a major line.
- Treat only the explicitly listed operations as **Tested**; other actions, options, and response models remain unverified.
- A successful TypeScript build, unit test, or documentation lookup is not server compatibility evidence.
- If an endpoint differs by version, record the difference here and add a focused test before changing its status.

## Integration test infrastructure

CI starts pinned official Solr images and runs standalone, security-enabled standalone, and SolrCloud integration suites on Solr 8.11.4, 9.11.0, and 10.1.0. The current workflow configuration combines four Node versions (20/22/24/26) with three Solr images in each of the three integration suites: 12 jobs per suite, 36 integration jobs total, plus four Node unit/build jobs (40 jobs total). PR #329 introduces the Node 26 lane; its CI run is the qualification evidence for that runtime. The historical 30-job matrix in PR #226 covered Node 20/22/24 only. Earlier runs such as CI #162 and #177 provide historical evidence for individual integration behaviors, but should not be read as evidence that the full matrix was already enabled at that time. The passing SolrCloud coverage includes Collections CREATE/LIST/DELETE, alias lifecycle, implicit-router shard create/delete with CLUSTERSTATUS read-back, and Streaming Expressions search. The security-enabled matrix verifies anonymous rejection on both authentication and authorization handlers, authenticated reads, authentication property mutation/read-back, malformed JSON rejection, and that negative response bodies do not echo configured credentials. Unit tests also assert request Authorization headers are not copied into client HTTP error properties.

| Solr line | Pinned Docker image |
| --- | --- |
| 8.x | `solr:8.11.4` |
| 9.x | `solr:9.11.0` |
| 10.x | `solr:10.1.0` |

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
