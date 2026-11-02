# Migration from v3 to v4

Version 4 is a TypeScript-first redesign, not a drop-in update to the v3 functional API. The package name remains `node-solr-lambda`, but client construction, configuration, endpoint methods, request options, and error handling have changed. Plan a source migration and run the application's integration tests before deploying.

## Runtime and installation

| | v3 | v4 |
| --- | --- | --- |
| Node.js | `>=8` | Node.js 20, 22, or 24 |
| HTTP transport | Axios | Node.js built-in Fetch API |
| Runtime dependencies | Axios | None; Zod is optional for runtime validation |
| Module format | CommonJS | ESM and CommonJS exports |
| Main API style | `prepareSolrClient(core, config)` functional object | `createSolrClient(config)` returning a `SolrClient` instance |

Install v4 and update the Node.js runtime before changing application code:

```sh
npm install node-solr-lambda
```

## 1. Construct the client with an explicit configuration object

v3 accepted the core as the first argument and used `hostname`, `port`, and `protocol` configuration fields. v4 uses a single configuration object with `baseUrl` and either `core` or `collection`.

**v3**

```js
const { prepareSolrClient } = require("node-solr-lambda");
const solr = prepareSolrClient("books", {
  hostname: "localhost",
  port: 8983,
  protocol: "http"
});
```

**v4**

```ts
import { createSolrClient } from "node-solr-lambda";

const solr = createSolrClient({
  baseUrl: "http://localhost:8983",
  core: "books"
});
```

Do not mechanically copy v3 configuration keys. Review request defaults, headers, authentication, timeout, and retry settings and move them to the corresponding v4 client options. Set one target (`core` or `collection`) explicitly.

## 2. Replace v3 helper methods with typed v4 methods

The v3 client returned a functional object with convenience methods such as `addField()`, `deleteField()`, and `solrListFields()`. v4 groups operations by Solr API family and exposes typed command models.

| v3 API | v4 direction |
| --- | --- |
| `solr.query(query)` | `solr.query(query)`; review query option names and use the typed v4 query model |
| `solr.add(document)` | `solr.add(document)`; arrays are also supported |
| `solr.delete(deleteQuery)` | `solr.delete(command)`; use the v4 `SolrDelete` command shape |
| `solr.commit()` | `solr.commit(options?)`; commit behavior is explicit through `SolrCommitOptions` |
| `solr.addField(field)` | `solr.schema({ "add-field": field })` |
| `solr.addFieldType(fieldType)` | `solr.schema({ "add-field-type": fieldType })` |
| `solr.deleteField(name)` | `solr.schema({ "delete-field": { name } })` |
| `solr.deleteFieldType(name)` | `solr.schema({ "delete-field-type": { name } })` |
| `solr.config(data)` | `solr.config(command)`; use the typed Config API command union |
| `defaultConfig` / `mergeConfig` exports | No package-level equivalents; define and compose application configuration explicitly (for example, with object spread) |
| `solr.configAutoEnableFields(enable)` | `solr.config({ "set-user-property": { "update.autoCreateFields": String(enable) } })` |
| `prepareCoreAdmin(config).ping(core)` | Configure `core` and call `solr.ping()` |
| `prepareCoreAdmin(config).solrDeleteCore(core)` | `solr.coreAdmin("UNLOAD", { core, deleteIndex: true, deleteDataDir: true, deleteInstanceDir: true })` |

Some v3 helpers do not have a one-to-one convenience method. For example, inspect the v4 Schema API and endpoint inventory before replacing `solrListFields()`; use a typed API method where available or the documented raw-request escape hatch for an endpoint not yet wrapped.

## 3. Review query and update request shapes

v3 sent query requests through its older `/api/cores/{core}/query` endpoint and used the legacy query object shape. v4's `query()` targets the standard Solr `/select` handler and exposes common parameters as typed properties. Do not assume every nested v3 query object has the same v4 serialization.

For JSON Request API queries and JSON Facet requests, use `queryJson()` and the v4 JSON request model. For classic facets, use the typed `facets` property on `query()`. Compare examples in the [Query API guide](query.md).

v4 separates update operations more explicitly:

- `add()` and `update()` handle one document or an array.
- `atomicUpdate()` handles field-level modifiers.
- `updateCommands()` accepts typed JSON update command objects.
- `delete()` accepts the v4 delete command model.
- `commit()`, `softCommit()`, `optimize()`, and `rollback()` expose their relevant options.

The v3 client applied default query settings such as `commitWithin` and `overwrite` in its legacy configuration. Do not assume those defaults are carried over: review the v4 operation options and configure required behavior explicitly.

## 4. Update imports and module usage

v3 examples use CommonJS:

```js
const { prepareSolrClient } = require("node-solr-lambda");
```

v4 supports both ESM and CommonJS:

```ts
import { createSolrClient } from "node-solr-lambda";
```

```js
const { createSolrClient } = require("node-solr-lambda");
```

TypeScript consumers should use Node-compatible module resolution (for example, `NodeNext`) to select the matching declarations. See [getting started](getting-started.md).

## 5. Replace Axios-specific assumptions and error handling

v4 uses the Fetch API internally. Like the v3 helpers, typed methods return the Solr response payload rather than an Axios response wrapper. The transport and error contracts are different, however: raw methods (`requestRaw()`, `export()`, and `replicationFile()`) return a Fetch `Response` when streaming or non-JSON content is required.

HTTP errors throw `SolrHttpError`; network errors, timeouts, caller cancellation, and validation failures use the corresponding exported `SolrNetworkError`, `SolrTimeoutError`, `SolrAbortError`, and `SolrValidationError` classes. Replace Axios-specific checks such as `error.response.status` with these v4 error classes and their documented properties. See [error handling](errors.md).

Per-request cancellation and timeouts use `AbortSignal` and `timeoutMs`. Retry behavior is opt-in and should be configured deliberately; non-idempotent update methods are not retried by default.

## 6. Runtime validation is optional

v3 relied on JSDoc annotations for editor type assistance. v4 ships TypeScript declarations and named public types. Runtime validation is separate and disabled by default. If the application uses Zod schemas, install Zod as an optional peer and configure input/output schemas; otherwise no Zod installation is required. See [runtime validation](validation.md).

## Migration checklist

- [ ] Upgrade the runtime to Node.js 20, 22, or 24.
- [ ] Replace `prepareSolrClient()` and `prepareCoreAdmin()` with `createSolrClient()`.
- [ ] Convert `hostname`/`port`/`protocol` configuration to `baseUrl`; set `core` or `collection`.
- [ ] Review legacy defaults, especially `commitWithin` and `overwrite`, and configure required behavior explicitly.
- [ ] Replace schema/config/core-admin helpers with typed v4 command methods.
- [ ] Review query and JSON Facet request shapes against the v4 guides.
- [ ] Replace Axios response/error handling with parsed payloads and v4 error classes.
- [ ] Configure retries and cancellation explicitly where needed.
- [ ] Run type checks, unit tests, and application integration tests against the Solr versions you operate.

## Compatibility notes

The v4 client targets Solr 8.x, 9.x, and 10.x, but compatibility is certified per operation and exact tested behavior. Check the [compatibility matrix](compatibility.md) and [endpoint inventory](endpoint-inventory.md); do not infer support for arbitrary handlers or parameters from the raw request methods.
