import type { SolrClient } from "../src/index.js";
import { solrFields, solrFunction, solrLocalParams, solrSort } from "../src/index.js";

declare const solr: SolrClient;

void solr.query({
  query: "title:solr",
  filter: ["status:published", "language:en"],
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
  params: { "facet": "true", "facet.field": ["category", "author"] }
});

void solr.query({ query: "name:alice", defType: "lucene", parserOptions: { type: "lucene", df: "name", sow: true } });
void solr.query({ query: "name:alice", defType: "dismax", parserOptions: { type: "dismax", qf: "name^2", mm: "2", tie: 0.2 } });
void solr.query({ query: solrLocalParams({ type: "lucene", df: "title" }, "search terms"), fields: solrFields("id", solrFunction("sum", "price", 10)) });

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
