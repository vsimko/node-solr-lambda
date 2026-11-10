# Client configuration

Pass a configuration object to `createSolrClient`.

## Connection

| Option | Default | Description |
| --- | --- | --- |
| `baseUrl` | `http://localhost:8983` | Solr origin or reverse-proxy prefix. Do not include a core or collection name. |
| `core` | none | Core name for core-scoped requests. |
| `collection` | none | Collection name for collection-scoped requests. |
| `timeoutMs` | `30000` | Timeout for each HTTP attempt, in milliseconds. |
| `fetch` | global `fetch` | Custom Fetch API implementation. |

You can set a reverse-proxy prefix in `baseUrl`. For example, `https://search.example/proxy/solr` works with the client paths. The client does not add a second `/solr` segment.

Set `core` or `collection` for collection-scoped methods. If both are supplied, `core` takes precedence because scoped paths select `core` first. Prefer setting exactly one target to keep the client configuration unambiguous. Global admin methods do not need either value.

## Authentication and headers

Use the typed `auth` option for new code:

```ts
const solr = createSolrClient({
  baseUrl: "https://search.example",
  collection: "catalog",
  auth: { type: "bearer", token: process.env.SOLR_TOKEN! }
});
```

Basic authentication is also available:

```ts
const solr = createSolrClient({
  auth: { type: "basic", username: "solr-user", password: process.env.SOLR_PASSWORD }
});
```

The legacy `username` and `password` options remain supported. Do not combine them with `auth`.

Use HTTPS when you send credentials over a network. Do not store passwords or tokens in source files. Read them from environment variables or your deployment platform's secret manager, and rotate them according to your organization's policy.

The client sends Basic/Bearer credentials in the `Authorization` request header; it does not put configured credentials in the request URL. The built-in transport does not log requests and does not copy authorization header values into its error properties. If you provide a custom `fetch` implementation or request logger, redact at least `Authorization`, `Cookie`, and any application-specific secret headers before recording request options.

HTTP error bodies and parsed payloads come from the Solr server and may contain arbitrary server or application data. They do not include request headers by default, but a server or proxy could echo submitted values. Sanitize response bodies, validation details, and underlying causes before logging them in production.

Header precedence, from lowest to highest:

1. `requestDefaults.headers`
2. The `auth` or legacy Basic authentication setting
3. `headers`
4. Per-request `RequestOptions.headers`

The last two levels can override the generated Authorization header.

## Request defaults

Use `requestDefaults.params` to set query parameters for every request. The client adds a default only when the request does not set the same key.

```ts
const solr = createSolrClient({
  collection: "catalog",
  requestDefaults: {
    params: { wt: "json", indent: true },
    headers: { "x-client": "catalog-service" }
  }
});
```

A request can override a default parameter. For example, `wt=xml` in the request takes precedence over the default `wt=json`.

## Lossless JSON parsing and serialization

By default, the transport uses native `JSON.parse()` and `JSON.stringify()`. This preserves the existing JavaScript behavior, including the precision limit for integers above `Number.MAX_SAFE_INTEGER`.

Supply `jsonCodec` when your application needs lossless numeric handling, such as Solr's 64-bit `_version_` values:

```ts
const solr = createSolrClient({
  collection: "catalog",
  jsonCodec: {
    parse: text => losslessJson.parse(text),
    stringify: value => losslessJson.stringify(value)
  }
});
```

`SolrJsonCodec.parse()` handles successful JSON responses and structured HTTP error payloads. `stringify()` handles JSON request bodies sent by both `request()` and `requestRaw()`. A codec can preserve large integers as `bigint`; type your document and response fields accordingly. The library does not add a JSON codec dependency or change numeric behavior by default.

Explicit string bodies passed to `requestRaw()` are sent unchanged. Successful `requestRaw()` responses remain raw Fetch `Response` objects and are not parsed by the codec. Empty and malformed JSON responses retain the existing `undefined` and raw-text fallback behavior.

## Retry policy

Retries are disabled by default. When enabled, the client retries `GET` requests by default. It does not retry update `POST` requests unless you add `POST` to `methods`.

```ts
const solr = createSolrClient({
  collection: "catalog",
  retry: {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    retryableStatuses: [408, 429, 502, 503, 504]
  }
});
```

- `maxAttempts` is the total number of attempts, including the first request.
- The default retry statuses are 408, 429, 500, 502, 503, and 504.
- The default methods list contains only `GET`.
- Network failures can be retried by default. The client does not retry when the caller has aborted the request.
- The delay uses exponential backoff and is capped by `maxDelayMs`.
- A per-request `AbortSignal` is combined with the timeout. The first one to fire cancels the request.
- Set `retry: false` to disable retries.

Only add `POST`, `PUT`, or `DELETE` to the retry method list when the operation is safe to repeat. A retry can send the same request more than once.

## Configuration validation

The constructor checks the base URL, timeout, authentication combination, and retry values. It throws a configuration error before the first request when a value is invalid.

Optional Zod input and output validation is separate. See [Validation](validation.md).

Transport options do not certify Solr server compatibility. See the [Solr compatibility matrix](compatibility.md) for documented endpoint coverage and runtime test status.

## Per-request cancellation and timeout

Every typed client method accepts an optional final `RequestControlOptions` argument. It supports a per-request timeout, an `AbortSignal`, and request-specific headers.

```ts
const controller = new AbortController();

const result = await solr.query(
  { query: "title:solr", limit: 10 },
  { signal: controller.signal, timeoutMs: 5000 }
);

// Cancel the request when the application no longer needs the result.
controller.abort();
```

For methods with existing options, pass request controls after those options. For example:

```ts
await solr.add(
  { id: "book-1", title: "Solr" },
  { overwrite: true },
  { timeoutMs: 5000 }
);
```

The client combines the caller signal with the timeout. Caller cancellation throws `SolrAbortError`. A timeout throws `SolrTimeoutError`. The timeout applies while the client receives the response body. For `export()`, the signal remains active until the returned response stream is consumed or cancelled.
