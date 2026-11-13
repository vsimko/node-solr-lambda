# Performance benchmarking

The repository includes a dependency-free benchmark harness to compare the typed client with direct Node.js Fetch calls against the same Solr endpoint. It is intended to establish reproducible baselines before optimization; it does not claim that the client is faster than direct HTTP or competing Solr clients.

## Scope

The runner supports five workloads:

- **Query:** repeated `GET /select?q=*:*&rows=N&wt=json` requests with configurable warm-up and concurrency.
- **Facet:** classic field faceting over the benchmark `title_s` and `body_s` fields, returning facet counts without document rows.
- **Large response:** retrieves `rows=N` documents including `id,title_s,body_s` to measure larger JSON response parsing and transfer.
- **Bulk ingestion:** concurrent JSON-array `add()` requests followed by one hard commit.
- **Streaming ingestion:** one `addStream()` request followed by one hard commit.

Each workload can run through the typed client, direct Fetch, or both. The direct Fetch path uses the same Node.js runtime and network stack, so the comparison isolates client-layer serialization/transport overhead rather than comparing different HTTP implementations.

Query, facet, and large-response results also report serialized response bytes, returned document count, Solr numFound, and facet bucket count where applicable. The JSON report includes Node/V8 and host metadata (OS release, architecture, CPU model/count, and total physical memory), optional Solr version, elapsed time, throughput, request latency percentiles (p50/p95/p99), process CPU time, RSS/heap deltas, sampled peak RSS, and event-loop delay. For bulk requests, latency is measured per batch; for streaming, ingestion and commit times are reported separately.

## Requirements and safety

- Node.js 22, 24, or 26 (the v4 package engine range). Node.js 20 reached EOL and is not supported.
- A running Solr server and a **pre-created disposable collection**.
- A stable, dedicated host for meaningful performance comparisons.
- Never point the benchmark at a production or shared Solr collection. The script adds uniquely named documents and does not create, clear, or delete collections/documents.

Build and run:

```sh
npm ci
npm run build
SOLR_BASE_URL=http://127.0.0.1:8983/solr \
SOLR_COLLECTION=benchmark \
SOLR_VERSION=10.1.0 \
npm run bench -- --workload all --mode both \
  --docs 10000 --batch-size 500 --iterations 100 \
  --rows 10 --concurrency 4 --warmup 10 --payload-bytes 256 \
  --output benchmark-node-solr.json
```

The collection must exist before the run. For a local disposable standalone instance, create it with the Solr image's `solr-precreate` command or the Collections API. The script never changes server topology or collection configuration.

Authentication can be supplied without putting secrets in the URL:

```sh
SOLR_USERNAME=benchmark-user SOLR_PASSWORD='...' npm run bench -- --workload query
# Or:
SOLR_BEARER_TOKEN='...' npm run bench -- --workload query
```

Use `npm run bench -- --help` to list options. `SOLR_TIMEOUT_MS` controls the client request timeout. `SOLR_VERSION` is a label recorded in the report; the script does not infer the server version.

## Reproducibility protocol

For a defensible comparison:

1. Pin the exact Solr Docker image and record its configset, JVM flags, heap, security mode, and collection schema.
2. Record Node.js version, OS/kernel, architecture, CPU model/count, memory limits, and Git commit from the JSON report.
3. Use the same Solr host, collection settings, document count, payload size, batch size, query rows, concurrency, and warm-up for each run.
4. Use a fresh disposable collection or equivalent clean dataset for each mode. The runner intentionally does not delete documents; every run writes unique IDs.
5. Run each mode in a separate process for serious comparisons. `--mode both` is convenient for exploratory checks, but client mode runs before direct Fetch and both mutate the collection.
6. Repeat at least five times, report medians and spread across runs, and avoid concurrent workloads on the same Solr server.
7. Keep raw JSON reports with the environment details. Do not compare results from different hardware or Solr/JVM configurations as if they were controlled experiments.

## Interpretation and limitations

- Query defaults to `q=*:*` and returns 10 documents; use `--rows 0` for a count-only request or adjust `--rows` to measure response parsing at another size.
- Bulk request latency is measured per batch. The reported batch throughput excludes the final commit; the commit duration is reported separately.
- Streaming throughput excludes the final commit; ingestion and commit durations are reported separately.
- Peak RSS is sampled every 20 ms and can miss short-lived spikes. CPU and memory measurements are process-level, not container-level.
- The current suite is a first baseline, not a complete workload model. Facet coverage uses two representative string fields and is not a substitute for workload-specific facet schemas. Large-response coverage depends on the collection already containing enough documents; run bulk ingestion first or use a populated disposable collection. The suite does not yet cover concurrent streaming producers, SolrCloud routing, TLS, or comparisons against third-party clients.
- There are no performance thresholds in ordinary CI. CI tests the benchmark primitives, not noisy performance numbers. Add regression budgets only after stable baselines and variance are understood.

## Next steps

Use [Issue #314](https://github.com/vsimko/solr-ts-client/issues/314) to track real benchmark runs, workload expansion, comparison against maintained JavaScript clients, and evidence-backed optimization. No optimization or performance-leadership claim should be made from the harness alone.
