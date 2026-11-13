# Performance benchmarking

The repository includes a lightweight, opt-in benchmark harness. It has two distinct possible purposes, which must not be conflated:

1. **Wrapper-overhead baseline:** compare this package with direct Node.js Fetch to estimate the cost of the abstractions and processing added by this library.
2. **Competitive benchmark:** compare independent Solr client libraries that provide comparable functionality in the same JavaScript runtime.

The current harness implements only the first purpose. It does **not** establish that this package is faster, more efficient, or more capable than competing JavaScript Solr clients.

## Scope

The harness supports five workloads:

- **Query:** repeated `GET /select?q=*:*&rows=N&wt=json` requests.
- **Facet:** classic field faceting over `title_s` and `body_s`.
- **Large response:** retrieves documents with `id,title_s,body_s`.
- **Bulk ingestion:** concurrent JSON-array `add()` requests followed by one hard commit.
- **Streaming ingestion:** one `addStream()` request followed by one hard commit.

Each workload can run through the typed client, direct Node.js Fetch, or both. The direct Fetch path is the low-level baseline for the same Node runtime and HTTP stack. It helps estimate the overhead of this library's client layer; it is not an independent competing Solr client.

The JSON report includes Node/V8 and host metadata, optional Solr version, elapsed time, throughput, request latency percentiles (p50/p95/p99), process CPU time, RSS/heap deltas, sampled peak RSS, and event-loop delay. Query workloads also report response size and result/facet counts.

## Recommended routine: wrapper-overhead baseline

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
SOLR_BASE_URL=http://127.0.0.1:8983/solr \\
SOLR_COLLECTION=benchmark \\
SOLR_VERSION=10.1.0 \\
npm run bench -- --workload query --mode both \\
  --iterations 25 --rows 10 --concurrency 1 --warmup 3 \\
  --output benchmark-query.json
```

The collection must be pre-created and disposable. Never point the benchmark at a production or shared collection. The runner adds uniquely named documents for ingestion workloads and does not create, clear, or delete collections/documents.

## JavaScript ecosystem: potential competitors

A preliminary survey did not identify a clearly maintained, broadly adopted, general-purpose JavaScript Solr client that is an obvious modern benchmark peer. The closest candidates have important limitations:

| Candidate | What it is | Assessment for a competitive benchmark |
| --- | --- | --- |
| `solr-client` (`lbdremy/solr-node-client`) | The best-known standalone Node.js Solr client by historical GitHub adoption; supports query and update operations. | The strongest historical comparator, but not a current baseline: latest npm release is `0.10.0-rc10` from March 2022; its documented compatibility is Solr 3–8. It is marked inactive/abandoned by package-health sources. A Solr 8 legacy comparison may be possible after compatibility and dependency checks, but should be labelled legacy. |
| `feathers-solr` | FeathersJS database/service adapter over Solr, with query, CRUD, and raw Solr parameter support. | Not a general-purpose client API; it is framework-specific and its published release is old/inactive. It could be a relevant competitor only for Feathers applications, not for a general Solr client shoot-out. |
| `solrts` / SolrTS | Small TypeScript query-oriented client intended to make Solr query construction more expressive. | Very small ecosystem footprint in available package directories; not a credible broad-market performance baseline without evidence of active maintenance and real adoption. |
| Apache Solr generated JavaScript client | OpenAPI-generated JavaScript client used by the Solr Admin UI. | Not published as a standalone npm release and not currently presented by Apache Solr as a general-purpose external client package. It is an interesting first-party implementation reference, not a ready-made npm competitor. |

The historical `solr-client` package is therefore the answer to “which existing package is our biggest recognizable competitor?” It is **not** the answer to “which actively maintained client should we use to prove competitiveness today?” At present, there may be no strong, maintained, like-for-like competitor in the general-purpose Node.js Solr-client niche.

Before adding any competitor to the harness, verify the exact npm release, repository activity, supported Solr versions, Node compatibility, security/dependency status, and whether equivalent query and bulk-ingestion semantics can be implemented. Do not add an adapter or an abandoned package merely to make the benchmark look competitive.

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

Use [Issue #339](https://github.com/vsimko/node-solr-lambda/issues/339) for the bounded wrapper-overhead baseline and candidate evaluation. Keep broader performance research under [Issue #314](https://github.com/vsimko/node-solr-lambda/issues/314), but do not expand it into long-running benchmark infrastructure unless real user workloads justify it.
