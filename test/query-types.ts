import type { SolrClient } from "../src/index.js";
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
    "facet.field": ["category", "author"],
    "facet.excludeTags": solrExcludeTags("category", "availability")
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
