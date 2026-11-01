# Query API

Use `query()` to send a standard Solr query request.

```ts
const result = await solr.query({
  query: "title:typescript",
  filter: ["status:published", "language:en"],
  fields: ["id", "title"],
  sort: "publishedAt desc",
  limit: 25,
  offset: 0,
  params: {
    "q.op": "AND"
  }
});
```

The client maps `query`, `filter`, `fields`, `limit`, and `offset` to Solr parameters `q`, `fq`, `fl`, `rows`, and `start`. The `params` property is the explicit escape hatch for additional Solr query parameters that do not yet have a dedicated option type. Do not rely on arbitrary top-level property names as a substitute for typed API support.

The public query model is being expanded to make supported parameters, parser options, nested facets, and response sections discoverable through TypeScript IDE autocomplete. Track the work in [Issue #121](https://github.com/vsimko/node-solr-lambda/issues/121) and the [development roadmap](roadmap.md).

Use `queryJson()` to send a JSON Request API body. The current method accepts a generic object; dedicated typed models for common JSON Request API structures are part of the query API roadmap.

```ts
const result = await solr.queryJson({
  query: "title:typescript",
  limit: 25,
  fields: ["id", "title"]
});
```

Use the JSON Request API for complex query parsers, facets, highlighting, grouping, and JSON Facet API features.
