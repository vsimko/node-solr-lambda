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
  defType: "edismax",
  "q.op": "AND",
  wt: "json",
  params: {
    "facet.field": "category"
  }
});
```

The client maps `query`, `filter`, `fields`, `limit`, and `offset` to Solr parameters `q`, `fq`, `fl`, `rows`, and `start`. The `defType`, `q.op`, and `wt` properties are also typed and available through IDE completion. Built-in parser and response-writer values are suggested, while custom names remain accepted for Solr plugins.

The `params` property is the explicit escape hatch for additional Solr query parameters that do not yet have a dedicated option type. Unknown top-level properties are rejected by TypeScript, which catches common spelling mistakes instead of silently accepting them.

The broader autocomplete-first work, including parser-specific nested options, facets, highlighting, grouping, and response sections, is tracked in [Issue #121](https://github.com/vsimko/node-solr-lambda/issues/121) and the [development roadmap](roadmap.md).

Use `queryJson()` to send a JSON Request API body. The current method accepts a generic object; dedicated typed models for common JSON Request API structures are part of the query API roadmap.

```ts
const result = await solr.queryJson({
  query: "title:typescript",
  limit: 25,
  fields: ["id", "title"]
});
```

Use the JSON Request API for complex query parsers, facets, highlighting, grouping, and JSON Facet API features.
