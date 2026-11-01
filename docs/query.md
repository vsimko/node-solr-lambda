# Query API

Use `query()` to send a standard Solr query request. Common options are typed directly on the query object; parser-specific options are grouped under `parserOptions` and flattened into Solr request parameters.

## Standard query

```ts
const result = await solr.query({
  query: "title:typescript",
  filter: ["status:published", "language:en"],
  fields: ["id", "title"],
  sort: solrSort(
    { expression: "publishedAt", direction: "desc" },
    { expression: "id", direction: "asc" }
  ),
  limit: 25,
  offset: 0,
  defType: "edismax",
  "q.op": "AND",
  wt: "json"
});
```

## Sort, field-list, and expression helpers

The helpers build Solr syntax strings; they do not parse or restrict the full Solr expression language. Raw strings remain supported for custom functions, transformers, local syntax, and server extensions.

```ts
import { solrFieldAlias, solrFields, solrFunction, solrLocalParams, solrSort } from "node-solr-lambda";

const sort = solrSort(
  { expression: "price", direction: "asc" },
  { expression: "score", direction: "desc" },
  "div(popularity,price) desc"
);

const fields = solrFields(
  "id",
  "title",
  { alias: "sales_price", expression: "price" },
  solrFunction("sum", "price", 10),
  "[explain]"
);

// Equivalent single-item alias helper:
const priceField = solrFieldAlias("sales_price", "price");

// Local params are prefixed to the query value; values with whitespace are quoted.
const query = solrLocalParams({ type: "lucene", df: "title", "q.op": "AND" }, "distributed search");

await solr.query({ query, sort, fields });
```

- `solrSort()` accepts structured `{ expression, direction }` clauses or raw Solr sort strings. Function-based sorts are supported through `expression` or raw strings.
- `solrFields()` accepts raw field-list items or `{ alias, expression }` entries. Raw items retain support for wildcards, functions, and document transformers.
- `solrFieldAlias(alias, expression)` returns Solr's `displayName:expression` syntax.
- `solrFunction(name, ...args)` builds function-call expressions and can be nested.
- `solrLocalParams(params, value?)` creates a `{!...}` prefix and can append the associated query value. Local-param values containing whitespace or quotes are escaped.

These helpers only compose request strings. Solr validates field names, functions, local parameters, sortability, and transformer availability at query time. Keep raw strings when using Solr syntax not represented by the structured helpers.

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
