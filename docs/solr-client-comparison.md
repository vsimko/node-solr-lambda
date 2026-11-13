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
| RealTime Get | `realTimeGet(ids, query)` against `/get` | Typed `get()` API merged in [PR #271](https://github.com/vsimko/solr-ts-client/pull/271); single/multi-ID uncommitted read-after-write integration passed on pinned Solr 8.11.4/9.11.0/10.1.0 | Complete; retain the explicit distinction from ordinary search. |
| SpellCheck | `spell(query)` against `/spell` | Typed optional query-component contracts merged in [PR #272](https://github.com/vsimko/solr-ts-client/pull/272); configured-handler integration verifies suggestions, frequencies, and collations on pinned Solr 8.11.4/9.11.0/10.1.0 | Complete; component/dictionary configuration remains server-owned. |
| Suggester | No equivalent dedicated helper found in reviewed client source | Typed optional query component merged in [PR #298](https://github.com/vsimko/solr-ts-client/pull/298); disposable configured-handler integration verifies terms and weights on pinned Solr 8.11.4/9.11.0/10.1.0 | Complete; use the configured SearchHandler path rather than assuming a fixed `/suggest` endpoint. |
| BigInt-safe JSON | Optional `bigint` flag selects `json-bigint` parser/stringifier | Injectable `SolrJsonCodec` merged in [PR #299](https://github.com/vsimko/solr-ts-client/pull/299); callers may provide a lossless BigInt-aware codec while native JSON remains the default | Complete as an opt-in codec hook; no mandatory parser dependency or global numeric conversion. |
| Streaming document ingestion | `createAddStream()` returns a Duplex that serializes document objects | Bounded-memory `addStream(AsyncIterable)` uses a backpressure-aware Web ReadableStream and shared Fetch transport; 250-document read-back passed on pinned Solr 8.11.4/9.11.0/10.1.0 | Complete; preserve partial-ingestion/no-retry semantics and avoid a Node-specific Duplex abstraction. |
| Prepare commit | `prepareCommit()` sends `prepareCommit=true` to Update Handler | No dedicated convenience method; generic `request()` can carry caller-owned parameters | Audited in [#294](https://github.com/vsimko/solr-ts-client/issues/294): not promoted to a typed API because the pinned public Solr guides do not document it as a supported option and cross-version lifecycle evidence is absent. |
| Terms handler | `termsSearch()` | No dedicated typed API | Deferred pending demand; raw request remains available. |
| Search features | Query builder includes facets, grouping, joins, MLT and other query helpers | Broad typed query surface including facets, grouping, MLT, geospatial, JSON facets, highlighting, stats and cursor pagination | Do not duplicate; compare only for specific gaps. |
| Transport | `request`, Undici, URL-length GET/POST switching, direct stream request | Shared Fetch transport with request controls and raw request escape hatch | Retain the shared transport as the single implementation path. |

## Code-level findings and reusable lessons

### 1. RealTime Get

The reference implementation normalizes a string ID to an array, places IDs into the `ids` parameter, and dispatches to the `get` handler. Its integration test also verifies that a document can be read before the searcher view reflects it.

**Implementation and evidence:** `get()` has distinct single-ID and multi-ID contracts. The integration test proves that both forms can read uncommitted documents before the ordinary searcher view is updated on pinned Solr 8.11.4/9.11.0/10.1.0.

**Do not copy:** mutation of caller-owned query objects or the generic `SearchResponse` shape without checking the exact Solr response contract.

### 2. SpellCheck

The reference client simply routes an existing query builder to the `spell` handler and returns an untyped JSON result.

**Implementation and evidence:** SpellCheck is modelled as an optional query component with named options and extensible response contracts. The configured-handler integration test verifies suggestions, frequencies, and collation on all three pinned Solr versions. The client does not create or mutate server dictionaries/handlers.

### 3. BigInt-safe JSON

The reference client chooses between native `JSON` and `json-bigint` for parsing and serialization based on a client option. Its test deliberately uses `9007199254740993`, checks the value through RealTime Get, and exercises optimistic concurrency with `_version_`.

**Implementation and evidence:** PR #299 added the injectable `SolrJsonCodec` and ADR 0005. Native JSON remains the default; callers can supply a lossless parser/stringifier and type `_version_` as `bigint`. This avoids a mandatory dependency or silent global numeric conversion.

**Risks to address in our design:** parser output type, caller ergonomics, Zod/schema validation, error body parsing, performance, optional dependency policy, and whether raw Fetch responses remain untouched. Never imply that a TypeScript `number` can exactly represent every Solr long.

### 4. Streaming document ingestion

The reference `createAddStream()` creates `JSONStream.stringify()`, pipes it to the legacy `request` module, and exposes a Duplex via `duplexer`.

**Implementation and evidence:** `addStream()` accepts an `AsyncIterable`, streams a top-level JSON array through the shared Fetch transport with bounded backpressure, and disables retries for the non-replayable POST. The 250-document fixture passed count/order read-back on all three pinned Solr versions. A source/network failure can still leave a prefix ingested; the operation is not atomic.

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

- [#271 — RealTime Get PR (merged)](https://github.com/vsimko/solr-ts-client/pull/271)
- [#272 — SpellCheck PR (merged)](https://github.com/vsimko/solr-ts-client/pull/272)
- [#292 — BigInt-safe JSON (completed via PR #299)](https://github.com/vsimko/solr-ts-client/issues/292)
- [#293 — Suggester API (completed via PR #298)](https://github.com/vsimko/solr-ts-client/issues/293)
- [#294 — Prepare commit audit (closed as not planned)](https://github.com/vsimko/solr-ts-client/issues/294)
- [#295 — Streaming ingestion (completed via PRs #300, #317, #321, and #325)](https://github.com/vsimko/solr-ts-client/issues/295)

## References

- [Reference repository](https://github.com/lbdremy/solr-node-client)
- [Reference `lib/solr.ts` at reviewed commit](https://github.com/lbdremy/solr-node-client/blob/c1a2f2a3ec233a19f84b061eb01ff4ae718d14ef/lib/solr.ts)
- [Reference BigInt integration test](https://github.com/lbdremy/solr-node-client/blob/c1a2f2a3ec233a19f84b061eb01ff4ae718d14ef/test/bigint-test.ts)
- [Reference streaming ingestion test](https://github.com/lbdremy/solr-node-client/blob/c1a2f2a3ec233a19f84b061eb01ff4ae718d14ef/test/createAddStream-test.ts)

## Additional ecosystem review: Solarium, pysolr, and SolrJ

A second review focused on test suites and official client behavior rather than package naming or API breadth.

### Solarium (PHP)

[Solarium](https://github.com/solariumphp/solarium) is a mature, actively maintained PHP client with a large test suite. Useful patterns observed:

- Dedicated response-parser fixtures for Suggester and SpellCheck, including no-data responses, multiple dictionaries, word offsets, collations, and correction maps, remain useful design references. This project now has typed optional query components and configured-handler integration tests for both.
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

Some of these were already covered here: cursor pagination, request parameter encoding, raw XML request-body pass-through, JSON/text/malformed/empty HTTP errors, retry policy, timeout and cancellation, SolrCloud shard routing, and the pinned standalone/security/Cloud matrix. The gap audit in PR #296 added nested-document and Unicode document round-trip integration tests, a long-query transport test, and a custom-handler extensibility test. Nested-document and Unicode read-back passed on pinned Solr 8.11.4/9.11.0/10.1.0 in CI run #42392182590; long-query and custom-handler behavior is covered by transport unit tests. The nested-document test also captures an important Solr wire-format constraint: `/update/json/docs` flattens complex JSON by default, so the array form of `add()` is required to route nested documents through `/update`.

### Apache SolrJ (official Java client)

[SolrJ documentation](https://solr.apache.org/guide/solr/10_1/deployment-guide/solrj.html) is useful as an authoritative reference for SolrCloud semantics and transport expectations. It documents connection/idle timeouts and replica preference/leader ordering for Cloud requests. Our client already exposes and tests timeout/cancellation behavior, but does not promise ZooKeeper discovery or SolrJ-style replica routing. Do not create parity work for capabilities outside our HTTP-client product boundary.

### Test-case decision

- [#297](https://github.com/vsimko/solr-ts-client/issues/297) tracks the gap-only audit and implementation of nested-document, Unicode, long-request, custom-handler, and topology-documentation cases. The tests and documentation are present in PR #296; the pinned integration matrix is the remaining verification gate.
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
