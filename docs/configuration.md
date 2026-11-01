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

Set either `core` or `collection` for collection-scoped methods. If both are set, `core` takes precedence. Global admin methods do not need either value.

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

Use HTTPS when you send credentials over a network. Do not store passwords or tokens in source files.

Header precedence, from lowest to highest:

1. `requestDefaults.headers`
2. `headers`
3. Per-request `RequestOptions.headers`

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
- Set `retry: false` to disable retries.

Only add `POST`, `PUT`, or `DELETE` to the retry method list when the operation is safe to repeat. A retry can send the same request more than once.

## Configuration validation

The constructor checks the base URL, timeout, authentication combination, and retry values. It throws a configuration error before the first request when a value is invalid.

Optional Zod input and output validation is separate. See [Validation](validation.md).
