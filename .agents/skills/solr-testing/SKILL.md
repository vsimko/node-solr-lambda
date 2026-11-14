---
name: solr-testing
description: Use when adding tests, debugging regressions, changing transport behavior, or validating Solr client features.
---

# Solr testing

## Canonical documentation

- [Testing and quality strategy](../../../docs/testing-strategy.md)
- [Cross-client regression ADR](../../../docs/adr/0003-cross-client-test-strategy.md)
- [CI workflow](../../../.github/workflows/ci.yml)

## Evidence layers

| Layer | Command / workflow | What it proves |
| --- | --- | --- |
| Source types/build | `npm run typecheck`, `npm run test:types`, `npm run build` | Source and declarations compile; not server compatibility |
| Unit/contract | `npm test` | Tested serialization, transport, response, error, cancellation behavior |
| Standalone integration | `npm run test:integration` | Actual behavior against configured pinned standalone Solr images |
| Security integration | CI security matrix | Tested authn/authz behavior against configured secured Solr |
| SolrCloud integration | CI cloud matrix | Tested behavior against configured multi-node topology |
| Destructive opt-in | Explicit manual workflow/test | Only the isolated high-risk operation actually exercised |
| Performance | `npm run bench` | Measurements on the host and workload used; not universal performance claims |

Never describe one layer as proof of another.

## Test design

- Match existing Node test runner and TypeScript/tsx conventions.
- Unit tests should assert observable contracts: URL/path, method, query encoding, headers, body, response parsing, error mapping, cancellation, timeout, and cleanup as relevant.
- Use deterministic fixtures and local/mock Fetch for transport contracts.
- Integration tests should verify persisted or observable server state, not merely HTTP success.
- Prefer count/order/read-back assertions for ingestion and document operations.
- Test nested documents, Unicode, multi-valued fields, and custom parameter behavior where relevant.
- Clean up created cores, collections, handlers, schemas, documents, and security state. Cleanup must run even after assertion failure.
- Keep destructive or cluster-wide actions behind explicit opt-in and use disposable loopback-only infrastructure.
- Do not depend on an external SolrCloud server being available by default; respect the project's documented test constraints.
- Do not add flaky sleeps where bounded polling with a deadline and observable condition is possible.

## Cross-version discipline

The pinned baselines are operation-specific. Consult [the compatibility matrix](../../../docs/compatibility.md) before selecting expectations. A passing test on one version does not certify another version or an entire major line.

If integration infrastructure is unavailable, add meaningful unit/type coverage, clearly state which integration checks were not run, do not mark compatibility as verified, and record a follow-up issue when runtime evidence is required.

## Completion checklist

- [ ] Relevant unit/contract tests pass.
- [ ] Public type fixtures pass for public API changes.
- [ ] Integration test asserts real behavior and cleans up.
- [ ] Target Solr versions are stated precisely.
- [ ] Unavailable infrastructure and unrun tests are disclosed.
- [ ] Coverage and compatibility documents reflect the actual evidence.
