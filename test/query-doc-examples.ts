/**
 * Compile-only fixtures for the public examples in docs/query.md.
 * Included by test/tsconfig.json and checked by npm run test:types.
 */
import {
  SolrClient,
  solrFields,
  solrFunction,
  solrLocalParams,
  solrSort
} from "../src/index.js";
import type {
  SolrJsonQueryRequest,
  SolrJsonQueryResponse,
  SolrQuery,
  SolrQueryResponse,
  SolrResponse
} from "../src/index.js";

interface Product {
  id: string;
  title: string;
  category_s: string;
  price_d: number;
  updatedAt: string;
}

interface ProductFacets {
  count: number;
  categories: {
    buckets: Array<{ val: string; count: number; averagePrice: number }>;
  };
  expensive: { count: number; maxPrice: number };
}

export async function compileQueryDocumentationExamples(client: SolrClient): Promise<void> {
  // Standard query, parser selection, filters, and classic facets.
  const standardQuery: SolrQuery = {
    query: "title:typescript",
    filter: [
      "status:published",
      { query: "category:books", tag: "category" },
      { query: "inStock:true", tag: ["stock", "availability"] },
      { query: "price:[10 TO 50]", cache: false, cost: 25 }
    ],
    fields: ["id", "title"],
    sort: solrSort(
      { expression: "publishedAt", direction: "desc" },
      { expression: "id", direction: "asc" }
    ),
    limit: 25,
    offset: 0,
    defType: "edismax",
    parserOptions: {
      type: "edismax",
      qf: "title^10 description",
      pf2: "title description",
      mm: "2<75%",
      tie: 0.1,
      "mm.autoRelax": true,
      uf: "* -internal"
    },
    facets: {
      fields: [{ field: "category_s", limit: 10, sort: "count", minCount: 1 }, "brand_s"],
      queries: ["price_d:[0 TO 20]", "inStock_b:true"],
      ranges: [{ field: "price_d", start: 0, end: 100, gap: 10, hardEnd: true, other: "between" }]
    },
    highlighting: {
      fields: ["title"],
      method: "unified",
      snippets: 3,
      fragmentSize: 120,
      requireFieldMatch: true,
      perField: { title: { snippets: 2, fragmentSize: 80 } }
    },
    grouping: { fields: ["category_s"], limit: 3, numGroups: true },
    stats: { fields: [{ field: "price_d", min: true, max: true, mean: true, percentiles: [50, 90] }] },
    moreLikeThis: { fields: ["title", "category_s"], count: 5, minTermFrequency: 2 },
    params: { customParam: "custom-value" }
  };

  const standard = await client.query<SolrQueryResponse<Product>>(standardQuery);
  const firstProduct: Product | undefined = standard.response?.docs?.[0];
  const snippets = standard.highlighting?.[firstProduct?.id ?? ""]?.title;
  const grouped = standard.grouped?.category_s?.groups;
  const averagePrice = standard.stats?.stats_fields?.price_d?.mean;
  void [firstProduct, snippets, grouped, averagePrice];

  // Typed parser helpers and local-parameter composition.
  const fields = solrFields("id", "title", { alias: "sales_price", expression: "price_d" });
  const localQuery = solrLocalParams({ type: "lucene", df: "title", "q.op": "AND" }, "distributed search");
  const functionSort = solrSort(solrFunction("sum", "price_d", 10) + " desc");
  await client.query({ query: localQuery, fields, sort: functionSort });

  // CursorMark pagination uses a stable sort and a typed document response.
  const cursorQuery: SolrQuery = {
    query: "*:*",
    cursorMark: "*",
    sort: "updatedAt asc,id asc",
    limit: 500
  };
  const cursorPage = await client.query<SolrResponse<Product>>(cursorQuery);
  const nextCursor: string | undefined = cursorPage.nextCursorMark;
  void nextCursor;

  // JSON Request API with nested terms/query/range facets and caller-shaped results.
  const jsonRequest: SolrJsonQueryRequest = {
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
  const jsonResponse = await client.queryJson<SolrJsonQueryResponse<Product, ProductFacets>>(jsonRequest);
  const buckets: ProductFacets["categories"]["buckets"] | undefined = jsonResponse.facets?.categories.buckets;
  void buckets;

  // @ts-expect-error Unknown top-level query properties must be rejected.
  const misspelledOption: SolrQuery = { query: "*:*", rowz: 10 };
  // @ts-expect-error The parser discriminator and parser options must agree on a known parser.
  const invalidParser: SolrQuery = { query: "*:*", parserOptions: { type: "edismax", qff: "title" } };
  void [misspelledOption, invalidParser];
}
