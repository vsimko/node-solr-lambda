# Query API

Use `query()` to send a standard Solr query request. Common options are typed directly on the query object; parser-specific options are grouped under `parserOptions` and flattened into Solr request parameters.

## Standard query

```ts
const result = await solr.query({
  query: "title:typescript",
  filter: [
    "status:published",
    { query: "category:books", tag: "category" }
  ],
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

## Filter queries, tags, and local parameters

The `filter` property accepts one filter or an array. Arrays are sent as repeated `fq` parameters; raw strings remain unchanged. Structured filters support tags and Solr filter-cache hints:

```ts
await solr.query({
  query: "*:*",
  filter: [
    { query: "category:books", tag: "category" },
    { query: "inStock:true", tag: ["stock", "availability"] },
    { query: "price:[10 TO 50]", cache: false, cost: 25 }
  ]
});
```

A structured filter serializes to Solr local params, for example `{!tag=category}`, `cache=false`, and `cost=25`. Additional filter-local parameters can be supplied through `localParams`; use raw strings or `solrLocalParams()` when you need syntax outside the structured properties.

Tagged filters can be excluded from supported facets or query parsers by passing their tags through the relevant local parameter. For a classic facet field, Solr uses the `ex` local param:

```ts
import { solrExcludeTags, solrLocalParams } from "node-solr-lambda";

await solr.query({
  query: "*:*",
  filter: [{ query: "category:books", tag: "category" }],
  params: {
    "facet": "true",
    "facet.field": solrLocalParams({ ex: solrExcludeTags("category") }, "category")
  }
});
```

Some query parsers instead accept an `excludeTags` local parameter. Keep it in that parser's local-params prefix, for example `solrLocalParams({ type: "parent", which: "type:parent", excludeTags: solrExcludeTags("category") }, query)`. Exclusion is contextual: this client does not globally remove tagged filters.

## CursorMark pagination

Cursor pagination is useful for walking large sorted result sets without increasing the `start` offset. The first request uses `cursorMark: "*"`; pass the response's `nextCursorMark` into the next request. Stop when the returned mark equals the mark used for that request:

```ts
import type { SolrResponse } from "node-solr-lambda";

interface Product { id: string; updatedAt: string; }

let cursorMark = "*";
let done = false;

while (!done) {
  const page = await solr.query<SolrResponse<Product>>({
    query: "*:*",
    cursorMark,
    sort: "updatedAt asc,id asc",
    limit: 500
  });

  for (const product of page.response?.docs ?? []) {
    await processProduct(product);
  }

  const nextCursorMark = page.nextCursorMark;
  if (nextCursorMark === undefined) {
    throw new Error("Solr response did not include nextCursorMark");
  }
  done = nextCursorMark === cursorMark;
  cursorMark = nextCursorMark;
}
```

TypeScript requires `sort` whenever `cursorMark` is supplied and rejects non-zero `offset` values; Solr permits `start=0` but no other start offset with a cursor. Runtime validation enforces the same rules for JavaScript callers. The library cannot infer the collection's schema, so callers must include the configured `uniqueKey` field in the sort expression (in either direction), usually as the final tie-breaker. Use a stable sort across every page. Avoid sort expressions whose value changes between requests, such as date math based on a moving `NOW`; in distributed SolrCloud, sorting by `score` can also be unstable across replicas. Index updates that change a document's sort value during a cursor scan can still cause duplicates or omissions. Cursor pagination and its constraints are documented in the [Solr Reference Guide](https://solr.apache.org/guide/solr/latest/query-guide/pagination-of-results.html).

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

const priceField = solrFieldAlias("sales_price", "price");
const query = solrLocalParams({ type: "lucene", df: "title", "q.op": "AND" }, "distributed search");

await solr.query({ query, sort, fields });
```

- `solrSort()` accepts structured `{ expression, direction }` clauses or raw Solr sort strings.
- `solrFields()` accepts raw field-list items or `{ alias, expression }` entries. Raw items retain support for wildcards, functions, and document transformers.
- `solrFieldAlias(alias, expression)` returns Solr's `displayName:expression` syntax.
- `solrFunction(name, ...args)` builds function-call expressions and can be nested.
- `solrLocalParams(params, value?)` creates a `{!...}` prefix and can append the associated query value.
- `solrFilter(query, options)` builds a structured filter with tags, cache/cost hints, and additional local parameters.
- `solrExcludeTags(...tags)` joins tags for Solr local parameters that accept comma-separated exclusions.

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
