# Development roadmap

This is the roadmap for the single active development line on `master`. Work is tracked in GitHub issues and delivered through short-lived branches and pull requests targeting `master`. There is no permanent version-specific development branch.

## Product direction

**node-solr-lambda is a modern, lightweight, TypeScript-first Apache Solr client whose public API makes Solr parameters discoverable through IDE autocomplete.**

TypeScript IntelliSense is a product requirement:
- Supported Solr options should be represented by named exported interfaces, literal unions, discriminated unions, and nested models.
- IDE completion should expose valid parameters and value shapes while type checking catches misspelled options.
- Query and response generics should allow consumers to type their own Solr documents.
- Less common or newly introduced Solr features must remain accessible through an explicit custom-parameter/raw-request escape hatch.
- Version-specific behavior must be documented rather than hidden behind overly broad types.

The aim is not to recreate every historical Solr client abstraction. Keep the native Fetch transport, small dependency footprint, and direct mapping to Solr APIs.

## Current baseline

- Package manager: npm; use `npm ci` and commit `package-lock.json`.
- Runtime targets: Node.js 20, 22, and 24.
- Transport: Node.js Fetch API.
- Optional runtime validation: Zod.
- Target Solr server lines: 8.x, 9.x, and 10.x.
- Partial runtime evidence exists on pinned Solr 8.11.4, 9.11.0, and 10.1.0 images for basic query/cursorMark and document add/update/delete/hard-commit behavior. Broad compatibility across all API operations remains **unverified**; see [compatibility.md](compatibility.md) and [api-inventory.json](api-inventory.json).
- Package metadata currently identifies the package as `4.0.0-beta.0`; that release version does not imply a separate development branch.

## Priorities

### P0 — Mainline consistency and release confidence

