# Changelog

## Unreleased

### Added

- Replace the v3 functional Axios client with a TypeScript-first Fetch-based `SolrClient`, supporting Node.js 20/22/24/26 (Node 20 retained as legacy EOL compatibility), ESM and CommonJS, and no required runtime dependencies; keep Zod optional for runtime validation.
- Add Node.js 26 Active LTS support and expand the unit/type, standalone, security, and SolrCloud CI matrices to Node.js 20/22/24/26; retain Node.js 20 only as legacy compatibility.
- Add typed transport configuration for Basic/Bearer authentication, headers, request defaults, retries, timeouts, cancellation, structured HTTP/network/timeout/abort/validation errors, and safe raw/streaming requests.
- Add an autocomplete-first Query API covering parser-specific options, filters, sorting, cursorMark pagination, classic and JSON facets, highlighting, grouping, stats, MoreLikeThis, debug/explain, spatial helpers, and optional SpellCheck and Suggester components.
- Add typed document contracts including RealTime Get (`get()`), JSON documents and command objects, atomic updates, update/delete options, commit/soft-commit/optimize behavior, and update response/error envelopes.
- Add `SolrClient.addStream()` for backpressure-aware JSON-array document ingestion from async iterables, with bounded buffering, cancellation, and explicit partial-ingestion semantics.
- Add an injectable `SolrJsonCodec` for caller-selected lossless JSON parsing and serialization, including BigInt-safe handling; native JSON behavior remains the default.
- Add typed Core Admin, Collections, Schema, Config, Security, Metrics, and System API contracts, with action-specific request models and response shapes for the operations documented in the API reference.
- Add the typed V1 Collections `FORCELEADER` action with exact serialization and consumer type coverage; stale-replica runtime verification remains unverified pending isolated fault-injection testing.
- Add an explicit `client.v2` namespace with generic JSON and raw request methods over the shared transport; V1 methods remain unchanged, and operation-specific V2 contracts/runtime compatibility remain unverified.
- Add a reproducible query, bulk-ingestion, and streaming benchmark harness comparing the client with direct Node.js Fetch; no performance leadership claim is made.

- Add Update API unit coverage for JSON endpoint selection, typed success responses, and Solr HTTP failures, plus Solr 8/9/10 delete-by-query persisted-state integration coverage.

- Add Solr 8/9/10 integration coverage for Schema API dynamic-field add/replace/delete and copy-field add/delete, including copy-rule replacement via delete+add.

- Add unit and Solr 8/9/10 integration coverage for Schema API add, replace, and delete field-type operations, including analyzer, tokenizer, and filter read-back.

- Add unit and Solr 8/9/10 integration coverage for Schema API add, replace, and delete field operations, including typed mutation responses and schema read-back.

- Add end-to-end v3-to-v4 migration coverage for health checks, document add/replace/delete, and typed query read-back on Solr 8/9/10.

- Add typed core-level and SolrCloud collection backup/restore APIs with asynchronous status handling.
- Add typed V1 ReplicationHandler commands and raw file-content streaming through `replication()` and `replicationFile()`.
- Add typed response contracts for Schema and Config reads, Security authentication/authorization, Metrics, System diagnostics, Core Admin status/async actions, and Collections aliases/cluster status.
- Add typed Collections shard lifecycle and MIGRATE operations, including V1 wire-name corrections and explicit runtime-verification boundaries.
- Complete typed V1 Collections CREATE options for shard/replica layouts, routing, node placement, aliases, core properties, and legacy Solr 8.11 placement controls; add compile-time and serialization coverage.
- Add typed Streaming Expressions JSON envelopes and Export Handler request/sort models; distinguish parsed JSON expressions from raw streamed Export responses.
- Harden the public client boundary by keeping transport configuration private and verifying the package-root stable/experimental/internal export decisions.
- Verify the packed npm tarball in clean consumers, including ESM/CommonJS runtime imports, TypeScript declarations, optional Zod absence, and prerelease/stable dist-tag policy.

