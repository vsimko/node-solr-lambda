# Development roadmap

This roadmap tracks the single active development line on master. Work is delivered through short-lived branches and pull requests targeting master; there is no permanent version-specific development branch.

## Product direction

**node-solr-lambda is a modern, lightweight, TypeScript-first Apache Solr client whose public API makes Solr parameters discoverable through IDE autocomplete.**

TypeScript IntelliSense is a product requirement:
- Supported Solr options use named exported interfaces, literal/discriminated unions, and nested models where useful.
- IDE completion exposes valid parameters and value shapes; type checking catches misspellings.
- Query and response generics let consumers type their own Solr documents.
- Less common and newly introduced Solr features remain accessible through explicit custom-parameter/raw-request escape hatches.
- Version-specific behavior is documented rather than hidden behind broad types.

The scope is balanced: cover major Solr API areas and production readiness without attempting to wrap every historical or plugin-specific endpoint. Keep the native Fetch transport, small dependency footprint, and direct mapping to Solr APIs. Feature work is not blocked on the v4.0 stable release.

## Current baseline

- Package manager: npm; use npm ci and commit package-lock.json.
- Runtime targets: Node.js 20, 22, and 24.
- Transport: Node.js Fetch API; optional runtime validation: Zod.
- Target Solr lines: 8.x, 9.x, and 10.x.
- Pinned integration images: Solr 8.11.4, 9.11.0, and 10.1.0. Compatibility is operation-specific; a green matrix does not certify every action. See compatibility.md and api-inventory.json.
- Package metadata identifies the current package line as 4.0.0-beta.0; this does not imply a separate development branch.
- master is the only active development line. Historical branches are audit evidence only and are not valid bases for new work.

## Active priorities

### P0 — Roadmap and public-contract hygiene

| Work | Tracking |
| --- | --- |
| Reconcile active priorities with current issue status and operation-level API evidence | [#239](https://github.com/vsimko/node-solr-lambda/issues/239) |
| Keep the machine-readable inventory, endpoint inventory, API coverage, and public method declarations aligned as follow-up work lands | Track in each API issue; use the API inventory as the operation-level source of truth |

### P1 — Core typed API quality and evidence

| Work | Tracking |
| --- | --- |
| Complete Config component-specific option models and safe behavior evidence | [#228](https://github.com/vsimko/node-solr-lambda/issues/228) |
| Add action-specific CoreAdmin response models and per-operation evidence | [#229](https://github.com/vsimko/node-solr-lambda/issues/229) |
| Add named response contracts for Collections actions beyond backup/restore | [#230](https://github.com/vsimko/node-solr-lambda/issues/230) |
| Close Collections RELOAD, MODIFYCOLLECTION, ADDROLE, and REMOVEROLE request/type/test gaps | [#231](https://github.com/vsimko/node-solr-lambda/issues/231) |

### P2 — Solr behavior verification and advanced API contracts

| Work | Tracking |
| --- | --- |
| Verify geospatial query helpers against the pinned Solr matrix | [#233](https://github.com/vsimko/node-solr-lambda/issues/233) |
| Verify SolrCloud _route_ and commitWithin runtime semantics | [#234](https://github.com/vsimko/node-solr-lambda/issues/234) |
| Expand live coverage for JSON update command variants beyond add + commit | [#235](https://github.com/vsimko/node-solr-lambda/issues/235) |
| Broaden Metrics fixtures and filter evidence beyond the JVM registry | [#236](https://github.com/vsimko/node-solr-lambda/issues/236) |
| Define typed Streaming Expressions tuple/error response contracts without claiming incremental streaming | [#237](https://github.com/vsimko/node-solr-lambda/issues/237) |
| Verify the ReplicationHandler leader/follower fetch lifecycle | [#238](https://github.com/vsimko/node-solr-lambda/issues/238) |
| Add opt-in isolated verification for SPLITSHARD and MIGRATE; retain explicit non-certification if safe automation is impractical | [#232](https://github.com/vsimko/node-solr-lambda/issues/232) |

### Separate release gate

v4.0 stable publication remains a separate release-owner decision and must not block feature development. Complete the exact release-candidate CI matrix, release notes/migration summary, npm trusted-publisher configuration and provenance verification, and clean npm consumer smoke test before publication. Tracking: [#110](https://github.com/vsimko/node-solr-lambda/issues/110). The repository's release process describes the OIDC workflow, but the actual npm trusted-publisher/account settings must still be verified externally.

## Parallel execution and dependencies

- Config (#228) and CoreAdmin (#229) can proceed independently.
- Collections response contracts (#230) and the remaining action evidence (#231) can proceed in parallel, coordinating shared action/type definitions.
- Query/update verification (#233–#235), Metrics (#236), Streaming Expressions (#237), and Replication (#238) are independent workstreams after shared test conventions are agreed.
- SPLITSHARD/MIGRATE verification (#232) is opt-in and must never run against shared or user-owned Solr clusters.
- Every PR updates relevant API docs, compatibility evidence, and api-inventory.json; do not infer runtime support from type or serialization tests.

## Completed foundation and historical work

Closed issues are retained as historical evidence, not active priorities:

- Mainline/branch strategy and historical branch audit: [#122](https://github.com/vsimko/node-solr-lambda/issues/122).
- Query API and consumer-facing TypeScript foundation: [#44–#59](https://github.com/vsimko/node-solr-lambda/issues/44). Remaining geospatial runtime verification is tracked separately in #233.
- Update API and response handling: [#60–#67](https://github.com/vsimko/node-solr-lambda/issues/60). Remaining _route_, commitWithin, and JSON command runtime evidence is tracked in #234 and #235.
- Schema API: [#68–#72](https://github.com/vsimko/node-solr-lambda/issues/68).
- Config command/read/overlay implementation: [#73–#76](https://github.com/vsimko/node-solr-lambda/issues/73); component-specific options follow-up is #228.
- CoreAdmin and Collections initial implementation: [#77–#85](https://github.com/vsimko/node-solr-lambda/issues/77); focused response/evidence follow-ups are #229–#232.
- Security, System, Metrics, Streaming Expressions, and Export foundations: [#86–#94](https://github.com/vsimko/node-solr-lambda/issues/86). Current remaining Metrics and Streaming Expressions gaps are #236 and #237.
- Replication, backup/restore, raw-request, URL serialization, retry, and authentication foundations are implemented; the leader/follower fetch lifecycle follow-up is #238.
- Packaging, public API review, operation inventory, and endpoint/roadmap audit issues #104, #108, #184, and #185 are closed. Their completion does not imply blanket endpoint certification.

## Workflow

1. Select an open issue describing one coherent change.
2. Create a short-lived branch from current master.
3. Implement with unit tests, consumer type tests, documentation, and operation-specific integration evidence.
4. Open a pull request targeting master and link the issue.
5. Require review and passing CI on Node.js 20, 22, and 24; use pinned Solr integration jobs for behavior claims.
6. Merge the PR into master.
7. Update this roadmap and the API coverage/compatibility documents when scope or status changes.

## Definition of done

A feature is not complete merely because it compiles. It needs useful TypeScript autocomplete, consumer compile tests, unit tests, documentation, and integration evidence for supported Solr versions—or an explicit unverified/unsupported status. Record evidence per operation and version; never generalize a passing family-level CI job to every action.