# ADR 0002: Solr client API coverage and implementation principles

- Status: Accepted
- Date: 2026-11-07
- Decision owners: repository maintainers

## Context

A source-level review of [lbdremy/solr-node-client](https://github.com/lbdremy/solr-node-client) identified useful Solr workflows not yet represented in this project or not yet exposed as first-class typed APIs: RealTime Get, SpellCheck, Suggester, BigInt-safe JSON handling, streaming document ingestion, and prepare-commit.

The reference repository is a legacy TypeScript client (solr-client 0.10.0-rc10; source reviewed at commit `c1a2f2a3ec233a19f84b061eb01ff4ae718d14ef`). It documents Node.js 12+ and Solr 3.2–8. Its implementation combines callback/promise APIs, `request`, Undici, JSONStream, Duplex streams, and optional `json-bigint`. These are useful examples of consumer needs, not an architectural baseline for this project.

This project targets Node.js 20/22/24 and Solr 8/9/10, uses a shared Fetch transport, ESM/CommonJS exports, named TypeScript contracts, cancellation/timeouts, and no mandatory runtime dependencies.

## Decision

Adopt the following product and implementation decisions:

1. **Cover common Solr workflows as typed APIs when they materially improve discoverability and safety.** RealTime Get was merged in PR #271; SpellCheck remains in PR #272. Suggester is accepted as follow-on work (#293).
2. **Keep feature families semantically distinct.** SpellCheck, Suggester, and Terms are not interchangeable. Terms remains deferred pending a concrete consumer requirement; generic request methods remain the escape hatch.
3. **Do not silently trade numeric precision.** Investigate an opt-in BigInt-safe JSON policy (#292). Preserve native JSON behavior by default unless an explicit, reviewed compatibility decision says otherwise. Do not introduce an unconditional runtime dependency or silently turn ordinary numbers into strings/BigInt.
4. **Prefer bounded-memory streaming ingestion built on the shared transport.** Investigate an AsyncIterable/Web Streams or Node Writable API (#295), with real backpressure, cancellation, timeout, error, and partial-ingestion semantics. Do not copy the reference Duplex implementation, which pipes JSONStream into the legacy `request` module outside the shared transport.
5. **Do not expose prepare-commit as a typed API without a supported cross-version contract.** The audit in #294 found no `prepareCommit` option in the public Solr 10.1 Update Handler reference, although the implementation has an expert/internal flag. Existing typed commit options do not express it; the generic request escape hatch remains available. No dedicated method or compatibility claim is justified until official per-version documentation and deterministic lifecycle tests exist. Prepare-commit alone must never be described as making documents visible.
6. **Reuse test cases and edge cases, not legacy implementation code.** In particular, retain the reference test vector `9007199254740993` and optimistic-concurrency `_version_` read-back as BigInt precision acceptance cases.
7. **No blanket endpoint-wrapper promise.** Add typed wrappers for stable, common Solr APIs; preserve raw/custom request escape hatches for uncommon, plugin-specific, or application-defined handlers.
8. **Keep compatibility claims evidence-based.** Each operation needs version-specific integration evidence on pinned Solr 8.11.4, 9.11.0, and 10.1.0, or an explicit unverified/unsupported note.
9. **Use mature cross-language client suites as test-case references, not feature checklists.** Solarium's parser fixtures and topology-separated integration tests, pysolr's nested-document/Unicode/cursor/error-format scenarios, and SolrJ's Cloud timeout/routing semantics inform [#297](https://github.com/vsimko/node-solr-lambda/issues/297). Only add missing cases that validate this HTTP client's supported contract.
10. **Record test selection and transport boundaries separately.** The accepted decisions for nested-document fidelity, Unicode, long GET query behavior, custom-handler extensibility, XML response non-support, and standalone/Cloud topology are formalized in [ADR 0003](0003-cross-client-test-strategy.md).

## Alternatives considered

- **Copy the reference client's API and transport:** rejected. Its legacy callback/promise mixture, multiple HTTP stacks, and direct stream request path conflict with this project's shared transport and TypeScript-first conventions.
- **Add every handler exposed by the reference project:** rejected. The reference implementation exposes some helpers but does not establish a coherent, current Solr 8/9/10 contract for all of them. Prioritize user value and stable official contracts.
- **Always parse every JSON number as BigInt/string:** rejected because it would be a breaking behavioral change for consumers and can impose runtime/performance costs.
- **Implement ingestion as a Node Duplex only:** rejected pending API design. AsyncIterable and Web Streams may better fit the shared Fetch transport and Node/browser-compatible abstractions.
- **Add a prepare-commit convenience method:** rejected for now because the option is not documented as a supported public request contract in the pinned Solr guides, and the two-phase lifecycle has not been verified independently on the pinned versions. The generic request escape hatch is sufficient for expert callers who accept the risk.

## Consequences

- Roadmap and issues #292, #293, and #295 track accepted follow-on work; #294 is closed as not planned after the API audit. PRs #271/#272 remain the current RealTime Get and SpellCheck implementation path.
- API coverage and endpoint inventory distinguish in-progress, accepted, deferred, and implemented features.
- Compatibility and machine-readable inventory must not claim support until exact tests pass.
- No runtime code, package dependency, package identity, or release behavior is changed by this ADR.
- A comparison of reference code and reusable lessons is maintained in [solr-client-comparison.md](../solr-client-comparison.md); the follow-on test audit is tracked in #297 and its implementation decisions are recorded in [ADR 0003](0003-cross-client-test-strategy.md).
