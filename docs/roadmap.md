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
- Pinned integration images: Solr 8.11.4, 9.11.0, and 10.1.0. Compatibility is operation-specific; a green matrix does not certify every action. See [compatibility.md](compatibility.md) and [api-inventory.json](api-inventory.json).
- Package metadata identifies the current package line as `4.0.0-beta.0`; this does not imply a separate development branch.
- `master` is the only active development line. Historical branches are retained only as audit evidence and are not valid bases for new work.

## Active priorities

The issue list below reflects the current open follow-up work, rather than historical issue ranges. Closed implementation issues are intentionally omitted from active priorities.

### P0 — Release readiness and public contract

| Work | Tracking |
| --- | --- |
| Verify npm package metadata, packed-tarball contents, ESM/CommonJS consumer imports, declaration resolution, and prerelease publication procedure | [Issue #104](https://github.com/vsimko/node-solr-lambda/issues/104) |
| Review package-root exports and decide which APIs are stable, experimental, or internal; add consumer compile checks and migration guidance | [Issue #108](https://github.com/vsimko/node-solr-lambda/issues/108) |
| Complete the v4.0 release checklist, changelog, migration notes, compatibility evidence, and release/rollback procedure after implementation gates are closed | [Issue #110](https://github.com/vsimko/node-solr-lambda/issues/110) |
| Make the machine-readable inventory enumerate every public client method and require exact documentation/test evidence | [Issue #184](https://github.com/vsimko/node-solr-lambda/issues/184) |
| Keep endpoint inventory and roadmap aligned with the implemented API and current issue status | [Issue #185](https://github.com/vsimko/node-solr-lambda/issues/185) |

### P1 — Administration API completeness and evidence

| Work | Tracking |
| --- | --- |
| Complete Config component lifecycle and payload evidence; distinguish serialization coverage from live-server behavior | [Issue #75](https://github.com/vsimko/node-solr-lambda/issues/75) |
| Complete Core Admin action-specific inputs and response models | [Issues #77–#79](https://github.com/vsimko/node-solr-lambda/issues/77) |
| Audit Collections action/parameter coverage, CREATE configuration, shard lifecycle, aliases, and per-operation compatibility evidence | [Issues #80–#85](https://github.com/vsimko/node-solr-lambda/issues/80) |
| Improve Security input/authorization models and operation-level negative/secret-handling evidence | [Issues #86–#88](https://github.com/vsimko/node-solr-lambda/issues/86) |
| Define finite typed System endpoints and complete Metrics registry/value models with observed response fixtures | [Issues #89–#90](https://github.com/vsimko/node-solr-lambda/issues/89) |
| Make System/Metrics integration and documentation coverage explicit per public method | [Issue #91](https://github.com/vsimko/node-solr-lambda/issues/91) |

### P2 — Advanced APIs and compatibility

| Work | Tracking |
| --- | --- |
| Complete Streaming Expressions tuple/error response contracts and distinguish its transport from Export streaming | [Issues #92–#93](https://github.com/vsimko/node-solr-lambda/issues/92) |
| Complete Streaming Expressions tuple/error response contracts and distinguish its transport from Export streaming | [Issues #92–#93](https://github.com/vsimko/node-solr-lambda/issues/92) |

## Completed foundation and historical work

The following workstreams are complete or superseded by merged implementation and are retained here as historical context, not active priorities:

- Mainline/branch strategy and historical branch audit: [Issue #122](https://github.com/vsimko/node-solr-lambda/issues/122).
- Query API and consumer-facing TypeScript surface: [Issues #44–#59](https://github.com/vsimko/node-solr-lambda/issues/44).
- Update API and response handling: [Issues #60–#67](https://github.com/vsimko/node-solr-lambda/issues/60).
- Schema API: [Issues #68–#72](https://github.com/vsimko/node-solr-lambda/issues/68).
- Replication, backup/restore, raw-request, URL serialization, retry, and authentication foundations are complete or superseded by merged implementation; see the [endpoint inventory](endpoint-inventory.md) and [API inventory](api-inventory.json) for the current tested boundary.

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
