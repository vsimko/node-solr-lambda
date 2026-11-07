import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient } from "../src/index.js";

test("query parameters preserve repeated values and serialize scalar types consistently", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test/proxy/solr/",
    core: "catalog / blue",
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  const date = new Date("2026-11-02T09:30:00.000Z");
  await client.query({
    query: "title:coffee & tea",
    params: {
      repeated: ["first value", "second/value"],
      enabled: false,
      disabled: true,
      empty: null,
      createdAfter: date,
      special: "a+b & c/d = 100%"
    }
  });

  const url = new URL(requestedUrl);
  assert.equal(url.origin, "https://solr.example.test");
  assert.equal(url.pathname, "/proxy/solr/catalog%20%2F%20blue/select");
  assert.equal(url.searchParams.get("q"), "title:coffee & tea");
  assert.deepEqual(url.searchParams.getAll("repeated"), ["first value", "second/value"]);
  assert.equal(url.searchParams.get("enabled"), "false");
  assert.equal(url.searchParams.get("disabled"), "true");
  assert.equal(url.searchParams.get("empty"), "null");
  assert.equal(url.searchParams.get("createdAfter"), "2026-11-02T09:30:00.000Z");
  assert.equal(url.searchParams.get("special"), "a+b & c/d = 100%");
});

test("URLSearchParams input is preserved without double encoding", async () => {
  let requestedUrl = "";
  const query = new URLSearchParams();
  query.append("fq", "category:coffee");
  query.append("fq", "status:active");
  query.append("q", "name:tea & coffee");

  const client = createSolrClient({
    baseUrl: "https://solr.example.test/solr",
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  await client.request("/solr/catalog/select", { query });
  const url = new URL(requestedUrl);
  assert.deepEqual(url.searchParams.getAll("fq"), ["category:coffee", "status:active"]);
  assert.equal(url.searchParams.get("q"), "name:tea & coffee");
});

test("request defaults serialize dates and nulls while explicit request values take precedence", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    requestDefaults: {
      params: {
        since: new Date("2026-01-01T00:00:00.000Z"),
        optional: null,
        page: 1
      }
    },
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  await client.request("/select", { query: { page: 2 } });
  const params = new URL(requestedUrl).searchParams;
  assert.equal(params.get("since"), "2026-01-01T00:00:00.000Z");
  assert.equal(params.get("optional"), "null");
  assert.equal(params.get("page"), "2");
});

test("invalid dates fail before a network request is sent", async () => {
  let fetchCalled = false;
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => {
      fetchCalled = true;
      return new Response("{}");
    }
  });

  await assert.rejects(
    client.request("/select", { query: { createdAfter: new Date(Number.NaN) } }),
    RangeError
  );
  assert.equal(fetchCalled, false);
});


test("long query parameters are transmitted intact without implicit GET-to-POST switching", async () => {
  let requestedUrl = "";
  let requestedMethod = "";
  const longQuery = `title:${"solr-client-".repeat(4_000)}`;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    collection: "catalog",
    fetch: async (input, init) => {
      requestedUrl = String(input);
      requestedMethod = String(init?.method);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  await client.query({ query: longQuery });

  const url = new URL(requestedUrl);
  assert.equal(requestedMethod, "GET");
  assert.equal(url.pathname, "/solr/catalog/select");
  assert.equal(url.searchParams.get("q"), longQuery);
});
