# Query API

Use `query()` to send a standard Solr query request.

```ts
const result = await solr.query({
  query: "title:typescript",
  filter: ["status:published", "language:en"],
  fields: ["id", "title"],
  sort: "publishedAt desc",
  limit: 25,
  offset: 0
});
```

The client maps `query`, `filter`, `fields`, `limit`, and `offset` to Solr parameters `q`, `fq`, `fl`, `rows`, and `start`. Pass other Solr query parameters by name.

Use `queryJson()` to send a JSON Request API body.

```ts
const result = await solr.queryJson({
  query: "title:typescript",
  limit: 25,
  fields: ["id", "title"]
});
```

Use the JSON Request API for complex query parsers, facets, highlighting, grouping, and JSON Facet API features.
