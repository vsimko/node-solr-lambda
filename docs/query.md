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

## Highlighting

Use the typed `highlighting` property to configure the Solr Highlighting component. The response snippets are returned separately from `response.docs`, keyed first by document unique key and then by field name.

```ts
const result = await solr.query<SolrQueryResponse<Product>>({
  query: "title_txt:distributed",
  fields: ["id", "title_txt"],
  highlighting: {
    fields: ["title_txt"],
    method: "unified",
    snippets: 3,
    fragmentSize: 120,
    requireFieldMatch: true,
    alternateField: "summary_txt",
    maxAlternateFieldLength: 200,
    usePhraseHighlighter: true,
    highlightMultiTerm: true,
    encoder: "html",
    tagPre: "<mark>",
    tagPost: "</mark>",
    perField: {
      title_txt: { snippets: 2, fragmentSize: 80 }
    }
  }
});

const snippets = result.highlighting?.[result.response?.docs?.[0]?.id ?? ""]?.title_txt;
```

- `fields` maps to `hl.fl`; `snippets` and `fragmentSize` map to `hl.snippets` and `hl.fragsize`.
- `method` selects `unified`, `original`, or `fastVector`. Highlighter options differ by implementation; for example, `mergeContiguous` and `formatter` apply to the Original Highlighter.
- `alternateField` and `maxAlternateFieldLength` configure fallback summaries. `usePhraseHighlighter` and `highlightMultiTerm` control phrase and multi-term query highlighting.
- `encoder` accepts `html` or `simple`. `tagPre` and `tagPost` configure common highlighter tags; `simplePre` and `simplePost` configure the Original Highlighter's simple formatter.
- `perField` applies supported overrides using Solr's `f.<field>.hl.*` parameter syntax.
- The `highlighting` response section is typed as document ID → field name → snippet array. Solr returns it only when highlighting is enabled and a requested field has a matching snippet.

