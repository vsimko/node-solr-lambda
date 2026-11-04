# Development roadmap

This roadmap tracks the single active development line on `master`. Work is delivered through short-lived branches and pull requests targeting `master`; there is no permanent version-specific development branch.

## Product direction

**node-solr-lambda is a modern, lightweight, TypeScript-first Apache Solr client whose public API makes Solr parameters discoverable through IDE autocomplete.**

- Supported Solr options use named exported interfaces, literal/discriminated unions, and nested models where useful.
- Query and response generics let consumers type their own Solr documents.
- Less common and newly introduced Solr features remain accessible through explicit custom-parameter/raw-request escape hatches.
- Version-specific behavior is documented rather than hidden behind broad types.

The scope is balanced: cover major Solr API areas and production readiness without attempting to wrap every historical or plugin-specific endpoint. Feature work is not blocked on the v4.0 stable release.

## Current baseline

- Package manager: npm; use `npm ci` and commit `package-lock.json`.
- Runtime targets: Node.js 20, 22, and 24.
- Transport: Node.js Fetch API; optional runtime validation: Zod.
- Target Solr lines: 8.x, 9.x, and 10.x.
- Pinned integration images: Solr 8.11.4, 9.11.0, and 10.1.0. Compatibility is operation-specific; a green matrix does not certify every action. See [compatibility](compatibility.md) and [api-inventory.json](api-inventory.json).
- Package metadata identifies the current package line as 4.0.0-beta.0; this does not imply a separate development branch.
- `master` is the only active development line.

## Active priorities

### P0 — Documentation and API-contract consistency

| Work | Tracking |
| --- | --- |
| Classify residual documented API gaps as focused follow-up work, deferred scope, or explicit non-goals | [#256](https://github.com/vsimko/node-solr-lambda/issues/256) |

### P1 — SolrCloud operation evidence

| Work | Tracking |
| --- | --- |
| Execute the opt-in, loopback-only SPLITSHARD and MIGRATE verification workflow for each pinned Solr version; retain non-certification until evidence exists | [#232](https://github.com/vsimko/node-solr-lambda/issues/232) |

### Separate release gate

v4.0 stable publication remains a separate release-owner decision and must not block feature development. Complete the exact release-candidate CI matrix, release notes/migration summary, npm trusted-publisher configuration and provenance verification, and clean npm consumer smoke test before publication. Tracking: [#110](https://github.com/vsimko/node-solr-lambda/issues/110). Do not create a stable tag or publish without explicit release-owner approval.

## Dependencies and execution

- #255 is the documentation baseline for #256; keep operation status grounded in exact tests and pinned versions.
- #232 is independent of the documentation cleanup, but its results must be reflected in the Collections action matrix and API inventory before any compatibility claim changes.
- #110 remains separate from feature implementation and depends on final documentation, release-candidate CI, external npm/GitHub trusted-publishing configuration, and release-owner approval.
- Every implementation PR updates relevant API docs, compatibility evidence, and `api-inventory.json`; do not infer runtime support from type or serialization tests.

## Completed foundation and historical work

Closed issues are retained as historical evidence, not active priorities:

- Mainline/branch strategy and historical branch audit: [#122](https://github.com/vsimko/node-solr-lambda/issues/122).
- Query API and consumer-facing TypeScript foundation: [#44–#59](https://github.com/vsimko/node-solr-lambda/issues/44).
- Update API and response handling: [#60–#67](https://github.com/vsimko/node-solr-lambda/issues/60); remaining runtime semantics are tracked only when still open.
- Schema API: [#68–#72](https://github.com/vsimko/node-solr-lambda/issues/68).
- Config command/read/overlay implementation: [#73–#76](https://github.com/vsimko/node-solr-lambda/issues/73); component-specific options work is historical unless reopened.
- CoreAdmin and Collections implementation: [#77–#85](https://github.com/vsimko/node-solr-lambda/issues/77).
- Security, System, Metrics, Streaming Expressions, and Export foundations: [#86–#94](https://github.com/vsimko/node-solr-lambda/issues/86).
- Packaging, public API review, and operation inventory foundations: #104, #108, #184, and #185.
- Feature and evidence follow-ups #228–#231 and #233–#238 are completed and merged. #238 (ReplicationHandler one-shot leader/follower fetch and read-back) was completed by merged PR #253.
- The post-#253 documentation reconciliation is delivered by PR #257 (#255); it is not a continuing roadmap priority once merged.
- PR #253 also added the isolated opt-in SolrCloud test harness for SPLITSHARD/MIGRATE. Those actions remain unverified until the manual workflow has actually passed.

## Workflow

1. Select an open issue describing one coherent change.
2. Create a short-lived branch from current `master`.
3. Implement with unit tests, consumer type tests, documentation, and operation-specific integration evidence.
4. Open a pull request targeting `master` and link the issue.
5. Require review and passing CI on Node.js 20, 22, and 24; use pinned Solr integration jobs for behavior claims.
6. Merge the PR into `master`.
7. Update this roadmap and API coverage/compatibility documents when scope or status changes.

## Definition of done

A feature is not complete merely because it compiles. It needs useful TypeScript autocomplete, consumer compile tests, unit tests, documentation, and integration evidence for supported Solr versions—or an explicit unverified/unsupported status. Record evidence per operation and version; never generalize a passing family-level CI job to every action.
