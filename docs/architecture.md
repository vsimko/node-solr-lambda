# Client architecture

The client uses one HTTP transport and separate API modules. Public methods on `SolrClient` are a stable facade. Each method delegates request construction to one domain module.

## Design priorities

1. **TypeScript IntelliSense is part of the public API.** Consumers should discover supported Solr parameters, accepted values, nested options, and response shapes in their IDE.
2. **Prefer explicit models.** Use named interfaces, literal unions, discriminated unions, and typed helpers for supported Solr features. Avoid broad index signatures on primary option types because they hide misspellings and weaken completion.
3. **Keep an explicit escape hatch.** Unsupported or uncommon Solr parameters must remain possible through a clearly named custom-parameter property or raw request method.
4. **Keep transport concerns centralized.** API modules must share authentication, timeout, retry, validation, and error handling.
5. **Document version differences.** A type must not imply that an option behaves identically on Solr 8, 9, and 10 when it does not.

The autocomplete-first work is tracked in [Issue #121](https://github.com/vsimko/solr-ts-client/issues/121). Query-specific follow-up work is tracked in Issues #44–#59.

## Modules

| Module | Responsibility |
| --- | --- |
| `transport.ts` | Fetch, base URL resolution, Basic/Bearer authentication, headers, request defaults, retries, combined caller cancellation and timeout signals, response-stream cleanup, validation, JSON parsing, and errors. |
| `errors.ts` | Structured HTTP, network, timeout, abort, and validation error classes exposed by the public API. |
| `types.ts` | Shared public configuration, request/response, query, administration, and validation contracts. |
| `query-helpers.ts` | Composable helpers for sort expressions, field lists, filters, local parameters, functions, and spatial query syntax. |
| `v2.ts` | Explicit V2 namespace over the shared transport, with V2 path validation, typed Core Admin operations, and read-only Collections/cluster discovery. |
| `apis/query.ts` | Standard query and JSON Request API calls. |
| `apis/get.ts` | RealTime Get request serialization and single-/multi-ID retrieval. |
| `apis/update.ts` | Add, update, delete, commit, soft commit, optimize, and rollback. |
| `apis/schema.ts` | Schema API requests. |
| `apis/config.ts` | Config API requests. |
| `apis/core-admin.ts` | Core Admin actions. |
| `apis/collections.ts` | SolrCloud Collections actions. |
| `apis/security.ts` | Authentication and authorization API requests. |
| `apis/system.ts` | System information requests. |
| `apis/metrics.ts` | Metrics API requests. |
| `apis/replication.ts` | Typed ReplicationHandler JSON commands and raw replication-file responses. |
| `apis/advanced.ts` | Streaming Expressions and raw export responses. |
| `client.ts` | Public `SolrClient` facade, V1 method signatures, and composition of API modules over the shared transport. |

## Request conventions

- API modules receive the shared transport and endpoint path from the client facade.
- API modules call `request()` for JSON responses. The transport applies headers, authentication, timeout, optional validation, JSON parsing, and typed error handling.
- API modules call `requestRaw()` only when the caller needs a raw Fetch `Response`, such as export. The transport keeps cancellation active until the response stream is consumed or cancelled.
- Every API method sets an operation name. The validation layer uses this name to select input and output schemas.
- API modules do not create their own Fetch instances or parse HTTP errors.
- Keep public methods on `SolrClient` backward-compatible when changing an internal module, unless an intentional breaking change is approved and documented.

## Request controls

Typed client methods accept a final `RequestControlOptions` argument for per-request timeout, caller `AbortSignal`, and request-specific headers. The caller signal and timeout are combined; the first one to fire cancels the request.

- Caller cancellation throws `SolrAbortError`.
- A timeout throws `SolrTimeoutError`.
- The timeout remains active while a JSON response body is consumed.
- For `export()`, cancellation and timeout remain active until the returned response stream is consumed or cancelled.

See [error handling](errors.md) for error properties and handling guidance.

## Type model guidelines

- Prefer named exported types over anonymous `Record<string, unknown>` parameters.
- Model common values as literal unions when the Solr contract defines a finite set.
- Use nested interfaces for nested JSON APIs such as JSON Facet API.
- Use generics for caller-owned document types and typed response sections.
- Use a separate `params`/equivalent escape hatch rather than an unrestricted index signature on primary option objects.
- Add compile-time consumer examples that demonstrate completion-friendly property names and catch misspelled keys.
- Keep raw strings available where Solr intentionally accepts an expressive query language, such as query expressions and sort syntax.

## Add an API operation

1. Add request construction to the module for that API area.
2. Delegate from `SolrClient` in `client.ts`.
3. Reuse `request()` or `requestRaw()`. Do not add a second HTTP transport.
4. Add tests for the path, method, query parameters, body, and error behavior.
5. Add consumer-facing TypeScript compile tests for valid options and representative invalid keys.
6. Update [API coverage](api-coverage.md), the [Solr compatibility matrix](compatibility.md), and the [roadmap](roadmap.md).
7. Mark Solr 8/9/10 support as unverified until the relevant integration tests pass.

## Compatibility

The module structure does not certify server compatibility. See the [Solr compatibility matrix](compatibility.md) for documented endpoint availability and runtime test status.

## GitHub Pages website

The public project website architecture and generated-data ownership are recorded in [ADR 0001](adr/0001-github-pages-site.md). Its versioned model is defined by the [website data contract](site-data-contract.md) and [JSON Schema](site-data.schema.json). Website tooling is build-time only and does not add package runtime dependencies.
