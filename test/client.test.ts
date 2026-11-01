import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError } from "../src/index.js";

test("query maps options to Solr parameters", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });
  await client.query({ query: "*:*", filter: ["type:book", "active:true"], limit: 5, offset: 10 });
  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/solr/catalog/select");
  assert.equal(url.searchParams.get("q"), "*:*");
  assert.equal(url.searchParams.getAll("fq").length, 2);
  assert.equal(url.searchParams.get("rows"), "5");
  assert.equal(url.searchParams.get("start"), "10");
});

test("query serializes typed parser, operator, writer, and custom parameters", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  await client.query({
    query: "title:solr",
    defType: "edismax",
    "q.op": "AND",
    wt: "json",
    params: { "facet.field": "category" }
  });

  const params = new URL(requestedUrl).searchParams;
  assert.equal(params.get("defType"), "edismax");
  assert.equal(params.get("q.op"), "AND");
  assert.equal(params.get("wt"), "json");
  assert.equal(params.get("facet.field"), "category");
});

test("add sends a document array", async () => {
  let body = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      body = String(init?.body);
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.add({ id: "one" });
  assert.deepEqual(JSON.parse(body), [{ id: "one" }]);
});

test("HTTP errors retain the Solr payload", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({ error: { msg: "bad request" } }), { status: 400 })
  });
  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    assert.equal(error.message, "bad request");
    return true;
  });
});
