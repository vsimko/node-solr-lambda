import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError, SolrNetworkError } from "../src/index.js";

test("JSON Solr errors preserve status, endpoint, body, payload, and metadata", async () => {
  const body = JSON.stringify({
    error: {
      code: 400,
      msg: "Unknown field",
      metadata: ["error-class", "org.apache.solr.common.SolrException"]
    }
  });
  const client = createSolrClient({
    baseUrl: "http://localhost:8983/proxy",
    collection: "catalog",
    fetch: async () => new Response(body, { status: 400, statusText: "Bad Request" })
  });

  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    assert.equal(error.message, "Unknown field");
    assert.equal(error.status, 400);
    assert.equal(error.statusText, "Bad Request");
    assert.equal(error.endpoint, "http://localhost:8983/proxy/solr/catalog/admin/ping");
    assert.equal(error.body, body);
    assert.deepEqual(error.payload, JSON.parse(body));
    assert.deepEqual(error.solrError, JSON.parse(body).error);
    return true;
  });
});

test("text error responses preserve their raw body", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response("upstream unavailable", { status: 502, statusText: "Bad Gateway" })
  });
  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    assert.equal(error.body, "upstream unavailable");
    assert.equal(error.payload, "upstream unavailable");
    assert.equal(error.solrError, undefined);
    return true;
  });
});

test("empty error responses have an undefined payload", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(null, { status: 503, statusText: "Unavailable" })
  });
  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    assert.equal(error.body, "");
    assert.equal(error.payload, undefined);
    return true;
  });
});

test("malformed JSON error responses remain available as text", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response("{not-json", { status: 500, statusText: "Server Error" })
  });
  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    assert.equal(error.body, "{not-json");
    assert.equal(error.payload, "{not-json");
    return true;
  });
});

test("network failures preserve the original cause and endpoint", async () => {
  const cause = new TypeError("fetch failed");
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => { throw cause; }
  });
  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrNetworkError);
    assert.equal(error.endpoint, "http://localhost:8983/solr/catalog/admin/ping");
    assert.equal(error.cause, cause);
    return true;
  });
});

test("raw export errors use the same HTTP error class", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response("forbidden", { status: 403, statusText: "Forbidden" })
  });
  await assert.rejects(client.export({ fl: "id", sort: "id asc" }), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    assert.equal(error.endpoint, "http://localhost:8983/solr/catalog/export");
    assert.equal(error.body, "forbidden");
    return true;
  });
});
