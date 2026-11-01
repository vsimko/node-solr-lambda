import type { SolrClient, SolrQueryResponse, SolrResponse } from "../src/index.js";
import { solrExcludeTags, solrFields, solrFilter, solrFunction, solrLocalParams, solrSort } from "../src/index.js";

declare const solr: SolrClient;

void solr.query({
  query: "title:solr",
  filter: [
    "status:published",
    { query: "category:books", tag: "category" },
    { query: "inStock:true", tag: ["stock", "availability"], cache: false, cost: 20 }
  ],
  fields: solrFields("id", { alias: "display_title", expression: "title" }),
  sort: solrSort({ expression: "publishedAt", direction: "desc" }, "id asc"),
  limit: 25,
  offset: 0,
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
  },
  "q.op": "AND",
  wt: "json",
  params: {
    facet: "true",
    "facet.field": solrLocalParams({ ex: solrExcludeTags("category", "availability") }, "category")
  }
});

void solr.query({ query: "name:alice", defType: "lucene", parserOptions: { type: "lucene", df: "name", sow: true } });
void solr.query({ query: "name:alice", defType: "dismax", parserOptions: { type: "dismax", qf: "name^2", mm: "2", tie: 0.2 } });
void solr.query({ query: solrLocalParams({ type: "lucene", df: "title" }, "search terms"), fields: solrFields("id", solrFunction("sum", "price", 10)) });
void solr.query({ filter: solrFilter("category:books", { tag: "category" }) });

// @ts-expect-error Unknown top-level options are rejected.
void solr.query({ query: "*:*", qurey: "*:*" });
// @ts-expect-error Parser-specific options require a valid parser discriminator.
void solr.query({ query: "*:*", parserOptions: { type: "unknown", qf: "title" } });
// @ts-expect-error Lucene parser options do not accept eDisMax-only fields.
void solr.query({ query: "*:*", parserOptions: { type: "lucene", pf2: "title" } });
// @ts-expect-error q.op only accepts documented values.
void solr.query({ query: "*:*", "q.op": "XOR" });
// @ts-expect-error Structured sort directions are restricted to Solr's documented values.
solrSort({ expression: "price", direction: "sideways" });
// @ts-expect-error Filter cache must be a boolean.
void solr.query({ filter: { query: "id:1", cache: "false" } });


void solr.query<SolrResponse<{ id: string }>>({
  query: "*:*",
  cursorMark: "*",
  sort: "timestamp asc,id asc",
  limit: 100,
  offset: 0
}).then(cursorPage => cursorPage.nextCursorMark);

// @ts-expect-error Cursor pagination requires an explicit sort expression.
void solr.query({ query: "*:*", cursorMark: "*" });
// @ts-expect-error Cursor pagination cannot use a non-zero offset.
void solr.query({ query: "*:*", cursorMark: "*", sort: "id asc", offset: 10 });

interface ProductDocument {
  id: string;
  title: string;
  price: number;
}

interface ProductFacets {
  count: number;
  categories: { buckets: { val: string; count: number }[] };
}

void solr.query<SolrQueryResponse<ProductDocument, ProductFacets>>({ query: "*:*" }).then(page => {
  const documents: ProductDocument[] = page.response?.docs ?? [];
  const total: number | undefined = page.response?.numFound;
  const offset: number | undefined = page.response?.start;
  const maxScore: number | undefined = page.response?.maxScore;
  const titleSnippet: string | undefined = page.highlighting?.["product-1"]?.title?.[0];
  const facetCount: number | undefined = page.facet_counts?.facet_queries?.["inStock:true"];
  const jsonFacetCount: number | undefined = page.facets?.count;
  const groupedMatches: number | undefined = page.grouped?.category?.matches;
  const averagePrice: number | undefined = page.stats?.stats_fields?.price?.mean;
  const explanation: string | undefined = page.debug?.explain?.["product-1"];
  const queryTime: number | undefined = page.responseHeader?.QTime;
  void [documents, total, offset, maxScore, titleSnippet, facetCount, jsonFacetCount, groupedMatches, averagePrice, explanation, queryTime];
  for (const document of documents) {
    const id: string = document.id;
    const price: number = document.price;
    // @ts-expect-error Document fields retain the caller-provided generic type.
    const invalidId: number = document.id;
    void [id, price, invalidId];
  }
});

void solr.query({
  query: "*:*",
  facets: {
    enabled: true,
    fields: [
      "category",
      { field: "price", limit: 10, offset: 5, sort: "count", minCount: 1, missing: true, prefix: "1", method: "fc" }
    ],
    queries: ["price:[0 TO 10]"],
    dates: [{ field: "created_at", start: "NOW/DAY", end: "NOW", gap: "+1DAY", hardEnd: true, other: "before", include: ["lower", "upper"] }],
    ranges: [{ field: "price", start: 0, end: 100, gap: 10, other: "between", include: "edge" }],
    limit: 20,
    offset: 0,
    sort: "index",
    minCount: 1,
    missing: false,
    prefix: "A",
    method: "fc"
  }
});

// @ts-expect-error Classic facet sort is limited to count or index.
void solr.query({ facets: { sort: "ascending" } });
// @ts-expect-error Field facet sort is limited to count or index.
void solr.query({ facets: { fields: [{ field: "category", sort: "ascending" }] } });
// @ts-expect-error Range facets require a gap.
void solr.query({ facets: { ranges: [{ field: "price", start: 0, end: 100 }] } });
// @ts-expect-error Date facets require an explicit start, end, and gap.
void solr.query({ facets: { dates: [{ field: "created_at", start: "NOW", end: "NOW" }] } });
// @ts-expect-error Facet minCount must be numeric.
void solr.query({ facets: { minCount: "one" } });
// @ts-expect-error Unsupported facet methods are rejected.
void solr.query({ facets: { method: "unknown" } });
