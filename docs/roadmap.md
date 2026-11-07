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

### Next feature tranche — TypeScript-first API coverage

This tranche is deliberately small and independent of the v4.0 release gate. It prioritizes common workflows where a named public contract materially improves discoverability and safe usage.

| Priority / sequence | Feature | Tracking | User value and scope |
| --- | --- | --- | --- |
| P1 — first | Typed RealTime Get API (`/get`) | [#271](https://github.com/vsimko/node-solr-lambda/pull/271) | Direct unique-key single/multi-document retrieval for read-after-write workflows, with generic document response types and exact request-option evidence. |
| P2 — next | Typed SpellCheck query component | [#272](https://github.com/vsimko/node-solr-lambda/pull/272) | Discoverable common SpellCheck options and extensible suggestion/collation response contracts on the existing standard Query API. |
| P2 | BigInt-safe JSON precision policy | [#292](https://github.com/vsimko/node-solr-lambda/issues/292) | Opt-in exact handling for 64-bit Solr values such as `_version_`; preserve native JSON defaults and avoid mandatory dependencies. |
| P2 | Typed Suggester API | [#293](https://github.com/vsimko/node-solr-lambda/issues/293) | Add autocomplete/suggestion contracts distinct from SpellCheck and Terms. |
| P2 | Backpressure-aware document ingestion | [#295](https://github.com/vsimko/node-solr-lambda/issues/295) | Add bounded-memory ingestion through the shared transport, with cancellation and explicit partial-failure semantics. |

| P2 | Cross-client regression test audit | [#297](https://github.com/vsimko/node-solr-lambda/issues/297) | Add only missing high-value cases from Solarium/pysolr/SolrJ: nested documents, Unicode round-trip, long request boundary, custom handler response extensibility, and test-topology clarity. |

The cross-client regression test audit (#297) is implemented in PR #296 with ADR 0003 and synchronized test/inventory documentation; #297 is closed after the full pinned CI matrix passed. RealTime Get (#271) is merged. SpellCheck (#272) is merged after its fresh post-rebase CI matrix passed all 30 jobs. The follow-on items #292, #293, and #295 are independent design/feature issues; their order is a delivery preference except that Suggester follows the current query-component work. Issue #294 was closed after an API audit: prepare-commit is not documented as a supported public option in the pinned Solr guides, so no typed wrapper or compatibility claim is planned unless authoritative documentation and reproducible lifecycle tests become available. All feature work remains independent of #110 and #232. Each implementation must include consumer type fixtures, serialization tests, operation-specific integration evidence, and synchronized API/compatibility/inventory documentation.

### P1 — SolrCloud operation evidence

| Work | Tracking | Current status |
| --- | --- | --- |
| Execute the opt-in, loopback-only SPLITSHARD and MIGRATE verification workflow for each pinned Solr version; retain non-certification until evidence exists | [#232](https://github.com/vsimko/node-solr-lambda/issues/232) | Test harness and manual `workflow_dispatch` workflow are merged in PR #253. A maintainer must manually run it with `enable_destructive_solrcloud_tests=true` and record successful evidence for Solr 8.11.4, 9.11.0, and 10.1.0. |

### Separate release gate

v4.0 stable publication remains a separate release-owner decision and must not block feature development. Complete the exact release-candidate CI matrix, release notes/migration summary, npm trusted-publisher configuration and provenance verification, and clean npm consumer smoke test before publication. Tracking: [#110](https://github.com/vsimko/node-solr-lambda/issues/110). Do not create a stable tag or publish without explicit release-owner approval.

## Residual-gap triage

The residual opportunities in API coverage, endpoint inventory, and the machine-readable inventory were reviewed and grouped before selecting the next tranche:

| Category | Decision | Rationale / tracking |
| --- | --- | --- |
| Feature | Accept RealTime Get, SpellCheck, BigInt-safe JSON, Suggester, and streaming ingestion; reject a typed prepare-commit wrapper pending a supported contract | #271/#272 cover common lookup and correction; #292, #293, and #295 capture precision, autocomplete, and ingestion gaps. #294 was closed after the public API audit found insufficient documented cross-version support. |
| Verification-only | Keep delete-option `_route_`/`commitWithin`, optimize-specific `openSearcher`, ReplicationHandler `enablepoll`/`disablepoll`, and the Solr 8.11.4 in-progress abort boundary explicitly unverified | These are narrower behavior-evidence gaps, not reasons to broaden the public API; retain exact compatibility notes until deterministic tests or server evidence exist. |
| External/manual gates | Keep SPLITSHARD/MIGRATE execution (#232) and v4.0 publication (#110) separate | Both require maintainer/release-owner action; neither blocks the selected feature tranche. |
| Maintenance | Finish the audit-driven API coverage, compatibility, endpoint inventory, and machine-readable inventory reconciliation | Tracked by the consolidated documentation PR #269; historical checklist hygiene is recorded in #228–#236 and #265. |
| Deferred pending demand | Terms handler, additional validation adapters, version-specific error payload variants, and advanced OAuth/mTLS credential lifecycle | Terms remains deferred because Suggester is a distinct higher-level autocomplete workflow and the generic request escape hatch remains available. Reassess Terms when a concrete consumer requirement appears. |
| Intentional non-goals | Blanket wrappers for every Solr endpoint/plugin and implicit V2 support from V1 contracts | Generic transport remains an escape hatch; V2 routes/payloads require a separately scoped API and tests. |

## Dependencies and execution

- Documentation reconciliation #255 and residual-gap triage #256 are complete through merged PR #257. The roadmap and API coverage now distinguish accepted work (#258 and #259), deferred items, and intentional non-goals.
- Export `includeStoredFields=true` is verified specifically on Solr 10.1.0 by merged PR #263, which closes #258. Do not extend that claim to Solr 8/9.
- #232 is independent of #259. Its opt-in workflow must be run manually; results must be reflected in the Collections action matrix and API inventory before any compatibility claim changes.
- #110 remains separate from feature implementation and depends on final documentation, release-candidate CI, external npm/GitHub trusted-publishing configuration, and release-owner approval.
- RealTime Get (#271) is complete and merged. SpellCheck (#272) is complete and merged. Follow-on comparison-derived work is #292 (BigInt precision), #293 (Suggester), and #295 (streaming ingestion); #294 is closed as not planned after the prepare-commit API audit. #297 (cross-client regression test audit) was completed by PR #296 with nested-document, Unicode, long-query, and custom-handler regression tests. All remain independent of the #110 release and #232 destructive SolrCloud gates.
- ADR 0002 and [the solr-client comparison](solr-client-comparison.md) record what was learned from `lbdremy/solr-node-client`; ADR 0003 records cross-client regression-test selection and transport boundaries. Reuse use cases and test cases, not legacy implementation patterns.
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
- Feature/evidence follow-ups #228–#231 and #233–#238 are completed and merged. In particular, #238 (one-shot ReplicationHandler leader/follower fetch and read-back) was completed by PR #253; abort/async lifecycle is tracked separately in #259.
- Roadmap/documentation reconciliation #255 and API-gap triage #256 are completed by PR #257.
- Solr 10.1 Export `includeStoredFields=true` stored-only field read-back is verified by PR #263 (#258); Solr 8/9 behavior remains unclaimed.
- PR #253 added the isolated opt-in SolrCloud test harness for SPLITSHARD/MIGRATE. Those actions remain runtime-unverified until the manual workflow has passed for each pinned Solr version.
- ReplicationHandler abort/async lifecycle issue #259 was completed by PR #264: live abort/read-back is tested on Solr 9.11.0 and 10.1.0; Solr 8.11.4 remains explicitly unverified because no reliable active-fetch signal was observable. One-shot fetch/read-back remains verified on all three versions. CI runs #658 and #659 passed all 30 jobs.

## Workflow

1. Select an open issue describing one coherent change.
2. Create a short-lived branch from current `master`.
3. Implement with unit tests, consumer type tests, documentation, and operation-specific integration evidence.
4. Open a pull request targeting `master` and link the issue.
5. Require review and passing CI on Node.js 20, 22, and 24; use pinned Solr integration jobs for behavior claims.
   - The documentation-only CI path builds the package before `docs:check`, because export-target validation inspects generated `dist/` files.
6. Merge the PR into `master`.
7. Update this roadmap and API coverage/compatibility documents when scope or status changes.

## Definition of done

A feature is not complete merely because it compiles. It needs useful TypeScript autocomplete, consumer compile tests, unit tests, documentation, and integration evidence for supported Solr versions—or an explicit unverified/unsupported status. Record evidence per operation and version; never generalize a passing family-level CI job to every action.

## P1 — Public project website and status dashboard

Deliver the static GitHub Pages experience as a product-discovery feature: TypeScript-first onboarding, operation-level API/compatibility evidence, observed CI, roadmap/tracked-work state, package/release information, and a canonical documentation catalogue. Keep generated facts traceable to repository or public-service sources; unknown, stale, and unavailable states must remain explicit.

| Work | Tracking | Scope boundary |
| --- | --- | --- |
| Architecture and versioned site-data contract | [#274](https://github.com/vsimko/node-solr-lambda/issues/274) | Foundation recorded in ADR 0001 and the site-data schema; no runtime dependency or npm package-content change. |
| Deterministic validation and consistency checks | [#275](https://github.com/vsimko/node-solr-lambda/issues/275) | Offline validation of normalized snapshots and P1 domains; optional P2 domains cannot gate P1 delivery. |
| GitHub Pages site, generated data, and deployment workflow | [#276](https://github.com/vsimko/node-solr-lambda/issues/276) | Static build and PR validation without deployment; deployment only from the default branch. |

The website is a discovery and evidence surface, not a second source of technical truth. README and `docs/` remain canonical; API inventory and compatibility evidence remain operation/version-specific. The website work does not change the TypeScript-first API feature priorities or release/manual SolrCloud gates.

## Implementation status (2026-11-06)

- **RealTime Get (#271):** implementation PR #271 is open with the public API, request/response types, unit/type fixtures, documentation, and isolated integration coverage. Node.js 20/22/24 and Solr 8.11.4/9.11.0/10.1.0 CI is pending; do not mark the feature complete until the latest run is green.
- **SpellCheck (#272):** implementation PR #272 is open with typed common request options, extensible NamedList response models, unit/type fixtures, documentation, and isolated integration coverage using the configured default handler. Its pinned CI matrix is pending.

These feature PRs do not alter the separate stable-release approval gate (#110) or the manually dispatched destructive SolrCloud verification gate (#232).