| Work | Tracking |
| --- | --- |
| Use `master` as the only active development line; align CI, docs, roadmap, and issue wording | [Issue #122](https://github.com/vsimko/node-solr-lambda/issues/122) |
| Establish the autocomplete-first TypeScript API contract and consumer acceptance tests | [Issue #121](https://github.com/vsimko/node-solr-lambda/issues/121) |
| Maintain an explicit endpoint/feature inventory and definition of done | [Issue #39](https://github.com/vsimko/node-solr-lambda/issues/39) |
| Build repeatable Solr Docker integration infrastructure and fixtures | [#41](https://github.com/vsimko/node-solr-lambda/issues/41), [#42](https://github.com/vsimko/node-solr-lambda/issues/42), [#43](https://github.com/vsimko/node-solr-lambda/issues/43) |
| Run and record the Solr 8/9/10 compatibility audit | [Issue #42](https://github.com/vsimko/node-solr-lambda/issues/42), [#109](https://github.com/vsimko/node-solr-lambda/issues/109) |

### P1 — Query API and IDE experience

The query API is the most visible area where autocomplete quality directly affects daily use.

| Work | Tracking |
| --- | --- |
| Typed common query parameters and explicit custom parameter escape hatch | [Issue #44](https://github.com/vsimko/node-solr-lambda/issues/44) |
| Parser-specific parameters (Lucene, DisMax, eDisMax) | [Issue #45](https://github.com/vsimko/node-solr-lambda/issues/45) |
| Typed sort and field-list helpers | [Issue #46](https://github.com/vsimko/node-solr-lambda/issues/46) |
| Filter collections, tagged filters, and local parameters | [Issue #47](https://github.com/vsimko/node-solr-lambda/issues/47) |
| Cursor pagination | [Issue #48](https://github.com/vsimko/node-solr-lambda/issues/48) |
| Typed query response and document generics | [Issue #49](https://github.com/vsimko/node-solr-lambda/issues/49) |
| Classic facets and JSON Facet API | [Issues #50](https://github.com/vsimko/node-solr-lambda/issues/50), [#52](https://github.com/vsimko/node-solr-lambda/issues/52) |
| Highlighting, grouping, stats, MoreLikeThis, spatial search, and debug response | [Issues #53–#58](https://github.com/vsimko/node-solr-lambda/issues/53) |
| Query API documentation and consumer examples | [Issue #59](https://github.com/vsimko/node-solr-lambda/issues/59) |

### P1 — Update API

| Work | Tracking |
| --- | --- |
| Complete typed update command models and atomic updates | [Issues #60–#61](https://github.com/vsimko/node-solr-lambda/issues/60) |
| JSON/XML update request support and commit parameter semantics | [Issues #62–#64](https://github.com/vsimko/node-solr-lambda/issues/62) |
| Typed response validation, integration tests, and docs | [Issues #65–#67](https://github.com/vsimko/node-solr-lambda/issues/65) |

### P2 — Administration and SolrCloud

| Work | Tracking |
| --- | --- |
| Schema API types and operations | [Issues #68–#72](https://github.com/vsimko/node-solr-lambda/issues/68) |
| Config API types and operations | [Issues #73–#76](https://github.com/vsimko/node-solr-lambda/issues/73) |
| Core Admin action and response models | [Issues #77–#79](https://github.com/vsimko/node-solr-lambda/issues/77) |
| Collections, aliases, shards, replicas, and cluster state | [Issues #80–#85](https://github.com/vsimko/node-solr-lambda/issues/80) |
| Security, system information, and metrics | [Issues #86–#91](https://github.com/vsimko/node-solr-lambda/issues/86) |

### P3 — Advanced APIs and release hardening

| Work | Tracking |
| --- | --- |
| Streaming Expressions, stream parsing, and export | [Issues #92–#94](https://github.com/vsimko/node-solr-lambda/issues/92) |
| Replication and backup/restore | [Issues #95–#96](https://github.com/vsimko/node-solr-lambda/issues/95) |
| Remaining endpoints and safe raw request API | [Issues #97–#98](https://github.com/vsimko/node-solr-lambda/issues/97) |
| URL serialization, retry behavior, and auth guidance | [Issues #99–#101](https://github.com/vsimko/node-solr-lambda/issues/99) |
| README, API reference, migration, public API, compatibility, and release checklist | [Issues #102–#104](https://github.com/vsimko/node-solr-lambda/issues/102), [#107–#110](https://github.com/vsimko/node-solr-lambda/issues/107) |

## Historical branch audit

The historical branch audit requested by [Issue #122](https://github.com/vsimko/node-solr-lambda/issues/122) was completed on 2026-11-02. Only two of the nine refs listed in the earlier audit remain on GitHub:

| Remaining historical branch | Ahead of master | Behind master | Related work accounted for |
| --- | ---: | ---: | --- |
| `v4.0` | 64 | 44 | Foundation and documentation in PRs #113/#114; compatibility matrix in #117; domain modules and endpoint work in #118; transport configuration/retry policy in #119. The later update/commit, atomic-update, raw-request, and response work is represented by the focused mainline PRs #152, #153, #156, #159, and #160. |
| `v4-npm-issue-112` | 6 | 42 | Temporary lockfile bootstrap in PR #115 and the final npm/release workflow in PR #116. |

The other seven refs from the previous inventory no longer exist: `v4-client-modules-issue-32`, `v4-config-transport-issue-33`, `v4-npm-issue-112-final`, `v4-solr-compat-issue-31`, `v4-docs-issue-114`, `v4-foundation-issue-113`, and `npm-lock-bootstrap-issue-112`.

The original broad PR #111 is closed and explicitly superseded. Its scoped work was delivered through the merged PRs listed above. The temporary npm bootstrap PR #115 and final npm migration PR #116 are both merged. The unique changes represented by the two remaining branches have therefore been accounted for by merged historical PRs or superseding mainline implementation; no change should be merged from either branch into current `master`.

Both remaining refs are retained as historical evidence for now. They are not valid bases for new work, and no force-merge or branch deletion is required to complete the audit. If they are later deleted, that should be a separate housekeeping action after confirming that no external consumer relies on the refs.

## Workflow

1. Create or select a GitHub issue describing one coherent change.
2. Create a short-lived branch from the current `master`.
3. Implement the change with tests and documentation.
4. Open a pull request targeting `master`, linked to the issue.
5. Require review and passing CI on Node.js 20, 22, and 24.
6. Merge the PR into `master`.
7. Update this roadmap and the API coverage/compatibility documents when scope or status changes.

## Definition of done

A feature is not complete merely because its implementation compiles. It must have useful TypeScript autocomplete, consumer compile tests, unit tests, documentation, and integration evidence for supported Solr versions—or an explicit unverified/unsupported status.
