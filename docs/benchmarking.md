# Performance benchmarking

The repository includes a lightweight, opt-in benchmark harness. Its purpose is to catch obvious client-side overhead and compare relative behavior, not to establish universal performance rankings or publish hardware-independent numbers.

## Scope

The harness supports five workloads:

- **Query:** repeated `GET /select?q=*:*&rows=N&wt=json` requests.
- **Facet:** classic field faceting over `title_s` and `body_s`.
- **Large response:** retrieves documents with `id,title_s,body_s`.
- **Bulk ingestion:** concurrent JSON-array `add()` requests followed by one hard commit.
- **Streaming ingestion:** one `addStream()` request followed by one hard commit.

Each workload can run through the typed client, direct Node.js Fetch, or both. The direct Fetch path is the low-level baseline for the same Node runtime and HTTP stack. It helps estimate the overhead of this library's client layer.

The JSON report includes Node/V8 and host metadata, optional Solr version, elapsed time, throughput, request latency percentiles (p50/p95/p99), process CPU time, RSS/heap deltas, sampled peak RSS, and event-loop delay. Query workloads also report response size and result/facet counts.

## Recommended routine

For a pragmatic comparison, start with only **query** and **bulk ingestion**:

- Use GitHub Actions' manually triggered `Pragmatic benchmark` workflow.
- Use the pinned Solr 10.1.0 container and Node.js 26 runtime.
- Use the small default dataset and low concurrency configured in that workflow.
- Compare this client with direct Fetch on the same runner and Solr instance. Each mode uses its own disposable collection to avoid data/order effects.
- Keep the raw JSON reports as workflow artifacts. Treat the numbers as a relative smoke baseline, not as a stable performance claim.

The workflow is opt-in and is not a required PR check. It does not run long/high-concurrency workloads and does not fail based on performance thresholds. Run it only when a change plausibly affects request serialization, transport, response parsing, or ingestion.

For a local exploratory run:

```sh
npm ci
npm run build
SOLR_BASE_URL=http://127.0.0.1:8983/solr \
SOLR_COLLECTION=benchmark \
SOLR_VERSION=10.1.0 \
npm run bench -- --workload query --mode both \
  --iterations 25 --rows 10 --concurrency 1 --warmup 3 \
  --output benchmark-query.json
```

The collection must be pre-created and disposable. Never point the benchmark at a production or shared collection. The runner adds uniquely named documents for ingestion workloads and does not create, clear, or delete collections/documents.

## External client comparison

The primary comparison remains **typed client vs direct Fetch** because it isolates the overhead added by this package in the same Node.js runtime.

A third-party JavaScript client may be added as a separate optional comparison only if it is actively maintained, supports the Solr version under test, and can execute equivalent query and bulk-update semantics. The historical `solr-client` package is a possible legacy reference for Solr 8, but its documented support is Solr 3–8 and Node.js 12+; it should not be presented as a current modern baseline. Verify the exact package release and API before using it.

A client from another language (for example Apache SolrJ) is not a like-for-like replacement: runtime, HTTP implementation, JSON handling, and client architecture all change. Such a comparison can be interesting as a separate ecosystem experiment, but it should not be used to claim that one JavaScript client is faster than another.

## Safety and interpretation

- The benchmark requires a running Solr server and a **pre-created disposable collection**.
- Use identical Solr version, schema/configset, dataset, request parameters, and JVM settings for any meaningful comparison.
- `--mode both` is convenient for exploration, but it runs client mode before Fetch mode. Separate collections/processes are preferred when order or mutation could affect results.
- Query defaults to `q=*:*` and returns 10 documents; use `--rows 0` for count-only requests.
- Bulk request latency is measured per batch; final commit duration is reported separately.
- Streaming throughput excludes the final commit; ingestion and commit durations are reported separately.
- Peak RSS is sampled and may miss short-lived spikes. CPU and memory metrics are process-level.
- GitHub-hosted runner performance varies. Compare modes from the same workflow run only; do not compare absolute numbers across different runs as controlled experiments.
- There are no performance thresholds in ordinary CI. Benchmark reports are diagnostic artifacts, not release gates.

## Further work

Use [Issue #339](https://github.com/vsimko/node-solr-lambda/issues/339) for the bounded relative baseline. Keep broader performance research under [Issue #314](https://github.com/vsimko/node-solr-lambda/issues/314), but do not expand it into long-running benchmark infrastructure unless real user workloads justify it.
