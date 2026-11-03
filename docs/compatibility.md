# Solr server compatibility

This page records the current client compatibility policy. It separates documentation evidence from runtime test evidence.

## Status terms

- **Documented** means the endpoint or feature appears in the official reference guide for the listed Solr documentation baseline.
- **Tested** means the exact behavior named in the runtime-test column passed against the pinned Docker image for that Solr line; it does not certify other parameters or actions.\n- **Unverified** means this repository has not run an integration test for that operation against that Solr server version.
- **Not covered** means the current typed client does not provide a dedicated method for that endpoint.

Documentation evidence does not prove that every patch release behaves in the same way.

## Reference baselines

| Solr line | Documentation baseline | Documentation |
| --- | --- | --- |
| 8.x | 8.11 | [Solr 8.11 Reference Guide](https://solr.apache.org/guide/8_11/index.html) |
| 9.x | 9.11 | [Solr 9.11 Reference Guide](https://solr.apache.org/guide/solr/9_11/index.html) |
| 10.x | 10.1 | [Solr 10.1 Reference Guide](https://solr.apache.org/guide/solr/10_1/) |

The 8.11, 9.11, and 10.1 guides describe the API families below. The Replica Management Commands sections document ADDREPLICA, MOVEREPLICA, and DELETEREPLICA. These baselines are references for review. They do not define a minimum supported patch release.

## Endpoint matrix

| Client operation | Solr 8.11 docs | Solr 9.11 docs | Solr 10.1 docs | Runtime test |
| --- | --- | --- | --- | --- |
| `query()` — `GET /solr/{core}/select` | Documented | Documented | Documented | Tested: basic query, cursorMark pagination, classic field/query/numeric-range/date-range facets, configured highlighting snippets, field grouping, collapse selection, expanded group documents, numeric Stats Component aggregates/facet breakdowns, and MoreLikeThis Search Component similar-document responses on pinned 8.11.4 / 9.11.0 / 10.1.0 images. Unverified: geofilt/bbox filter and geodist helper runtime behavior. group.func and distributed collapse behavior remain subject to Solr semantics |
| `queryJson()` — `POST /solr/{collection}/query` | Documented JSON Request API | Documented JSON Request API | Documented JSON Request API | Tested: JSON query round-trip plus nested terms/query/range JSON facets, metrics, and excludeTags domain changes on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `add()`, `update()`, `atomicUpdate()`, `delete()`, `updateCommands()` — update handlers | Documented | Documented | Documented | Tested: add, full-document update, delete by ID, atomic update, single/array JSON documents, and JSON updateCommands add + commit + persisted-document read-back on pinned 8.11.4 / 9.11.0 / 10.1.0 images. Unverified: runtime effects of `_route_` and `commitWithin` options; command variants other than the explicitly tested add + commit flow |
| `commit()`, `softCommit()`, `optimize()`, `rollback()` — update commands | Documented | Documented | Documented | Tested: hard commit, soft commit, rollback, and optimize preserving committed documents on pinned 8.11.4 / 9.11.0 / 10.1.0 images. `expungeDeletes` and `openSearcher=false` commit behavior are tested; optimize-specific `openSearcher` runtime effect remains unverified |
| `ping()` — `/admin/ping` | Documented | Documented | Documented | Tested: ping returns OK on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `schema()` — `/schema` | Documented | Documented | Documented | Tested: add-field and GET /{core}/schema/fields read-back on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `config()` — `/config` | Documented | Documented | Documented | Tested: set-user-property and GET /config/overlay userProps read-back on pinned 8.11.4 / 9.11.0 / 10.1.0 images (CI #166) |
| `coreAdmin()` — `/solr/admin/cores` | Documented | Documented | Documented | Tested: CREATE, STATUS, RELOAD, and fixture UNLOAD cleanup on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `collections()` — `/solr/admin/collections` | Documented | Documented | Documented | Tested: SolrCloud CREATE/LIST/DELETE, alias/shard/replica lifecycle, MOVEREPLICA/REBALANCELEADERS, plus BACKUP/LISTBACKUP/RESTORE/DELETEBACKUP and REQUESTSTATUS/DELETESTATUS using shared filesystem storage on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `systemInfo()` — `/solr/admin/info/system` | Documented | Documented | Documented | Tested: non-empty server metadata and at least one stable system section on pinned 8.11.4 / 9.11.0 / 10.1.0 images. Optional sections remain version/runtime-dependent |\n| `systemProperties()` — `/solr/admin/info/properties` | Documented | Documented | Documented | Tested: non-empty JVM/process properties on pinned 8.11.4 / 9.11.0 / 10.1.0 images |\n| `systemThreads()` — `/solr/admin/info/threads` | Documented | Documented | Documented | Tested: non-empty JVM thread dump on pinned 8.11.4 / 9.11.0 / 10.1.0 images |\n| `systemLogging()` — `/solr/admin/info/logging` | Documented | Documented | Documented | Tested: logger levels, loggers, or watcher metadata on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `metrics()` — `/solr/admin/metrics` | Documented | Documented | Documented | Tested: non-empty JVM registry/metric entries for JSON or a Prometheus metric declaration/sample on pinned 8.11.4 / 9.11.0 / 10.1.0; observed JSON on Solr 8/9 and Prometheus text on Solr 10.1 |
| `security()` — authentication and authorization handlers | Documented | Documented | Documented | Tested: authenticated BasicAuth/RuleBasedAuthorization, anonymous rejection, authentication/authorization GET, and authentication `set-property` read-back on pinned 8.11.4 / 9.11.0 / 10.1.0 images (CI #162) |
| `stream()` — `/stream` | Documented | Documented | Documented | Tested: Streaming Expressions search against a disposable SolrCloud collection on pinned 8.11.4 / 9.11.0 / 10.1.0 images (CI #145) |
| `export()` — `/export` | Documented | Documented | Documented | Tested: raw response with docValues sort field on pinned 8.11.4 / 9.11.0 / 10.1.0 images |
| `replication()` / `replicationFile()` — `/solr/{core}/replication` | Documented | Documented | Documented | Tested: indexversion, details, filelist (generation on newer versions / legacy indexversion on older versions), streamed filecontent, enablereplication/disablereplication, core backup, restorestatus, restore, and deletebackup on pinned 8.11.4 / 9.11.0 / 10.1.0 images. fetchindex/abortfetch (Solr 10), snappull/abort (Solr 8/9), enablepoll, and disablepoll have unit serialization coverage; an end-to-end multi-core leader/follower fetch cycle is not yet certified |
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

## Current support policy

- Target Solr server lines are 8.x, 9.x, and 10.x.
- The minimum supported patch release for each line is **not established**.
- The selected endpoint behaviors listed as Tested have passed against the pinned patch images; this does not certify every endpoint or all patch releases in a major line.
- Treat only the explicitly listed operations as **Tested**; other actions, options, and response models remain unverified.
- A successful TypeScript build, unit test, or documentation lookup is not server compatibility evidence.
- If an endpoint differs by version, record the difference here and add a focused test before changing its status.

## Integration test infrastructure

CI starts pinned official Solr images and runs standalone, security-enabled standalone, and SolrCloud integration suites on Solr 8.11.4, 9.11.0, and 10.1.0. CI #162 passed the Node.js 20/22/24 checks, standalone integration jobs, security-enabled standalone jobs, and SolrCloud jobs. The passing SolrCloud matrix includes Collections CREATE/LIST/DELETE, alias lifecycle, implicit-router shard create/delete with CLUSTERSTATUS read-back, and Streaming Expressions search (CI #177). The security-enabled matrix verifies anonymous rejection, authenticated authentication/authorization reads, and authentication property mutation/read-back.

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

CI #145 passed standalone and SolrCloud integration jobs on all three pinned Solr images. Covered behavior includes CRUD, hard/soft commit, rollback, ping, schema field lifecycle, config user properties, CoreAdmin core lifecycle, JSON Request API, optimize, system info, metrics, export, Collections CREATE/LIST/DELETE, Streaming Expressions search, and basic query/cursorMark pagination. These results do not certify every endpoint, query option, update-command variant, or action in the compatibility matrix. The typed `updateCommands()` add-command plus commit flow is separately exercised with a persisted-document read-back on all three pinned images.

## Remaining gaps and explicit non-certification

The endpoint families listed in the matrix have representative integration evidence on the three pinned images. The following narrower behaviors remain explicitly unverified and must not be described as generally Solr-8/9/10-compatible until focused tests exist:

- Geospatial `geofilt`/`bbox` filter behavior and `geodist()` helper behavior; current evidence is unit/consumer type coverage only.
- Runtime effects of update `_route_` and `commitWithin` request options; serialization is covered, but server-side routing and commit scheduling behavior are not.
- The optimize-specific runtime effect of `openSearcher`; the option is serialized but has no isolated server-side assertion.
- Generic `request()` and `requestRaw()` against arbitrary endpoint families. These are transport escape hatches, not blanket compatibility certification; each custom endpoint requires its own test.
- JSON update command variants beyond the tested `add` + `commit` + persisted-document read-back flow. Other command shapes have type/serialization coverage but are not all independently exercised against live Solr.
- Collections snapshot/backup operations and response models, plus cluster-state response models.
- Function grouping and distributed collapse behavior beyond the documented Solr semantics and the specific standalone cases tested.

The machine-readable inventory is authoritative for operation-level status. Keep `integrationTests: not-run` / `versions: unverified` for generic transport methods, and record these narrower gaps in the operation notes rather than promoting the whole API family to tested.

## Reference notes

- [Solr 8.11.4 release notes](https://solr.apache.org/docs/8_11_4/changes/Changes.html) record the final 8.11 patch release and security-related changes.
- [Solr 9.11.1 release notes](https://solr.apache.org/docs/9_11_0/changes/Changes.html) record V2 API additions and changes in the 9.11 line.
- [Solr 10.1 upgrade notes](https://solr.apache.org/guide/solr/10_1/upgrade-notes/major-changes-in-solr-10.html) describe the V2 API, PKI authentication, and JWT default changes.
- [Solr 10.1 release notes](https://solr.apache.org/docs/10_1_0/changes/Changes.html) record release-specific changes.