### Documentation

- Add a public API reference and machine-readable operation inventory, with consistency checks against package exports and client methods.
- Document the explicit generic Solr V2 namespace, its `/api/` path constraints, shared-transport behavior, introspection fixture policy, and unverified operation-specific compatibility boundary.
- Add action-specific Collections API evidence and an explicit public API review, including the stable, generic escape-hatch, and internal export decisions.
- Document npm tarball validation, prerelease dist-tag behavior, release rollback, and the manually gated GitHub Actions/npm OIDC trusted-publishing workflow.
- Add a Solr 8.11.4/9.11.0/10.1.0 Schema API compatibility matrix with explicit V1/V2 scope and unverified similarity plugin behavior.
- Add typed Schema API command responses and read-response models for schema metadata, fields, dynamic fields, field types, copy fields, uniqueKey, and similarity.
- Add compile-time checks for the documented Update API examples, including atomic update modifiers, JSON update commands, delete options, and commit/optimize semantics.
- Expand the v3-to-v4 migration guide with a complete v4 CRUD example and link its compile-time and Solr integration checks.
- Clarify Solr 8/9/10 runtime evidence per endpoint and document the remaining unverified query, update-option, and generic transport behaviors.
- Expand standalone, authenticated, and SolrCloud integration CI to Node.js 20/22/24/26 across Solr 8.11.4/9.11.0/10.1.0; document the complete matrix and its successful CI evidence.
- Document ReplicationHandler abort lifecycle evidence per Solr version, including the Solr 8.11.4 observability limitation, and keep one-shot fetch verification separate.
- Document the opt-in SPLITSHARD/MIGRATE workflow and retain explicit non-certification until a maintainer manually runs it on every pinned Solr version.

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.0.5](https://github.com/vsimko/node-solr-lambda/compare/v3.0.4...v3.0.5) (2023-06-27)

### [3.0.4](https://github.com/vsimko/node-solr-lambda/compare/v3.0.3...v3.0.4) (2020-05-12)

### [3.0.3](https://github.com/vsimko/node-solr-lambda/compare/v3.0.1...v3.0.3) (2020-05-12)


### Bug Fixes

* link to types.d.ts mentioned in jsdocs ([c732f02](https://github.com/vsimko/node-solr-lambda/commit/c732f02bdd16a5be414658b4d92bbc46187af3b7))

<a name="3.0.1"></a>
## [3.0.1](https://github.com/vsimko/node-solr-lambda/compare/v3.0.0...v3.0.1) (2018-12-09)


### Bug Fixes

* update docs, move solr.d.ts to types.d.ts ([af72e46](https://github.com/vsimko/node-solr-lambda/commit/af72e46))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/vsimko/node-solr-lambda/compare/v2.2.0...v3.0.0) (2018-12-08)


### Bug Fixes

* convert 404 and 400 http errors to exceptions ([6ca25ed](https://github.com/vsimko/node-solr-lambda/commit/6ca25ed))


### Features

* split api between client and core admin and simplify internal design ([37b0788](https://github.com/vsimko/node-solr-lambda/commit/37b0788))


### BREAKING CHANGES

* - config:
  - removed parameters debug, apiPrefix
  - urlConfig moved up one level
- printing of debugging messages removed
- prepareSolrClient accepts first parameter `core` and optinoal parameter `userConfig`
- added function `commit`
- added function `solrListFields`
- moved function `ping` to `prepareCoreAdmin`
- added function `solrDeleteCore` to `prepareCoreAdmin`
- functions `deleteField` and `deleteFieldType` now accepts a single `name` parameter rather than object



<a name="2.2.0"></a>
# [2.2.0](https://github.com/vsimko/node-solr-lambda/compare/v2.1.0...v2.2.0) (2018-12-05)


### Bug Fixes

* function `mergeConfig` now uses `deepCopy` through JSON serdes. ([c240ad3](https://github.com/vsimko/node-solr-lambda/commit/c240ad3))


### Features

* add `mergedConfig` function ([9ca2fe6](https://github.com/vsimko/node-solr-lambda/commit/9ca2fe6))



<a name="2.1.0"></a>
# [2.1.0](https://github.com/vsimko/node-solr-lambda/compare/v2.0.2...v2.1.0) (2018-12-05)


### Features

* add solr.config function and and configAutoEnableFields ([ade5e8a](https://github.com/vsimko/node-solr-lambda/commit/ade5e8a))



<a name="2.0.2"></a>
## [2.0.2](https://github.com/vsimko/node-solr-lambda/compare/v2.0.0...v2.0.2) (2018-12-04)



<a name="2.0.1"></a>
## [2.0.1](https://github.com/vsimko/node-solr-lambda/compare/v2.0.0...v2.0.1) (2018-12-04)



<a name="2.0.0"></a>
# [2.0.0](https://github.com/vsimko/node-solr-lambda/compare/v1.1.0...v2.0.0) (2018-12-04)


### Bug Fixes

* add explicit typedef imports instead of declare global ([c388079](https://github.com/vsimko/node-solr-lambda/commit/c388079))


### Features

* add mergeConfig exported function used also in prepareSolrClient ([051ecd0](https://github.com/vsimko/node-solr-lambda/commit/051ecd0))


### BREAKING CHANGES

* the prepareSolrClient function now accepts
user config which is merged with the default config (overrides its
fields). The userConfig can also be empty.



<a name="1.1.0"></a>
# [1.1.0](https://github.com/vsimko/node-solr-lambda/compare/v1.0.0...v1.1.0) (2018-12-04)


### Bug Fixes

* printing curl command in debug mode should use quoted data ([752c1cc](https://github.com/vsimko/node-solr-lambda/commit/752c1cc))


### Features

* implemented `delete` function for deleting document by id or query ([e1166e4](https://github.com/vsimko/node-solr-lambda/commit/e1166e4))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/vsimko/node-solr-lambda/compare/v0.2.2...v1.0.0) (2018-12-04)


### Bug Fixes

* export defaultConfig ([773c947](https://github.com/vsimko/node-solr-lambda/commit/773c947))
* problem with `query` param accidentally renamed ([b1fbe8c](https://github.com/vsimko/node-solr-lambda/commit/b1fbe8c))
* remove solrGet and use solrPost everywhere, update typedefs ([6837233](https://github.com/vsimko/node-solr-lambda/commit/6837233))


### Features

* add debugging of GET requests ([d609b65](https://github.com/vsimko/node-solr-lambda/commit/d609b65))
* add type annotations, new solr functions ([253f335](https://github.com/vsimko/node-solr-lambda/commit/253f335))
* add typings mainly for nicer vscode assistance ([9d3604e](https://github.com/vsimko/node-solr-lambda/commit/9d3604e))
* facet function to get solr facets using JSON api ([c7cfa78](https://github.com/vsimko/node-solr-lambda/commit/c7cfa78))


### BREAKING CHANGES

* - `select` function replaced by `query`
- `facet` function removed because we now have query+typedefs
- we now use the Solr JSON API in `SolrQuery` type with additional parameters inside `SolrQuery.params`.
- the config has now nested section `urlConfig` which is passed directly to `url.format` before calling `axios.post`.
* From now on,  the `core` parameter needs
to be passed through the `config` parameter. This simplifies
the API by removing special cases.
The provided typings provide better user experience when developing
in an IDE such as vscode.



<a name="0.2.2"></a>
## [0.2.2](https://github.com/vsimko/node-solr-lambda/compare/v0.2.1...v0.2.2) (2018-07-31)



<a name="0.2.1"></a>
## [0.2.1](https://github.com/vsimko/node-solr-lambda/compare/v0.1.1...v0.2.1) (2018-07-31)



<a name="0.1.1"></a>
## 0.1.1 (2018-06-20)


### Bug Fixes

* some typos ([c469209](https://github.com/vsimko/node-solr-lambda/commit/c469209))