The [Solr Highlighting reference](https://solr.apache.org/guide/solr/10_1/query-guide/highlighting.html) describes highlighter-specific behavior and schema/performance requirements. Highlighting fields must be stored, and the schema's unique key is used to associate snippets with documents.

## Result grouping, collapsing, and expansion

Use `grouping` for Solr Result Grouping, which returns a `grouped` response section containing each group and its document list. Field, function, and query grouping can be combined; `limit` and `offset` control each group's document list, while `groupSort` orders documents within a group.

```ts
const grouped = await solr.query<SolrQueryResponse<Product>>({
  query: "*:*",
  grouping: {
    fields: "category_s",
    functions: ["sum(price_d)"],
    queries: ["price_d:[0 TO 20]", "price_d:[20 TO *]"],
    limit: 3,
    offset: 0,
    sort: "score desc",
    groupSort: "price_d desc",
    numGroups: true,
    format: "grouped"
  }
});

const groups = grouped.grouped?.category_s?.groups;
const topDocument = groups?.[0]?.doclist?.docs?.[0];
```

`grouping.fields` requires single-valued indexed string fields. Function grouping is not supported for distributed searches. `format: "simple"` and `main: true` return a flattened main result list instead of the usual grouped response structure.

Use `collapse` to select one representative document per field value. The library serializes this as a Collapsing Query Parser filter query and combines it with any existing `filter` values.

```ts
const collapsed = await solr.query<SolrQueryResponse<Product>>({
  query: "*:*",
  collapse: {
    field: "product_id_s",
    max: "price_d",
    nullPolicy: "collapse",
    hint: "top_fc"
  },
  expand: { field: "product_id_s", rows: 5, sort: "price_d desc" }
});

const representatives = collapsed.response?.docs;
const expandedGroups = collapsed.expanded;
```

`collapse` supports one representative selector (`min`, `max`, or `sort`), plus `nullPolicy`, `hint`, `size`, and `cost`. `expand` can return additional documents for each collapsed group head. Collapse is performed per core/shard; distributed deployments should co-locate documents by collapse key or account for shard-local behavior.

Result Grouping and Collapse/Expand are separate Solr features. They cannot be enabled together in the same request. Prefer Collapse/Expand for most use cases when its per-shard semantics fit the deployment; use Result Grouping when its grouped response structure or distributed grouping behavior is required.

See the official [Result Grouping guide](https://solr.apache.org/guide/solr/10_1/query-guide/result-grouping.html) and [Collapse and Expand guide](https://solr.apache.org/guide/solr/10_1/query-guide/collapse-and-expand-results.html) for version-specific limitations.

## MoreLikeThis

Use the typed `moreLikeThis` option to enable Solr's MoreLikeThis search component on the standard `/select` handler. It returns similar-document result lists keyed by the unique key of each document in the main query response.

```ts
const result = await solr.query<SolrQueryResponse<Product>>({
  query: "category:books",
  fields: ["id", "title_txt"],
  moreLikeThis: {
    fields: ["title_txt", "description_txt"],
    count: 5,
    minTermFrequency: 1,
    minDocumentFrequency: 2,
    maxQueryTerms: 20,
    boost: true,
    interestingTerms: "details"
  }
});

const similarBooks = result.moreLikeThis?.[result.response?.docs?.[0]?.id ?? ""]?.docs;
```

- `fields` maps to `mlt.fl` and selects stored fields used for similarity; term vectors can improve performance. `queryFields` maps to `mlt.qf`, uses DisMax field/boost syntax, and must name fields also included in `fields`.
- `count` maps to `mlt.count`. Term and document thresholds map to `mlt.mintf`, `mlt.mindf`, `mlt.maxdf`, and `mlt.maxdfpct`. Word-length, query-term, and parsed-token limits map to `mlt.minwl`, `mlt.maxwl`, `mlt.maxqt`, and `mlt.maxntp`.
- `boost` maps to `mlt.boost`. `interestingTerms` accepts `none`, `list`, or `details`; the detailed terms mode is intended for diagnostics and may be expensive.
- Supplying `moreLikeThis` enables the component by default. Set `enabled: false` to explicitly disable it.
- This API covers the Search Component on `/select`. It does not configure the separate MoreLikeThis request handler (`/mlt`) or the MoreLikeThis query parser. The request handler must be configured in Solr before use.
- The source document needs a stored unique key and usable stored text fields; stored term vectors are recommended for performance. Similarity behavior depends on field analysis and the configured schema.

The Search Component and its parameters are documented in the [Solr 8.11 guide](https://solr.apache.org/guide/8_11/query-guide/morelikethis.html), [Solr 9.11 guide](https://solr.apache.org/guide/solr/9_11/query-guide/morelikethis.html), and [Solr 10.1 guide](https://solr.apache.org/guide/solr/10_1/query-guide/morelikethis.html). The integration suite exercises the component against the pinned Solr 8.11.4, 9.11.0, and 10.1.0 images.

## Stats Component

Use the typed `stats` property to request statistics for one or more fields. Each field can select individual statistics with local parameters, request percentiles or approximate cardinality, and attach a key/tag for integration with other components. `facets` breaks each field's statistics down by the requested facet fields.

```ts
const result = await solr.query<SolrQueryResponse<Product>>({
  query: "*:*",
  limit: 0,
  stats: {
    fields: [
      "price_d",
      {
        field: "price_d",
        key: "price_summary",
        tag: "price_pivot",
        min: true,
        max: true,
        mean: true,
        percentiles: [50, 90],
        cardinality: 0.5
      }
    ],
    facets: ["category_s", "brand_s"],
    calcDistinct: true
  }
});

const priceStats = result.stats?.stats_fields?.price_summary;
const median = priceStats?.percentiles?.["50.0"];
const booksMean = priceStats?.facets?.category_s?.books?.mean;
```

- `fields` accepts field names or per-field options. Per-field statistic flags include `min`, `max`, `sum`, `count`, `missing`, `sumOfSquares`, `mean`, `stddev`, `distinctValues`, and `countDistinct`.
- `percentiles` accepts numeric cut-off values from 0 to 100 and uses Solr's approximate T-Digest calculation. `tdigestCompression` controls its accuracy/memory trade-off.
- `cardinality` accepts `true` or an accuracy value from 0 to 1 and requests an approximate distinct count using HyperLogLog.
- `tag`, `excludeTags`, and `key` map to Stats Component local parameters, allowing statistics to participate in pivot faceting or exclude tagged filters.
- `facets` maps to `stats.facet`; `calcDistinct` maps to `stats.calcdistinct` for all requested fields.
- Results are available under `stats.stats_fields`. Each field result includes typed numeric statistics, optional percentile values, approximate cardinality, distinct values, and nested per-facet statistics.

Statistics supported depend on field type; for example, sum/mean/stddev are meaningful for numeric/date fields, while percentile calculations require numeric fields. Distinct value collection and exact distinct counts can be expensive for high-cardinality fields.

See the official [Stats Component reference](https://solr.apache.org/guide/solr/9_0/query-guide/stats-component.html) for supported statistics and local-parameter behavior. The integration suite verifies the common numeric statistics, distinct counts, and facet breakdowns on Solr 8.11.4, 9.11.0, and 10.1.0.

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
