# Client architecture

The v4 client uses one HTTP transport and separate API modules. Public methods on `SolrClient` are a stable facade. Each method delegates request construction to one domain module.

## Modules

| Module | Responsibility |
| --- | --- |
| `transport.ts` | Fetch, base URL resolution, Basic/Bearer authentication, headers, request defaults, retries, combined caller cancellation and timeout signals, response-stream cleanup, validation, JSON parsing, and errors. |
| `apis/query.ts` | Standard query and JSON Request API calls. |
| `apis/update.ts` | Add, update, delete, commit, soft commit, optimize, and rollback. |
| `apis/schema.ts` | Schema API requests. |
| `apis/config.ts` | Config API requests. |
| `apis/core-admin.ts` | Core Admin actions. |
| `apis/collections.ts` | SolrCloud Collections actions. |
| `apis/security.ts` | Authentication and authorization API requests. |
| `apis/system.ts` | System information requests. |
| `apis/metrics.ts` | Metrics API requests. |
| `apis/advanced.ts` | Streaming Expressions and raw export responses. |
| `client.ts` | Public `SolrClient` facade and method signatures. |

## Request conventions

- API modules receive the shared transport and the endpoint path from the client facade.
- API modules call `request()` for JSON responses. The transport applies headers, authentication, timeout, optional validation, JSON parsing, and `SolrHttpError` handling.
- API modules call `requestRaw()` only when the caller needs a raw Fetch `Response`, such as export. The transport keeps cancellation active until the response stream is consumed or cancelled.
- Every API method sets an operation name. The validation layer uses this name to select input and output schemas.
- API modules do not create their own Fetch instances or parse HTTP errors.
- Keep public methods on `SolrClient` backward-compatible when changing an internal module.

## Add an API operation

1. Add request construction to the module for that API area.
2. Delegate from `SolrClient` in `client.ts`.
3. Reuse `request()` or `requestRaw()`. Do not add a second HTTP transport.
4. Add tests for the path, method, query parameters, body, and error behavior.
5. Update [API coverage](api-coverage.md) and the [Solr compatibility matrix](compatibility.md).
6. Mark Solr 8/9/10 support as unverified until the relevant integration tests pass.

## Compatibility

The module structure does not certify server compatibility. See the [Solr compatibility matrix](compatibility.md) for documented endpoint availability and runtime test status.
