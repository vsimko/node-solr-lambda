# Raw requests

Use `SolrClient.requestRaw()` when a Solr endpoint is not yet represented by a dedicated client method. It is an escape hatch for Solr endpoints, not a separate HTTP client: it shares the configured origin, authentication, headers, request defaults, validation, retry policy, timeout, cancellation, and error handling.

## Example

```ts
import { createSolrClient } from "solr-ts-client";

const solr = createSolrClient({
  baseUrl: "https://search.example/solr",
  collection: "books",
  auth: {
    type: "bearer",
    token: process.env.SOLR_TOKEN!
  }
});

const response = await solr.requestRaw("/solr/books/update", {
  method: "POST",
  headers: { "content-type": "application/xml" },
  body: "<add><doc><field name=\"id\">book-1</field></doc></add>",
  timeoutMs: 10_000
});

const responseText = await response.text();
```

## Path and origin rules

- Pass a path relative to the configured Solr base URL, or an absolute HTTP(S) URL on the same origin.
- Absolute URLs on another origin are rejected before Fetch is called. This prevents configured Basic/Bearer credentials and client headers from being sent to an unrelated host.
- Absolute URLs containing embedded credentials or a fragment are rejected.
- Reverse-proxy prefixes in `baseUrl` are retained when a relative path is resolved.
- The method does not infer or validate whether a custom endpoint exists on the target Solr version.

## Request options and body formats

`requestRaw(path, options)` accepts the shared `RequestOptions` model:

- `method`: GET, POST, PUT, or DELETE.
- `query`: a typed parameter object or `URLSearchParams`. Arrays become repeated query parameters; booleans and null values are stringified; dates use ISO 8601.
- `headers`: request-specific headers, which take precedence over client defaults.
- `body`: a string is sent unchanged. Set its `Content-Type` explicitly for XML or other non-JSON formats. Non-string bodies are JSON serialized and receive `application/json` by default.
- `signal` and `timeoutMs`: per-request cancellation and timeout controls.
- `operation`: optional operation name for configured input/output validation.

The response is the raw Fetch `Response`; the caller chooses how to consume it (for example, `text()`, `json()`, or a stream reader). For non-success HTTP responses, the method rejects with `SolrHttpError`, just like typed JSON methods. Network failures, timeouts, caller cancellation, and configured validation failures use the shared error classes.

The timeout and caller signal remain active while the response body is consumed. Consuming or cancelling the body releases the transport's stream resources.

## Compatibility

Raw request support is a client transport capability, not a compatibility guarantee for arbitrary Solr endpoints. The generic `requestRaw()` path is unit-tested, but custom endpoint behavior is marked **unverified** on Solr 8, 9, and 10 until each endpoint has a dedicated version-specific integration test. Prefer a typed API method when one exists.
