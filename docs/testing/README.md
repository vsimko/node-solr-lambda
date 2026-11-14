# Testing and verification

The [testing and quality strategy](../testing-strategy.md) is the canonical description of test layers and what each layer proves. This page is a short navigation guide.

| Test layer | Purpose | Command or evidence |
|---|---|---|
| Static types and declarations | Validate implementation types and consumer-facing declarations | `npm run typecheck`, `npm run test:types` |
| Unit and contract | Validate request serialization, transport behavior, errors, and cancellation | `npm test` |
| Standalone Solr integration | Verify real endpoint behavior on pinned standalone Solr images | `npm run test:integration` |
| Security integration | Verify authentication and authorization behavior | CI security-integration matrix |
| SolrCloud integration | Verify cluster-aware behavior against the configured topology | CI cloud-integration matrix |
| Destructive opt-in | Verify high-risk actions only in disposable infrastructure | Explicit manual workflow and opt-in tests |
| Performance | Measure client behavior on a controlled host | `npm run bench` |

A successful check proves only the behavior covered by that check. Consult the [compatibility matrix](../compatibility.md) before making a server support claim. Do not infer runtime compatibility from compilation or unit tests.

For API work, also read [API coverage](../api-coverage.md), the [endpoint inventory](../endpoint-inventory.md), and the relevant integration test. For cross-cutting regression coverage, read [ADR 0003](../adr/0003-cross-client-test-strategy.md).
