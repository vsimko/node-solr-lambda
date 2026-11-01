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

The client maps `filter`, `fields`, `limit`, and `offset` to Solr parameters `fq`, `fl`, `rows`, and `start`. Pass other Solr query parameters by name. Use Solr's JSON Request API for complex query parsers, facets, highlighting, grouping, and JSON Facet API features.
