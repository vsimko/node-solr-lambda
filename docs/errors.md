# Error handling

The client uses typed errors. Catch these errors at the application boundary.

## `SolrHttpError`

The client throws `SolrHttpError` when Solr returns a non-success HTTP status.

| Property | Description |
| --- | --- |
| `status` | HTTP status code. |
| `statusText` | HTTP status text. |
| `endpoint` | Request origin and path. The query string is omitted. |
| `body` | Raw response body as text. An empty response is an empty string. |
| `payload` | Parsed JSON, raw text when JSON parsing fails, or `undefined` for an empty body. |
| `solrError` | Parsed Solr `error` object when the response contains one. |
| `cause` | Optional underlying error, when one exists. |

The `solrError` object preserves Solr fields such as `code`, `msg`, and `metadata`. The error message uses `solrError.msg` when it is available. Otherwise, it uses the HTTP status and status text.

## `SolrNetworkError`

The client throws `SolrNetworkError` when Fetch fails before a response is received, or when reading a non-streaming response body fails.

- `endpoint` contains the request origin and path without query parameters.
- `cause` contains the original Fetch or body-read error.

The transport can retry configured network failures. When the retry policy is exhausted, the final error is `SolrNetworkError`.

## `SolrTimeoutError`

The client throws `SolrTimeoutError` when the configured client or per-request timeout expires. It includes the endpoint and timeout duration in milliseconds.

## `SolrAbortError`

The client throws `SolrAbortError` when the caller's `AbortSignal` cancels the request. It includes the endpoint and the caller's abort reason.

Timeout and caller cancellation use different error classes. Do not treat a caller cancellation as a retryable network failure.

## `SolrValidationError`

The client throws `SolrValidationError` when an enabled input or output schema rejects a value. The error includes the operation name and validation issues.

## Response body handling

- Valid JSON is available in `payload` as a parsed value.
- Text and malformed JSON remain available as text in `body` and `payload`.
- Empty response bodies produce `body === ""` and `payload === undefined`.
- HTTP errors are raised for both JSON and non-JSON response bodies.

## Raw export responses

The `export()` method returns the raw Fetch API `Response` for successful responses. Read its body as a stream. For a non-success response, it throws `SolrHttpError` with the raw body and parsed payload.
