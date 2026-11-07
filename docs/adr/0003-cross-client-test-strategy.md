# ADR 0003: Cross-client regression test selection and transport boundaries

- Status: Accepted
- Date: 2026-11-07
- Decision owners: repository maintainers

## Context

A review of mature Solr clients found reusable test scenarios in Solarium (PHP), pysolr (Python), and the official SolrJ (Java) client. The most useful gaps were not new endpoint wrappers but data fidelity and extension-contract tests:

- nested parent/child/grandchild documents;
- exact Unicode and multi-valued field round-trips;
- long query parameter handling;
- custom handler requests with repeated parameters and unknown response fields;
- clear separation of standalone, security-enabled standalone, SolrCloud, and multi-node test requirements.

The existing project already tests cursorMark, retry policy, timeout, cancellation, HTTP error payloads, raw XML request-body pass-through, SolrCloud shard routing, and its pinned Node/Solr matrix. Those tests must not be duplicated.

## Decisions

1. **Preserve Solr's open document model and update wire format.** Nested documents remain ordinary JSON document data using Solr's named pseudo-field representation. Solr's `/update/json/docs` convenience route flattens complex JSON by default, so callers must use the array form `add([document])` to select `/update` when indexing nested structures. Document this distinction; do not add a client-specific nested-document abstraction or silently rewrite single-document requests.
2. **Verify data fidelity end-to-end.** Add integration tests for nested parent/child/grandchild documents and exact Unicode/multi-valued field read-back on the existing `_default` configset. Use isolated IDs and the shared fixture cleanup.
3. **Keep long-query transport behavior explicit.** The current query path sends GET requests and preserves encoded query parameters; it does not silently switch long requests to POST. Test that the client does not truncate or double-encode the query. A future GET/POST policy requires a separate design decision and compatibility evidence.
4. **Keep custom handlers extensible.** The generic `request()` escape hatch must preserve repeated query parameters and return unknown/plugin-defined JSON fields without narrowing them to a closed response model.
5. **Do not add XML response parsing by implication.** Raw XML request-body pass-through is already supported and tested. XML response parsing is not part of this test tranche unless explicitly selected as a public transport contract.
6. **Keep topology requirements explicit.** Nested-document and Unicode round-trip tests run against standalone Solr on the pinned version matrix. Security-enabled standalone and SolrCloud suites remain separate. Multi-node SolrCloud is opt-in and must only be required by tests that exercise behavior needing multiple live nodes; no ZooKeeper discovery or SolrJ replica-routing parity is implied.
7. **Use external clients as test references, not parity checklists.** Adopt cases only when they validate behavior this HTTP client actually promises. Track additions and exact evidence in [#297](https://github.com/vsimko/node-solr-lambda/issues/297).

## Validation status

- Test code and documentation are committed on PR #296.
- Pinned Node.js/Solr CI execution is required before the new integration assertions are marked verified.

## Consequences

- New tests are registered in the normal standalone integration suite and run on Solr 8.11.4, 9.11.0, and 10.1.0 as part of the existing CI matrix.
- Unit tests assert long-query preservation and custom-handler extensibility without requiring a running Solr server.
- The nested-document integration test deliberately sends an array through `add()` so it uses `/update`, then reads the named hierarchy through `fl=*,[child]`.
- The API inventory links each test to the relevant public operation. Compatibility claims are updated only after CI execution succeeds.
- No runtime dependency, public API, URL-length fallback, XML response parser, SolrCloud discovery mechanism, or package behavior is introduced by this decision.

## References

- [ADR 0002: Solr client API coverage](0002-solr-client-api-coverage.md)
- [Cross-client comparison and test findings](../solr-client-comparison.md)
- [Solarium](https://github.com/solariumphp/solarium)
- [pysolr](https://github.com/django-haystack/pysolr)
- [SolrJ 10.1 documentation](https://solr.apache.org/guide/solr/10_1/deployment-guide/solrj.html)
- [Solr nested document indexing](https://solr.apache.org/guide/solr/10_1/indexing-guide/indexing-nested-documents.html)
- [Solr child document transformer](https://solr.apache.org/guide/solr/10_1/query-guide/document-transformers.html)