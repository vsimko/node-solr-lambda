# Comparison with `solr-client`

This document records a source-level review of [lbdremy/solr-node-client](https://github.com/lbdremy/solr-node-client), published on npm as `solr-client`, to identify useful user workflows and implementation lessons for this project.

## Scope and source snapshot

- Repository: [lbdremy/solr-node-client](https://github.com/lbdremy/solr-node-client)
- Source snapshot reviewed: `c1a2f2a3ec233a19f84b061eb01ff4ae718d14ef`
- Package version in that snapshot: `0.10.0-rc10`
- Declared targets in its README/package metadata: Node.js 12+ and Solr 3.2–8
- Main implementation files reviewed: `lib/solr.ts`, `lib/query.ts`, `lib/collection.ts`, `lib/types.ts`, `lib/utils/format.ts`
- Representative tests/examples reviewed: RealTime Get, SpellCheck, prepareCommit, BigInt, and createAddStream.

This is an API/code review, not a claim that the old package is currently maintained or that every documented feature works on every Solr version.

## Capability comparison

| Capability | Reference client | This project | Decision |
| --- | --- | --- | --- |
| RealTime Get | `realTimeGet(ids, query)` against `/get` | Typed RealTime Get API merged in [PR #271](https://github.com/vsimko/node-solr-lambda/pull/271); full pinned CI passed | Keep as P1; merge only after current CI and integration matrix pass. |
| SpellCheck | `spell(query)` against `/spell` | Typed query component work in open [PR #272](https://github.com/vsimko/node-solr-lambda/pull/272), rebased onto current master | Keep as P2; PR #272 is stacked on #271. |
| Suggester | No equivalent dedicated helper found in reviewed client source | No dedicated typed API | Accepted for follow-up in [#293](https://github.com/vsimko/node-solr-lambda/issues/293). |
| BigInt-safe JSON | Optional `bigint` flag selects `json-bigint` parser/stringifier | No equivalent precision mode documented | Investigate opt-in precision policy in [#292](https://github.com/vsimko/node-solr-lambda/issues/292). |
| Streaming document ingestion | `createAddStream()` returns a Duplex that serializes document objects | Buffered `add()` API; streaming export exists | Design a bounded-memory API using shared transport in [#295](https://github.com/vsimko/node-solr-lambda/issues/295). |
| Prepare commit | `prepareCommit()` sends `prepareCommit=true` to Update Handler | No dedicated convenience method; generic `request()` can carry caller-owned parameters | Audited in [#294](https://github.com/vsimko/node-solr-lambda/issues/294): not promoted to a typed API because the pinned public Solr guides do not document it as a supported option and cross-version lifecycle evidence is absent. |
| Terms handler | `termsSearch()` | No dedicated typed API | Deferred pending demand; raw request remains available. |
| Search features | Query builder includes facets, grouping, joins, MLT and other query helpers | Broad typed query surface including facets, grouping, MLT, geospatial, JSON facets, highlighting, stats and cursor pagination | Do not duplicate; compare only for specific gaps. |
| Transport | `request`, Undici, URL-length GET/POST switching, direct stream request | Shared Fetch transport with request controls and raw request escape hatch | Retain the shared transport as the single implementation path. |

## Code-level findings and reusable lessons

### 1. RealTime Get

The reference implementation normalizes a string ID to an array, places IDs into the `ids` parameter, and dispatches to the `get` handler. Its integration test also verifies that a document can be read before the searcher view reflects it.

**Reusable lesson:** test the semantic difference between RealTime Get and ordinary search. Include single and multiple IDs, field selection, missing IDs, generic document typing, and read-after-write behavior.

**Do not copy:** mutation of caller-owned query objects or the generic `SearchResponse` shape without checking the exact Solr response contract.

### 2. SpellCheck

The reference client simply routes an existing query builder to the `spell` handler and returns an untyped JSON result.

**Reusable lesson:** the handler path and search correction workflow are valuable, but a modern client should provide named request and extensible response types. The current #272 work models SpellCheck as a query component and must document how it differs from configuring dictionaries/handlers on the Solr server.

### 3. BigInt-safe JSON

The reference client chooses between native `JSON` and `json-bigint` for parsing and serialization based on a client option. Its test deliberately uses `9007199254740993`, checks the value through RealTime Get, and exercises optimistic concurrency with `_version_`.

**Reusable lesson:** JavaScript's safe integer boundary is a real Solr client concern. A robust acceptance test must prove exact preservation through request serialization, response parsing, and a read/update cycle.

**Risks to address in our design:** parser output type, caller ergonomics, Zod/schema validation, error body parsing, performance, optional dependency policy, and whether raw Fetch responses remain untouched. Never imply that a TypeScript `number` can exactly represent every Solr long.

### 4. Streaming document ingestion

The reference `createAddStream()` creates `JSONStream.stringify()`, pipes it to the legacy `request` module, and exposes a Duplex via `duplexer`.

**Reusable lesson:** producers should be able to send documents incrementally and receive backpressure rather than building a giant array in memory.

**Risks to address in our design:** the current implementation bypasses the client's shared transport, request cancellation/timeout/error policy, and common response handling. Before choosing a Node Writable, Web WritableStream, or AsyncIterable API, verify the exact Solr update wire framing and how the final HTTP response and partial ingestion errors are surfaced. A chunked JSON array must not be assumed valid without protocol evidence.

### 5. Prepare commit

The reference helper sends an empty update with `prepareCommit=true`. Its documentation correctly notes that this invokes Lucene's prepare phase and does not make changes visible in the searcher.

**Reusable lesson:** the two-phase lifecycle is worth documenting for advanced ingestion/commit workflows.

**Audit outcome (#294):** `SolrCommitOptions` and `SolrJsonUpdateCommands.commit` do not model `prepareCommit`; the generic `request()` escape hatch can still send a caller-owned parameter. The Solr 10.1 Update Handler guide does not document `prepareCommit` as a supported public option. An implementation-source flag is insufficient to establish a stable cross-version contract. Therefore no dedicated method or compatibility claim is added; revisit only when official per-version documentation and deterministic lifecycle tests exist.

### 6. Other API design patterns

The reference query builder offers many chainable methods but also falls back to `set(parameter)` for everything not modelled. This confirms the value of an escape hatch, but its loose `any`-heavy option types and hand-built URL parameter strings provide limited compile-time guarantees.

**Reusable lesson:** a balanced client needs both a well-typed common path and an explicit escape hatch. Keep stable parameters typed, preserve unknown server response fields, and test encoding of special characters and repeated parameters.

## What not to port

- Callback/promise dual APIs or mutable chain-builder state.
- Legacy `request` and multiple overlapping HTTP stacks.
- Direct HTTP stream code that bypasses the shared transport.
- Unbounded `any`-based public request models where stable Solr parameters can be named.
- A mandatory BigInt parser or a silent global change to JSON numeric behavior.
- Claims of Solr 9/10 support based on a codebase whose declared target range ends at Solr 8.

## Follow-up tracking

- [#271 — RealTime Get PR (merged)](https://github.com/vsimko/node-solr-lambda/pull/271)
- [#272 — SpellCheck PR](https://github.com/vsimko/node-solr-lambda/pull/272)
- [#292 — BigInt-safe JSON](https://github.com/vsimko/node-solr-lambda/issues/292)
- [#293 — Suggester API](https://github.com/vsimko/node-solr-lambda/issues/293)
- [#294 — Prepare commit audit (closed as not planned)](https://github.com/vsimko/node-solr-lambda/issues/294)
- [#295 — Streaming ingestion](https://github.com/vsimko/node-solr-lambda/issues/295)

## References

- [Reference repository](https://github.com/lbdremy/solr-node-client)
- [Reference `lib/solr.ts` at reviewed commit](https://github.com/lbdremy/solr-node-client/blob/c1a2f2a3ec233a19f84b061eb01ff4ae718d14ef/lib/solr.ts)
- [Reference BigInt integration test](https://github.com/lbdremy/solr-node-client/blob/c1a2f2a3ec233a19f84b061eb01ff4ae718d14ef/test/bigint-test.ts)
- [Reference streaming ingestion test](https://github.com/lbdremy/solr-node-client/blob/c1a2f2a3ec233a19f84b061eb01ff4ae718d14ef/test/createAddStream-test.ts)

## Additional ecosystem review: Solarium, pysolr, and SolrJ

A second review focused on test suites and official client behavior rather than package naming or API breadth.

### Solarium (PHP)

[Solarium](https://github.com/solariumphp/solarium) is a mature, actively maintained PHP client with a large test suite. Useful patterns observed:

- Dedicated response-parser fixtures for Suggester and SpellCheck, including no-data responses, multiple dictionaries, word offsets, collations, and correction maps. This is a strong model for the planned typed Suggester API (#293).
- Separate standalone and SolrCloud integration test classes, with Docker fixtures spanning Solr 7/8/9/10. This makes topology assumptions explicit instead of treating Cloud as a flag on an otherwise identical test.
- Small reusable timeout contract tests and explicit HTTP response metadata tests (status, reason, headers, body, missing status). Our current timeout/error tests already cover much of the behavior; avoid duplication.
- The parser tests are valuable for wire-format edge cases, but our client intentionally returns extensible JSON response objects rather than parsing every response into domain objects.

### pysolr (Python)

[pysolr](https://github.com/django-haystack/pysolr) provides useful end-to-end data scenarios:

- Parent/child/grandchild nested documents and read-back.
- Unicode text round-trip (including non-ASCII characters).
- Cursor traversal across pages, custom result container classes, and deliberately long query strings.
- Both JSON and XML response format tests, plus error extraction from JSON, HTML/Jetty-style `<pre>`, and XML/Coyote-style bodies.
- SolrCloud tests with two nodes and ZooKeeper host mapping; this is infrastructure-specific and should not be copied unless the client explicitly supports node discovery/routing.

Some of these were already covered here: cursor pagination, request parameter encoding, raw XML request-body pass-through, JSON/text/malformed/empty HTTP errors, retry policy, timeout and cancellation, SolrCloud shard routing, and the pinned standalone/security/Cloud matrix. The gap audit has now added nested-document and Unicode document round-trip integration tests, a long-query transport test, and a custom-handler extensibility test on the implementation branch for PR #296. The nested-document test also captures an important Solr wire-format constraint: `/update/json/docs` flattens complex JSON by default, so the array form of `add()` is required to route nested documents through `/update`. Runtime assertions remain pending pinned CI execution.

### Apache SolrJ (official Java client)

[SolrJ documentation](https://solr.apache.org/guide/solr/10_1/deployment-guide/solrj.html) is useful as an authoritative reference for SolrCloud semantics and transport expectations. It documents connection/idle timeouts and replica preference/leader ordering for Cloud requests. Our client already exposes and tests timeout/cancellation behavior, but does not promise ZooKeeper discovery or SolrJ-style replica routing. Do not create parity work for capabilities outside our HTTP-client product boundary.

### Test-case decision

- [#297](https://github.com/vsimko/node-solr-lambda/issues/297) tracks the gap-only audit and implementation of nested-document, Unicode, long-request, custom-handler, and topology-documentation cases. The tests and documentation are present in PR #296; the pinned integration matrix is the remaining verification gate.
- Do not add XML response parsing merely because pysolr supports it; first decide whether XML responses are part of this client's public contract. Raw XML request-body pass-through is already tested.
- Do not add URL-length GET-to-POST switching solely for parity. Verify Solr behavior and the project's intended transport policy first.
- Do not duplicate cursor, timeout, retry, cancellation, error parsing, or SolrCloud shard-route tests already present in this repository.

### Sources

- [Solarium repository and test suite](https://github.com/solariumphp/solarium)
- [Solarium Suggester parser tests](https://github.com/solariumphp/solarium/blob/master/tests/Component/ResponseParser/SuggesterTest.php)
- [Solarium SpellCheck parser tests](https://github.com/solariumphp/solarium/blob/master/tests/Component/ResponseParser/SpellcheckTest.php)
- [pysolr shared integration test suite](https://github.com/django-haystack/pysolr/blob/master/tests/base.py)
- [pysolr SolrCloud tests](https://github.com/django-haystack/pysolr/blob/master/tests/test_cloud.py)
- [SolrJ 10.1 reference guide](https://solr.apache.org/guide/solr/10_1/deployment-guide/solrj.html)
- [Testcontainers Solr module](https://testcontainers.com/modules/solr/)

## Regression cases now being implemented

The cross-client audit produced a focused test tranche rather than a feature-parity checklist:

- `test/integration/solr-document-fidelity.test.ts` covers nested parent/child/grandchild JSON documents and Unicode/multi-valued fields with persisted read-back.
- `test/transport-serialization.test.ts` covers a deliberately long query parameter and locks down the current GET behavior; there is no implicit GET-to-POST fallback.
- `test/raw-request.test.ts` covers repeated parameters and unknown plugin-defined response fields on a custom handler.
- These cases are registered in the standard standalone integration suite. The pinned Solr matrix must pass before the compatibility document claims runtime verification.
- Multi-node SolrCloud, XML response parsing, automatic URL-length switching, ZooKeeper discovery, and SolrJ replica-routing are explicitly not introduced by these tests.
