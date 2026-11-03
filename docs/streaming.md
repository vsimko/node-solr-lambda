# Streaming Expressions

`stream()` executes a Streaming Expression against the configured core or collection. The client sends the expression in the `expr` query parameter and explicitly requests `wt=json`. The shared transport reads the complete response body and parses it as JSON before resolving the Promise.

## Response and memory behavior

This API is **not** an incremental tuple-stream parser. It does not expose response chunks, parse a chunked tuple protocol, or provide a memory-bound/backpressure guarantee. Chunk-boundary and malformed tuple-protocol tests are therefore not applicable to the current implementation. A non-JSON response is handled by the shared response parser, not by a Streaming Expressions-specific wire parser.

The integration suite verifies a `search()` expression against a disposable SolrCloud collection on Solr 8.11.4, 9.11.0, and 10.1.0. Unit tests verify the JSON response envelope, caller cancellation while the response body is being consumed, and cleanup after a response-body stream error.

For large result exports that need incremental byte consumption and Web Streams backpressure, use the [Export API](export.md) through `export()` or `exportStream()`. Those methods return the raw response/body stream; they are separate from `stream()`.

## Example

```ts
const result = await solr.stream<{ "result-set": { docs: Array<{ id: string }> } }>(
  'search(catalog, q="status:published", fl="id", sort="id asc")'
);

for (const document of result["result-set"].docs) {
  console.log(document.id);
}
```
