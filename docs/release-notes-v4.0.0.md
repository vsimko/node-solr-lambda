# v4.0.0 — Release notes (draft)

> **Draft only.** This document is not a release announcement. No stable v4.0.0 tag or npm publication is authorized by this draft. Finalize it only after the release gates below pass.

## Highlights

Version 4 is a TypeScript-first redesign of node-solr-lambda. It replaces the v3 functional/Axios client with a Fetch-based `SolrClient`, typed request and response contracts, and a broader set of Solr API wrappers.

- **Modern runtime and package:** Node.js 20, 22, and 24; ESM and CommonJS exports; no required runtime dependencies. Zod is an optional peer used only when runtime validation is enabled.
- **Transport:** Basic/Bearer authentication, custom headers and Fetch implementations, request defaults, timeouts, AbortSignal cancellation, opt-in retry policy, structured error classes, and raw/streaming request methods.
- **Query and documents:** Typed query parser options, filters, sorting, cursor pagination, classic and JSON facets, highlighting, grouping, stats, MoreLikeThis, debug/explain and spatial helpers; document add/update/delete, atomic updates, JSON update commands, and explicit commit/soft-commit/optimize behavior.
- **Administration:** Typed Schema, Config, Core Admin, Collections, Security, Metrics, System diagnostics, Export, ReplicationHandler, and backup/restore APIs. The Collections surface includes typed replica/shard lifecycle, aliases, cluster status, and V1 MIGRATE contracts.
- **Developer experience:** Package-root TypeScript exports, action-specific parameter models, typed response envelopes, ESM/CommonJS declarations, compile-time consumer fixtures, and a machine-readable API inventory.
- **Safety and compatibility evidence:** Operation-specific documentation and integration coverage against pinned Solr 8.11.4, 9.11.0, and 10.1.0 images. Untested or destructive operations are explicitly identified rather than described as universally verified.

## Breaking changes from v3

Version 4 is not source-compatible with the v3 functional API.

- Replace `prepareSolrClient(core, config)` with `createSolrClient({ baseUrl, core })` or `createSolrClient({ baseUrl, collection })`.
- Replace legacy `hostname`, `port`, and `protocol` configuration with an explicit `baseUrl` and one target (`core` or `collection`).
- Replace Axios-specific assumptions with the built-in Fetch transport. Typed methods return parsed Solr payloads; raw methods return a Fetch `Response` where streaming or non-JSON content is needed.
- Replace legacy helper calls with API-family methods such as `schema()`, `config()`, `coreAdmin()`, `collections()`, and typed document/query methods.
- Review query, update, and default parameter shapes rather than assuming v3 serialization or defaults are preserved. In particular, configure required `commitWithin` and overwrite behavior explicitly.
- Replace Axios error inspection with `SolrHttpError`, `SolrNetworkError`, `SolrTimeoutError`, `SolrAbortError`, and `SolrValidationError`.
- Upgrade the runtime baseline to Node.js 20 or later (the tested CI matrix is 20/22/24).

Use the [v3-to-v4 migration guide](migration-v3-to-v4.md) for code examples and the application migration checklist.

## Compatibility and limitations

The compatibility claim is per operation and tested behavior, not blanket certification of every endpoint, parameter, plugin, or Solr patch release. The pinned integration matrix is Solr 8.11.4, 9.11.0, and 10.1.0. Consult the [compatibility matrix](compatibility.md), [endpoint inventory](endpoint-inventory.md), and per-action [Collections API coverage](collections-api-coverage.md).

Examples of intentionally unverified behavior include long-running/destructive shard split and migration actions, selected administrative actions that could disrupt shared CI state, and plugin- or deployment-specific behavior. Review the relevant API documentation before using those operations in production.

## Release gates

- [x] Package metadata, packed-tarball consumer checks, ESM/CommonJS imports, declarations, and optional-Zod behavior reviewed in PR #220.
- [x] Public API surface and export decisions reviewed in PR #213 / Issue #108.
- [x] Complete and merge the focused implementation work tracked by Issue #81 / PR #222.
- [ ] Reconcile this draft and the changelog against all merged changes on the final release candidate.
- [ ] Run the complete CI matrix on the exact release candidate commit: Node.js 20/22/24 and Solr 8.11.4/9.11.0/10.1.0.
- [ ] Verify npm provenance/publication settings and the rollback procedure. **Audit finding:** the current manual publisher does not use `--provenance`, and no trusted-publishing workflow/OIDC configuration exists; provenance is not currently produced.
- [ ] Create the stable tag and publish only after every blocking gate is explicitly complete.
- [ ] Install the published package from npm in a clean consumer and smoke-test ESM, CommonJS, and TypeScript declarations.

No release date or publication status is stated until these checks are complete.
