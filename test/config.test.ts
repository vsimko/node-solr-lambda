import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
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

test("request defaults preserve object inputs for optional validation", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    core: "catalog",
    requestDefaults: { params: { wt: "json" } },
    validation: { inputs: { query: z.object({ q: z.string(), wt: z.string() }) } },
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });
  await client.query({ query: "book" });
  assert.equal(new URL(requestedUrl).searchParams.get("wt"), "json");
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

test("POST requests retry only when the method is explicitly enabled", async () => {
  let attempts = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 2, baseDelayMs: 0, methods: ["GET", "POST"], retryableStatuses: [503] },
    fetch: async () => {
      attempts += 1;
      return attempts === 1
        ? new Response("temporarily unavailable", { status: 503 })
        : new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.add({ id: "one" });
  assert.equal(attempts, 2);
});

test("an already aborted caller signal prevents the request from starting", async () => {
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
  await assert.rejects(client.request("/solr/catalog/select", { signal: controller.signal, operation: "query" }), /aborted/);
  assert.equal(attempts, 0);
});

test("invalid transport configuration fails at construction", () => {
  assert.throws(() => createSolrClient({ baseUrl: "ftp://solr.example" }), /HTTP or HTTPS/);
  assert.throws(() => createSolrClient({ timeoutMs: 0 }), /timeoutMs/);
  assert.throws(() => createSolrClient({ username: "user", auth: { type: "bearer", token: "token" } }), /not both/);
  assert.throws(() => createSolrClient({ auth: { type: "bearer", token: " " } }), /non-empty token/);
  assert.throws(() => createSolrClient({ baseUrl: "https://user:pass@solr.example" }), /embedded credentials/);
  assert.throws(() => createSolrClient({ retry: { maxAttempts: 0 } }), /positive integer/);
});


test("Config API customOptions are flattened into the native plugin definition", async () => {
  let body: unknown;
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.config({
    "add-requesthandler": {
      name: "/custom",
      class: "example.CustomHandler",
      customOptions: { cacheEnabled: true, maxItems: 25 }
    }
  });

  assert.deepEqual(body, {
    "add-requesthandler": {
      name: "/custom",
      class: "example.CustomHandler",
      cacheEnabled: true,
      maxItems: 25
    }
  });
});


test("Config API serializes request-handler and search-component lifecycle commands", async () => {
  const bodies: unknown[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ responseHeader: { status: 0, QTime: 1 } }));
    }
  });

  const addedHandler = await client.config({
    "add-requesthandler": {
      name: "/select-test",
      class: "solr.SearchHandler",
      defaults: { rows: 5, wt: "json" }
    }
  });
  await client.config({
    "update-requesthandler": {
      name: "/select-test",
      class: "solr.SearchHandler",
      defaults: { rows: 10, wt: "json" }
    }
  });
  await client.config({ "delete-requesthandler": "/select-test" });
  await client.config({
    "add-searchcomponent": {
      name: "terms-test",
      class: "solr.TermsComponent"
    }
  });
  await client.config({ "delete-searchcomponent": "terms-test" });

  assert.equal(addedHandler.responseHeader?.status, 0);
  assert.equal(addedHandler.responseHeader?.QTime, 1);
  assert.deepEqual(bodies, [
    {
      "add-requesthandler": {
        name: "/select-test",
        class: "solr.SearchHandler",
        defaults: { rows: 5, wt: "json" }
      }
    },
    {
      "update-requesthandler": {
        name: "/select-test",
        class: "solr.SearchHandler",
        defaults: { rows: 10, wt: "json" }
      }
    },
    { "delete-requesthandler": "/select-test" },
    {
      "add-searchcomponent": {
        name: "terms-test",
        class: "solr.TermsComponent"
      }
    },
    { "delete-searchcomponent": "terms-test" }
  ]);
});

test("Config API preserves Solr HTTP failures", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({
      error: { code: 400, msg: "Unknown Config API command" }
    }), { status: 400, headers: { "content-type": "application/json" } })
  });

  await assert.rejects(
    client.config({
      "add-requesthandler": {
        name: "/invalid",
        class: "solr.SearchHandler"
      }
    }),
    error => error instanceof SolrHttpError && error.status === 400
  );
});


test("Config API serializes listener lifecycle commands", async () => {
  const bodies: unknown[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.config({
    "add-listener": {
      name: "post-commit-test",
      class: "solr.QuerySenderListener",
      event: "postCommit"
    }
  });
  await client.config({
    "update-listener": {
      name: "post-commit-test",
      class: "solr.QuerySenderListener",
      event: "postCommit"
    }
  });
  await client.config({ "delete-listener": "post-commit-test" });

  assert.deepEqual(bodies, [
    {
      "add-listener": {
        name: "post-commit-test",
        class: "solr.QuerySenderListener",
        event: "postCommit"
      }
    },
    {
      "update-listener": {
        name: "post-commit-test",
        class: "solr.QuerySenderListener",
        event: "postCommit"
      }
    },
    { "delete-listener": "post-commit-test" }
  ]);
});
