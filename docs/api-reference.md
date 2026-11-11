# Public API reference

This page documents the package root entry point. Runtime and declaration files are produced by `npm run build`; the release check verifies that the ESM, CommonJS, and top-level TypeScript entry points declared in `package.json` exist. The documentation check compares this method list with the public `SolrClient` and `SolrTransport` class declarations, and compares every API inventory entry with those declarations.

Install with `npm install node-solr-lambda`, then import `createSolrClient` from `node-solr-lambda`. The factory returns a `SolrClient`. Configure exactly one of `core` or `collection` for scoped operations. See [getting started](getting-started.md) and [configuration](configuration.md).

## Client methods

All methods below are available on `SolrClient`. Unless otherwise noted, methods return a Promise containing the parsed Solr response. Generic response parameters allow consumers to provide application-specific response types.

| Method | Purpose | Detailed guide |
| --- | --- | --- |
| `SolrClient.query()` | Execute a typed Select query with optional SpellCheck and Suggester components | [Query API](query.md), [SpellCheck](spellcheck.md), [Suggester](suggester.md) |
| `SolrClient.queryJson()` | Execute the JSON Request API | [Query API](query.md) |
| `SolrClient.get()` | Retrieve the latest document version by unique key | [RealTime Get API](realtime-get.md) |
| `SolrClient.add()` | Add documents from one document or a buffered array | [Update API](update.md) |
| `SolrClient.addStream()` | Stream documents from an `AsyncIterable` with backpressure | [Update API](update.md) |
| `SolrClient.update()` | Replace documents | [Update API](update.md) |
| `SolrClient.updateCommands()` | Submit typed JSON update commands | [Update API](update.md) |
| `SolrClient.atomicUpdate()` | Apply typed atomic field modifiers | [Update API](update.md) |
| `SolrClient.delete()` | Delete documents by ID or query | [Update API](update.md) |
| `SolrClient.commit()` | Commit pending updates | [Update API](update.md) |
| `SolrClient.softCommit()` | Make updates visible without a hard commit | [Update API](update.md) |
| `SolrClient.optimize()` | Request index segment optimization | [Update API](update.md) |
| `SolrClient.rollback()` | Roll back pending updates | [Update API](update.md) |
| `SolrClient.ping()` | Check Solr health | [Administration](administration.md) |
| `SolrClient.schema()` | Execute typed Schema API commands | [Schema API](schema.md) |
| `SolrClient.config()` | Execute typed Config API commands | [Config API](config.md) |
| `SolrClient.getConfig()` | Read the effective configuration | [Config API](config.md) |
| `SolrClient.getConfigOverlay()` | Read the persisted Config API overlay | [Config API](config.md) |
| `SolrClient.coreAdmin()` | Execute CoreAdmin actions | [Administration](administration.md) |
| `SolrClient.collections()` | Execute Collections API actions | [Administration](administration.md) |
| `SolrClient.replication()` | Execute ReplicationHandler commands | [Replication API](replication.md) |
| `SolrClient.replicationFile()` | Read ReplicationHandler file content | [Replication API](replication.md) |
| `SolrClient.systemInfo()` | Read Solr system information | [Administration](administration.md) |
| `SolrClient.systemProperties()` | Read JVM and process properties | [Administration](administration.md) |
| `SolrClient.systemThreads()` | Read JVM thread diagnostics | [Administration](administration.md) |
| `SolrClient.systemLogging()` | Read logger configuration and levels | [Administration](administration.md) |
| `SolrClient.metrics()` | Read Solr metrics | [Administration](administration.md) |
| `SolrClient.security()` | Read or update authentication and authorization settings | [Administration](administration.md) |
| `SolrClient.stream()` | Execute a Streaming Expression and parse its JSON response | [Streaming Expressions](streaming.md) |
| `SolrClient.export()` | Return the raw Export handler response | [Streaming and Export](export.md) |
| `SolrClient.exportStream()` | Return the Export response body as a byte stream | [Streaming and Export](export.md) |
| `SolrClient.request()` | Send a custom request through the shared transport | [Raw requests](raw-requests.md) |
| `SolrClient.requestRaw()` | Send a custom request and retain the Fetch Response | [Raw requests](raw-requests.md) |

## Explicit Solr V2 namespace

The client also exposes an opt-in `client.v2` namespace. It uses the same configured transport as V1 but requires V2 paths explicitly; existing V1 methods never switch routes automatically.

