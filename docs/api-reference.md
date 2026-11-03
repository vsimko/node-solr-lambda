# Public API reference

This page documents the package root entry point. Runtime and declaration files are produced by `npm run build`; the release check verifies that the ESM, CommonJS, and top-level TypeScript entry points declared in `package.json` exist. The documentation check compares this method list with the public `SolrClient` and `SolrTransport` class declarations, and compares every API inventory entry with those declarations.

Install with `npm install node-solr-lambda`, then import `createSolrClient` from `node-solr-lambda`. The factory returns a `SolrClient`. Configure exactly one of `core` or `collection` for scoped operations. See [getting started](getting-started.md) and [configuration](configuration.md).

## Client methods

All methods below are available on `SolrClient`. Unless otherwise noted, methods return a Promise containing the parsed Solr response. Generic response parameters allow consumers to provide application-specific response types.

| Method | Purpose | Detailed guide |
| --- | --- | --- |
| `SolrClient.query()` | Execute a typed Select query | [Query API](query.md) |
| `SolrClient.queryJson()` | Execute the JSON Request API | [Query API](query.md) |
| `SolrClient.add()` | Add documents | [Update API](update.md) |
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
| `SolrClient.stream()` | Execute a Streaming Expression | [Streaming and Export](export.md) |
| `SolrClient.export()` | Return the raw Export handler response | [Streaming and Export](export.md) |
| `SolrClient.exportStream()` | Return the Export response body as a byte stream | [Streaming and Export](export.md) |
| `SolrClient.request()` | Send a custom request through the shared transport | [Raw requests](raw-requests.md) |
| `SolrClient.requestRaw()` | Send a custom request and retain the Fetch Response | [Raw requests](raw-requests.md) |

## Root exports

The root entry point exports `createSolrClient`, `SolrClient`, the public error classes, query helper functions, and the public TypeScript models. Type exports include client configuration and request controls; query, facet, grouping, highlighting, statistics, and JSON Request API models; update and atomic-update models; Schema, Config, CoreAdmin, and Collections command models; replication and backup/restore models; Export models; and error/validation models.

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

The full operation inventory, type-coverage notes, unit-test status, and Solr 8/9/10 evidence are maintained in the [API coverage matrix](api-coverage.md) and [machine-readable API inventory](api-inventory.json). See [compatibility](compatibility.md) before relying on behavior that is marked unverified. Generic `request()` and `requestRaw()` are escape hatches and do not imply typed support for arbitrary Solr handlers.

## Module and declaration entry points

The package publishes ESM and CommonJS runtime entry points and conditional declarations for both module systems. The top-level `types` field remains available for tooling that does not resolve NodeNext package conditions. The package build creates these files; CI checks that each path declared by `package.json` exists after building.

