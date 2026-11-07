# ADR 0006: Backpressure-aware JSON-array document ingestion

- Status: Accepted
- Date: 2026-11-07
- Issue: [#295](https://github.com/vsimko/node-solr-lambda/issues/295)

## Context

The existing `add()` method accepts a document or an array and serializes the complete value before sending the request. That is convenient for ordinary batches but requires the caller and client to hold the full document array and serialized JSON body in memory. Large ingestion workloads need a streaming alternative that composes with the shared Fetch transport.

The pinned Solr 8.11, 9.11, and 10.1 baselines accept JSON document arrays through the Update Handler. Solr 9.11 and 10.1 `JsonLoader` source parses the array incrementally and invokes the update processor for each document. The client must still verify the exact request behavior and memory/cancellation semantics against all pinned images.

## Decision

Add `SolrClient.addStream(documents: AsyncIterable<SolrDocument>, options?, requestOptions?)`. Node.js `Readable` streams are supported through their async-iterator interface; the public API does not introduce a Node-specific Duplex stream.

The client frames a valid top-level JSON array and serializes one document at a time through the configured JSON codec. A Web `ReadableStream<Uint8Array>` with a one-chunk queue is passed to Node Fetch using `duplex: "half"`. This preserves bounded buffering and allows the Fetch consumer to apply backpressure.

The stream uses the existing `/update` endpoint and reuses update parameters, auth, headers, request defaults, validation, timeout, cancellation, response parsing, and error handling. Each document is validated before serialization when an input schema is configured. Streaming POST requests are never retried because an `AsyncIterable` cannot be replayed safely.

## Alternatives considered

1. **Buffer the iterable and call `add()`: rejected.** It defeats the memory-bound requirement.
2. **Node `Writable`/`Duplex` as the public input: rejected.** It is idiomatic for Node pipelines but couples the public API to Node stream types and writable lifecycle semantics. Node `Readable` remains supported through its `AsyncIterable` interface.
3. **Web `WritableStream` as the public input: rejected.** The transport needs a pull-based request body. Adapting a writable sink to that source adds a second lifecycle and backpressure contract; an `AsyncIterable` already models pull-driven production.
4. **Raw streaming request-body API: rejected.** It would make callers responsible for JSON framing, endpoint selection, content type, validation, and retry safety. The transport owns these concerns for `addStream()`.
5. **Emit independent top-level JSON objects or arbitrary chunks: rejected.** Those are not the documented JSON update request format.
6. **NDJSON as the baseline wire format: rejected for the pinned versions.** The selected compatibility baseline is the JSON array accepted by the standard JSON Update Handler; do not assume newer NDJSON-specific support.
7. **Retry streaming POST requests: rejected.** The source may already be consumed and Solr may have accepted a prefix of documents, so replay could duplicate or corrupt ingestion semantics.

## Consequences

- The Web stream queue has a high-water mark of one chunk. Memory is bounded by that queued chunk, at most one in-flight pull/serialization, and the largest individual document; the full iterable is never materialized. A single unusually large document can still require substantial memory.
- Producer exceptions, aborts, timeouts, and consumer cancellation terminate the stream and call the iterator's `return()` cleanup path.
- A failure after some chunks have been sent may leave earlier documents accepted by Solr. The operation is not atomic and does not roll back automatically.
- The final Solr response is available only after the request body completes and the server responds.
- Commit visibility follows the caller's normal Solr commit/soft-commit policy; `addStream()` does not commit automatically.

## Verification

Consumer type fixtures assert default/custom response generics and reject synchronous iterables and invalid option types. Unit tests cover JSON-array framing, slow-consumer backpressure, slow producers, Node.js Readable input, empty input, producer and validation failures, HTTP errors, timeout and caller/consumer cancellation, iterator cleanup, configured JSON codec use, shared auth/headers/request defaults, and no retry for consumed streaming POST bodies. The full CI run [#42376175065](https://github.com/vsimko/node-solr-lambda/actions/runs/42376175065) passed all 30 jobs: Node.js 20/22/24 typecheck, type tests, unit tests, build and release checks; standalone, authenticated, and SolrCloud integration matrices for Solr 8.11.4, 9.11.0, and 10.1.0; and documentation checks. The standalone integration logs confirm that the deterministic 250-document fixture was ingested and read back with all 250 documents on each pinned Solr image. These results certify the tested request path only; partial ingestion remains possible if the source or connection fails after Solr accepts a prefix.