| Method | Purpose | Contract |
| --- | --- | --- |
| `SolrV2Client.request()` | Send a JSON V2 request and parse its response | Caller supplies the V2-specific response generic and request body; query parameters use `options.query`. |
| `SolrV2Client.requestRaw()` | Send a V2 request and retain the raw Fetch Response | For streaming, custom response writers, or caller-owned parsing. |
| `SolrV2CoreAdminClient.list()` | List status for all cores on one node | `GET /api/cores/`; optional `indexInfo` query parameter. |
| `SolrV2CoreAdminClient.status()` | Read status for one core | `GET /api/cores/{core}`; optional `indexInfo` query parameter. |
| `SolrV2CoreAdminClient.reload()` | Reload a core | `POST /api/cores/{core}/reload`. |
| `SolrV2CoreAdminClient.rename()` | Rename a core | `POST /api/cores/{core}/rename` with `{ to }` JSON body. |
| `SolrV2CoreAdminClient.unload()` | Unload a core | `POST /api/cores/{core}/unload`; data/index deletion flags are opt-in. |
| `SolrV2CollectionsClient.list()` | List SolrCloud collection names | `GET /api/collections`. |
| `SolrV2CollectionsClient.status()` | Read one collection's status | `GET /api/collections/{collection}`; supports `coreInfo`, `segments`, `fieldInfo`, and `sizeInfo` flags. |
| `SolrV2ClusterClient.status()` | Read SolrCloud cluster status | `GET /api/cluster`; documented from Solr 9.11. |
| `SolrV2AliasesClient.list()` | List alias names and collection mappings | `GET /api/aliases`; read-only V2 route. |
| `SolrV2AliasesClient.status()` | Read one alias and its collection targets/properties | `GET /api/aliases/{alias}`; read-only V2 route. |

The generic request methods require a relative `/api/…` path. Dot-segment traversal, encoded separators, query strings, and fragments in the path are rejected. V2 requests resolve at the server-root `/api` mount rather than under the V1 `/solr` webapp context; a configured reverse-proxy prefix is retained while a terminal `/solr` segment is removed. The test-only `fetchV2Introspection()` helper fetches an endpoint's `/_introspect` document without deriving public types from it. Query parameters must be supplied through `RequestOptions.query`. The generic request methods remain an escape hatch. Typed Core Admin V2 methods are runtime-tested on Solr 9.11.0 and 10.1.0; Solr 8.11.4 has a separate V2 API guide documenting the Core Admin route family; runtime verification on the pinned 8.11.4 image is pending. These methods are for standalone/user-managed cores, not SolrCloud collections. The new Collections list operation is tested on the three pinned SolrCloud baselines; per-collection status is available from Solr 9.3 and cluster GET status from Solr 9.11. Runtime evidence passed in CI run #43008748363: list on 8.11.4/9.11.0/10.1.0, status and cluster GET on 9.11.0/10.1.0. See the [V2 compatibility strategy](solr-v2-api-strategy.md).

## Root exports

The root entry point exports `createSolrClient`, `SolrClient`, `SolrV2Client`, `SolrV2CoreAdminClient`, `SolrV2CollectionsClient`, `SolrV2ClusterClient`, `SolrV2AliasesClient`, the public error classes, query helper functions, and the public TypeScript models. Type exports include client configuration, the optional `SolrJsonCodec` parser/serializer contract, request controls, and distinct V2 Core Admin status/rename/unload contracts, V2 Collections/cluster discovery contracts, and V2 alias list/detail response contracts; query, facet, grouping, highlighting, statistics, SpellCheck and Suggester component models, and JSON Request API models; update and atomic-update models; Schema, Config, CoreAdmin, and Collections command plus alias/cluster-status response models; replication and backup/restore models; Export, Metrics, System, Security, and Streaming Expressions models; and error/validation models.

Use named imports from the package root:

```ts
import { createSolrClient, SolrHttpError, solrFilter } from "node-solr-lambda";
import type { SolrClientConfig, SolrQuery, SolrUpdateOptions } from "node-solr-lambda";

const config: SolrClientConfig = { baseUrl: "http://localhost:8983", core: "books" };
const solr = createSolrClient(config);
const query: SolrQuery = { query: "*:*", limit: 10 };
const updateOptions: SolrUpdateOptions = { commitWithin: 1_000 };

try {
  await solr.query(query);
  await solr.add({ id: "book-1", title: "Solr in Action" }, updateOptions);
} catch (error) {
  if (error instanceof SolrHttpError) console.error(error.status, error.message);
  throw error;
}
```

The full operation inventory, type-coverage notes, unit-test status, and Solr 8/9/10 evidence are maintained in the [API coverage matrix](api-coverage.md) and [machine-readable API inventory](api-inventory.json). The stable/experimental/internal decision for every root export and the client method review are recorded in the [public API review](public-api-review.md). See [compatibility](compatibility.md) before relying on behavior that is marked unverified. Generic `request()` and `requestRaw()` are escape hatches and do not imply typed support for arbitrary Solr handlers.

## Module and declaration entry points

The package publishes ESM and CommonJS runtime entry points and conditional declarations for both module systems. The top-level `types` field remains available for tooling that does not resolve NodeNext package conditions. The package build creates these files; CI checks that each path declared by `package.json` exists after building.

