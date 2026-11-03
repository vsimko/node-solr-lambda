# Public API review (v4)

This review defines the package-root compatibility boundary for the v4 stable release. It covers runtime exports, declaration exports, inherited client methods, generic escape hatches, and request controls. It is an explicit design decision, not a claim that every Solr handler has full type or runtime certification.

## Root export decisions

| Export family | Decision | Rationale |
| --- | --- | --- |
| `createSolrClient`, `SolrClient` | Stable | Primary construction and client surface. |
| `SolrHttpError`, `SolrNetworkError`, `SolrTimeoutError`, `SolrAbortError`, `SolrValidationError` | Stable | Typed error contract used by public operations. |
| Query helpers (`solrSort`, `solrFieldAlias`, `solrFields`, `solrFunction`, `solrLocalParams`, `solrExcludeTags`, `solrFilter`, `solrGeofilt`, `solrBbox`, `solrGeoDistance`) | Stable | Pure query-expression builders; input validation and escaping behavior are covered by tests. |
| Query, update, facet, grouping, highlighting, statistics, JSON Request, Schema, Config, CoreAdmin, Collections, replication, Export, Metrics, System, Security, and validation models | Stable, operation-scoped | Public types describe named supported operations. Version-specific or untested behavior remains qualified in the compatibility matrix. |
| `SolrClient.request()` and `requestRaw()` | Stable escape hatches | Deliberately generic; do not imply typed support for arbitrary handlers. |
| `SolrClient.security()` | Stable escape hatch, typed area selector | Authentication/authorization payloads remain generic until operation-specific models are complete. |
| `SolrClient.ping()`, `coreAdmin()` non-STATUS responses, and unmodeled collection action responses | Stable generic response escape hatches | Generic response parameters are intentional because response shapes are action/version dependent; named common operations receive specific defaults where established. |
| `SolrTransport`, request signal internals, URL/serialization helpers | Internal; not package-root exports | Transport implementation is not an extension API. |
| `SolrClient.clientConfig` | Internal; no public accessor | Exposing this object leaked configured Basic/Bearer credentials and arbitrary request headers. It is now a true ECMAScript private field. |
| Incremental Streaming Expressions tuple streaming | Not supported / not exported | `stream()` parses a complete JSON response; use `export()` / `exportStream()` for raw byte streaming. |

No public export is currently designated experimental. APIs with incomplete operation or version evidence remain stable at the documented surface but carry explicit limitations in the API inventory and compatibility guide; they are not silently promoted to broader guarantees.

## SolrClient method review

| Method | Public contract | Generic / overload decision |
| --- | --- | --- |
| `query<T>()`, `queryJson<T>()` | Typed request models, parsed response | Generic response override is intentional; JSON Request overload rejects ambiguous legacy `facet` shape. |
| `add<T>()`, `update<T>()`, `updateCommands<T>()`, `atomicUpdate<...>()`, `delete<T>()`, `commit<T>()`, `softCommit<T>()`, `optimize<T>()`, `rollback<T>()` | Typed update commands/options | Default to `SolrUpdateResponse`; `softCommit` overload separates options from request controls. |
| `ping<T>()` | Health endpoint | Generic response retained because handler/plugin response can vary. |
| `schema<T>()`, `config<T>()` | Typed command unions | Default to named command response models. |
| `getConfig<T>()`, `getConfigOverlay<T>()` | Typed read operations | Default to effective-config and overlay response models. |
| `coreAdmin<T>()` | Action-specific request params | `STATUS` has typed params; response remains generic pending full action response models. |
| `collections<T>()` | Action-specific request params and response defaults for backup/async actions | Common list/status and less-established action responses remain generic. |
| `replication()` | Command-specific parameter and response types | Overloads specialize `filelist`, `deletebackup`, and other command responses. |
| `replicationFile()` | Raw `Response` | Intentionally raw file-content endpoint. |
| `systemInfo<T>()`, `systemProperties<T>()`, `systemThreads<T>()`, `systemLogging<T>()`, `metrics<T>()` | Named response defaults | Generic response override retained for forward compatibility. |
| `security<T>()` | Authentication/authorization area plus generic command | Deliberate escape hatch; model coverage remains tracked in Issues #86–#88. |
| `stream<T>()` | Streaming Expressions JSON response | Generic override allows expression-specific tuple shapes; not incremental. |
| `export()` | Raw `Response` | Raw response required for writer-specific byte formats. |
| `exportStream()` | `ReadableStream<Uint8Array>` | Explicit byte stream; preserves Fetch stream backpressure. |
| `request<T>()`, `requestRaw()` | Shared transport escape hatches | Generic parsed response or raw Fetch response; path and body remain caller-owned. |

The public `SolrClient` inherits `request()` and `requestRaw()` intentionally. The transport's URL resolution, validation, retry, authorization, signal lifecycle, and configuration storage are implementation details. `endpoint()` is protected for the client's internal domain routing, not a supported consumer extension point.

## Request-control contract

`RequestControlOptions` is accepted by operations that use the shared transport. Its supported controls are cancellation (`signal`), per-request timeout (`timeoutMs`), custom headers, retry override/policy, and operation-specific validation key where exposed. Client-wide defaults are configured through `SolrClientConfig` (`timeoutMs`, `retry`, `headers`, `requestDefaults`, `auth` or username/password, and optional validation). Authentication values are not exposed on the constructed client.

`RequestOptions` used by `request()` / `requestRaw()` additionally supports HTTP method, query parameters, body, headers, cancellation, timeout, retry, and operation key. Raw string bodies are sent unchanged; callers must set their own content type.

## Compatibility and migration

- v4 is a Fetch-based `SolrClient` API and is not source-compatible with the v3 Axios/function API. Applications must migrate to `createSolrClient()` and the documented instance methods.
- No undocumented transport subclassing or access to internal client configuration is supported.
- Custom response generics are preserved for existing consumers; default response types become more specific only where the corresponding operation has a named public model.
- `request()` and `requestRaw()` remain the forward-compatible escape hatches for Solr handlers not yet modeled by this package.
- This review does not certify every operation on every Solr minor version; use the compatibility matrix for exact evidence.

## Consumer verification

`test/public-api-types.ts` verifies package-root imports, helper usage, typed client construction, and the absence of a root export for `SolrTransport`. It also asserts at compile time that `clientConfig` is not accessible. `test/public-api.test.ts` verifies that the runtime client instance does not expose its internal configuration or credentials.
