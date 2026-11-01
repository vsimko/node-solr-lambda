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

## Classic field, query, and range facets

Use the typed `facets` property for the classic Facet Component. It supports field facets, query facets, and numeric or date range facets. Global field-facet defaults can be overridden per field.

```ts
const result = await solr.query<SolrQueryResponse<Product>>({
  query: "*:*",
  facets: {
    fields: [{ field: "category_s", limit: 10, sort: "count", minCount: 1 }, "brand_s"],
    queries: ["price_d:[0 TO 20]", "inStock_b:true"],
    ranges: [
      { field: "price_d", start: 0, end: 100, gap: 10, hardEnd: true, other: "between" },
      { field: "created_dt", start: "NOW/DAY-30DAYS", end: "NOW/DAY", gap: "+1DAY" }
    ],
    limit: 20,
    offset: 0,
    sort: "count",
    minCount: 1,
    missing: true,
    method: "fc",
    rangeMethod: "filter"
  }
});

const categoryCounts = result.facet_counts?.facet_fields?.category_s;
const priceRangeCounts = result.facet_counts?.facet_ranges?.price_d?.counts;
```

- Field facets accept raw field names or objects with per-field `limit`, `offset`, `sort`, `minCount`, `missing`, `prefix`, and `method` overrides. Field methods are `enum`, `fc`, or `fcs`.
- Query facets accept raw Solr query expressions. Query values are sent as repeated `facet.query` parameters.
- Range facets accept numeric values or date math strings for `start`, `end`, and `gap`. They support `hardEnd`, repeated `include` and `other` values, and the range methods `filter` and `dv`.
- Date bucketing is expressed with range facets on a date field. The legacy `facet.date` parameters were removed in Solr 6, so they are not supported by the target Solr 8/9/10 versions. See the [Solr 10.1 upgrade notes](https://solr.apache.org/guide/solr/10_1/upgrade-notes/major-changes-in-solr-6.html) and [Solr faceting reference](https://solr.apache.org/guide/solr/9_8/query-guide/faceting.html).
- `facet_counts.facet_fields` uses Solr's alternating term/count array representation. Query counts are in `facet_queries`; numeric and date range counts are in `facet_ranges`.
- The `params` escape hatch remains available for facet parameters not represented by these models. Runtime behavior is covered by the pinned Solr integration matrix; verify any server-specific or uncommon facet option against the version you deploy.

## Typed query responses

`query<T>()` lets the caller choose the complete response type. For the standard `/select` handler, `SolrQueryResponse<TDocument, TJsonFacet>` provides named sections for document metadata, classic facets, JSON facets, highlighting, grouping, statistics, and debug information. The first generic parameter controls the document shape; the second describes the JSON Facet API's `facets` object.

```ts
import type { SolrQueryResponse } from "node-solr-lambda";

interface Product {
  id: string;
  title: string;
  price: number;
}

interface ProductFacets {
  count: number;
  categories: { buckets: { val: string; count: number }[] };
}

const page = await solr.query<SolrQueryResponse<Product, ProductFacets>>({
  query: "inStock:true",
  fields: ["id", "title", "price"],
  params: { hl: true, "hl.fl": "title", facet: true, "facet.field": "category" }
});

const products: Product[] = page.response?.docs ?? [];
const total = page.response?.numFound;
const firstSnippet = page.highlighting?.[products[0]?.id ?? ""]?.title?.[0];
const classicFacetCount = page.facet_counts?.facet_queries?.["inStock:true"];
const categoryBuckets = page.facets?.categories.buckets;
```

The existing `SolrResponse<TDocument>` remains available and keeps its original one-parameter usage; it now also exposes the common optional response sections. Use `SolrQueryResponse` when you want an explicit query-response name or a typed JSON Facet shape. Solr omits sections that were not requested, and exact facet/group/debug payloads depend on the query components and Solr version. These interfaces describe expected JSON shapes; they do not enable a component or certify server-side support. The second generic is intentionally caller-defined because JSON Facet responses are shaped by the requested facet tree.

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

Use `queryJson()` to send a JSON Request API body. The method accepts the typed `SolrJsonQueryRequest` model for common query properties and recursive JSON Facet API definitions. A compatibility overload remains for custom request bodies that do not use a `facet` property; put additional top-level parameters in the explicit `params` property when using the typed request.

## JSON Facet API

The JSON Facet API models terms, query, and range facets as a recursive tree. Each facet can contain nested facets or metrics, and can apply a domain transformation before evaluating its buckets.

```ts
import type { SolrJsonQueryRequest, SolrJsonQueryResponse } from "node-solr-lambda";

interface Product { id: string; category_s: string; price_d: number; }
interface ProductFacets {
  count: number;
  categories: { buckets: { val: string; count: number; averagePrice: number }[] };
  expensive: { count: number; maxPrice: number };
}

const request: SolrJsonQueryRequest = {
  query: "*:*",
  filter: "{!tag=stock}inStock_b:true",
  limit: 0,
  facet: {
    categories: {
      type: "terms",
      field: "category_s",
      limit: 20,
      sort: "count desc",
      domain: { excludeTags: "stock" },
      facet: {
        averagePrice: "avg(price_d)",
        nestedRanges: {
          type: "range",
          field: "price_d",
          start: 0,
          end: 100,
          gap: 10,
          facet: { count: "count()" }
        }
      }
    },
    expensive: {
      type: "query",
      q: "price_d:[50 TO *]",
      facet: { maxPrice: { type: "func", func: "max(price_d)" } }
    }
  }
};

const result = await solr.queryJson<SolrJsonQueryResponse<Product, ProductFacets>>(request);
const categoryBuckets = result.facets?.categories.buckets;
```

- **Terms facets** support field, limit, offset, sort, mincount, missing, prefix, method, and nested metrics/facets.
- **Query facets** count arbitrary query expressions and can include nested metrics/facets.
- **Range facets** support numeric values and date math for start/end/gap, plus hardend, include, other, and mincount.
- **Metrics** accept function expressions such as `avg(price_d)` or the explicit `{ type: "func", func: "..." }` form.
- **Domain changes** support filter, query, excludeTags, blockParent, blockChildren, and join transformations.
- The response's `facets` section is caller-typed through the second `SolrJsonQueryResponse` generic. The library does not infer a response shape from the requested facet tree at runtime.

The JSON Facet API is documented in the [Solr Reference Guide](https://solr.apache.org/guide/solr/9_8/query-guide/json-facet-api.html). Check the version-specific guide when using advanced facet options or domain transformations.
