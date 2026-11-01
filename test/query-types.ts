import type { SolrClient } from "../src/index.js";

declare const solr: SolrClient;

// The common query options are discoverable and compile with their intended types.
void solr.query({
  query: "title:solr",
  filter: ["status:published", "language:en"],
  fields: ["id", "title"],
  sort: "publishedAt desc, id asc",
  limit: 25,
  offset: 0,
  defType: "edismax",
  "q.op": "AND",
  wt: "json",
  params: {
    "facet": "true",
    "facet.field": ["category", "author"],
    "custom.application.flag": true
  }
});

// @ts-expect-error Unknown top-level options must be caught instead of silently accepted.
void solr.query({ query: "*:*", qurey: "*:*" });

// @ts-expect-error Facet parameters belong in the explicit params escape hatch until typed.
void solr.query({ query: "*:*", "facet.field": "category" });

// @ts-expect-error The query operator is limited to the documented Solr values.
void solr.query({ query: "*:*", "q.op": "XOR" });

// @ts-expect-error Parameter values must be serializable scalar or scalar-array values.
void solr.query({ query: "*:*", params: { "facet.field": { name: "category" } } });
