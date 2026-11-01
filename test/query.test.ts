import assert from "node:assert/strict";
import test from "node:test";
import { SolrClient } from "../src/index.js";

test("query serializes Lucene parser options", async () => {
  let requestedUrl: URL | undefined;
  const client = new SolrClient({
    baseUrl: "http://localhost:8983/solr",
    fetch: async (input) => {
      requestedUrl = new URL(String(input));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  await client.query({
    query: "title:solr",
    defType: "lucene",
    parserOptions: { type: "lucene", df: "title", sow: true, uf: "* -internal" }
  });

  assert.equal(requestedUrl?.searchParams.get("q"), "title:solr");
  assert.equal(requestedUrl?.searchParams.get("defType"), "lucene");
  assert.equal(requestedUrl?.searchParams.get("df"), "title");
  assert.equal(requestedUrl?.searchParams.get("sow"), "true");
  assert.equal(requestedUrl?.searchParams.get("uf"), "* -internal");
  assert.equal(requestedUrl?.searchParams.has("type"), false);
});

test("query serializes DisMax parser options and repeated values", async () => {
  let requestedUrl: URL | undefined;
  const client = new SolrClient({
    baseUrl: "http://localhost:8983/solr",
    fetch: async (input) => {
      requestedUrl = new URL(String(input));
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }
  });

  await client.query({
    query: "solr client",
    defType: "dismax",
    parserOptions: { type: "dismax", qf: "title^2 body", mm: "2", tie: 0.1, bq: ["type:book", "type:article"] }
  });

  assert.equal(requestedUrl?.searchParams.get("qf"), "title^2 body");
  assert.equal(requestedUrl?.searchParams.get("mm"), "2");
  assert.equal(requestedUrl?.searchParams.get("tie"), "0.1");
  assert.deepEqual(requestedUrl?.searchParams.getAll("bq"), ["type:book", "type:article"]);
  assert.equal(requestedUrl?.searchParams.has("type"), false);
});

test("query serializes eDisMax parser options including dotted parameters", async () => {
  let requestedUrl: URL | undefined;
  const client = new SolrClient({
    baseUrl: "http://localhost:8983/solr",
    fetch: async (input) => {
      requestedUrl = new URL(String(input));
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }
  });

  await client.query({
    query: "solr client",
    defType: "edismax",
    parserOptions: {
      type: "edismax",
      qf: "title^10 description",
      pf2: "title description",
      mm: "2<75%",
      "mm.autoRelax": true,
      lowercaseOperators: true
    }
  });

  assert.equal(requestedUrl?.searchParams.get("qf"), "title^10 description");
  assert.equal(requestedUrl?.searchParams.get("pf2"), "title description");
  assert.equal(requestedUrl?.searchParams.get("mm"), "2<75%");
  assert.equal(requestedUrl?.searchParams.get("mm.autoRelax"), "true");
  assert.equal(requestedUrl?.searchParams.get("lowercaseOperators"), "true");
  assert.equal(requestedUrl?.searchParams.has("type"), false);
});
