# Query API

Use `query()` to send a standard Solr query request. Common options are typed directly on the query object; parser-specific options are grouped under `parserOptions` and flattened into Solr request parameters.

## Standard query

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
  wt: "json"
});
```

## eDisMax

```ts
const result = await solr.query({
  query: "typescript solr client",
  defType: "edismax",
  parserOptions: {
    type: "edismax",
    qf: "title^10 description",
    pf: "title^20",
    pf2: "title description",
    mm: "2<75%",
    tie: 0.1,
    "mm.autoRelax": true,
    uf: "* -internal"
  }
});
```

## DisMax and Lucene

```ts
await solr.query({
  query: "distributed search",
  defType: "dismax",
  parserOptions: { type: "dismax", qf: "title^2 body", mm: "2", tie: 0.1 }
});

await solr.query({
  query: "title:distributed",
  defType: "lucene",
  parserOptions: { type: "lucene", df: "text", sow: true }
});
```

The `type` discriminator selects the TypeScript option set and is not sent to Solr. The option keys themselves are serialized using Solr's parameter names (including dotted names such as `mm.autoRelax`). Set `defType` to the same parser as `parserOptions.type`; TypeScript intentionally keeps these separate so custom parser names remain supported. For Solr-specific or plugin-specific parameters not yet modelled, use the explicit `params` property. Parser parameters are documented by the [Solr Reference Guide](https://solr.apache.org/guide/solr/latest/query-guide/query-syntax-and-parsers.html); verify parser availability and behavior against the Solr version you deploy.

The client maps `query`, `filter`, `fields`, `limit`, and `offset` to `q`, `fq`, `fl`, `rows`, and `start`. Unknown top-level properties are rejected by TypeScript.

Use `queryJson()` to send a JSON Request API body. The current method accepts a generic object; dedicated typed models for common JSON Request API structures remain separate work.

```ts
const result = await solr.queryJson({
  query: "title:typescript",
  limit: 25,
  fields: ["id", "title"]
});
```
