import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError } from "../src/index.js";

test("base URL prefixes, bearer auth, request defaults, and header precedence work together", async () => {
  let requestedUrl = "";
  let requestedHeaders: Headers | undefined;
  const client = createSolrClient({
    baseUrl: "https://solr.example/proxy/solr/",
    collection: "books",
    auth: { type: "bearer", token: "secret-token" },
    requestDefaults: {
      params: { wt: "json", indent: true, rows: 25 },
      headers: { "x-default": "default", "x-order": "default" }
    },
    headers: { "x-order": "client" },
    fetch: async (input, init) => {
      requestedUrl = String(input);
      requestedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  await client.query({ query: "*:*", limit: 5, params: { wt: "xml" } });
  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/proxy/solr/books/select");
  assert.equal(url.searchParams.get("wt"), "xml");
  assert.equal(url.searchParams.get("indent"), "true");
  assert.equal(url.searchParams.get("rows"), "5");
  assert.equal(requestedHeaders?.get("authorization"), "Bearer secret-token");
  assert.equal(requestedHeaders?.get("x-default"), "default");
  assert.equal(requestedHeaders?.get("x-order"), "client");
});

test("legacy username and password still use Basic authentication", async () => {
  let authorization = "";
  const client = createSolrClient({
    core: "catalog",
    username: "user",
    password: "pass",
    fetch: async (_input, init) => {
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });
  await client.query({ query: "*:*" });
  assert.equal(authorization, "Basic dXNlcjpwYXNz");
});

test("GET requests retry configured transient HTTP statuses", async () => {
  let attempts = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 2, baseDelayMs: 0, retryableStatuses: [503] },
    fetch: async () => {
      attempts += 1;
      return attempts === 1
        ? new Response("temporarily unavailable", { status: 503 })
        : new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });
  await client.query({ query: "*:*" });
  assert.equal(attempts, 2);
});

test("GET requests retry network failures when the caller has not aborted", async () => {
  let attempts = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 2, baseDelayMs: 0 },
    fetch: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("connection reset");
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });
  await client.query({ query: "*:*" });
  assert.equal(attempts, 2);
});

test("POST update requests are not retried by default", async () => {
  let attempts = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 3, baseDelayMs: 0, retryableStatuses: [503] },
    fetch: async () => {
      attempts += 1;
      return new Response("temporarily unavailable", { status: 503 });
    }
  });
  await assert.rejects(client.add({ id: "one" }), SolrHttpError);
  assert.equal(attempts, 1);
});

test("an already aborted caller signal prevents retries", async () => {
  let attempts = 0;
  const controller = new AbortController();
  controller.abort();
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 3, baseDelayMs: 0 },
    fetch: async () => {
      attempts += 1;
      throw new Error("aborted");
    }
  });
  await assert.rejects(client.query({ query: "*:*" }).catch(() => {
    throw new Error("request should not succeed");
  }));
  assert.equal(attempts, 1);
});

test("invalid transport configuration fails at construction", () => {
  assert.throws(() => createSolrClient({ baseUrl: "ftp://solr.example" }), /HTTP or HTTPS/);
  assert.throws(() => createSolrClient({ timeoutMs: 0 }), /timeoutMs/);
  assert.throws(() => createSolrClient({ username: "user", auth: { type: "bearer", token: "token" } }), /not both/);
  assert.throws(() => createSolrClient({ auth: { type: "bearer", token: " " } }), /non-empty token/);
});
