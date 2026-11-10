import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient, SolrHttpError } from "../src/index.js";

test("retry policy can be disabled for otherwise retryable GET responses", async () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: false,
    fetch: async () => {
      calls += 1;
      return new Response("temporarily unavailable", { status: 503 });
    }
  });

  await assert.rejects(client.ping(), SolrHttpError);
  assert.equal(calls, 1);
});

test("retry policy does not retry non-configured HTTP statuses", async () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 4, baseDelayMs: 0, maxDelayMs: 0 },
    fetch: async () => {
      calls += 1;
      return new Response("invalid request", { status: 400 });
    }
  });

  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    assert.equal(error.status, 400);
    return true;
  });
  assert.equal(calls, 1);
});

test("retryable rate-limit responses are retried when configured", async () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: {
      maxAttempts: 3,
      retryableStatuses: [429],
      baseDelayMs: 0,
      maxDelayMs: 0
    },
    fetch: async () => {
      calls += 1;
      return calls === 1
        ? new Response("rate limited", { status: 429 })
        : new Response(JSON.stringify({ status: "ok" }));
    }
  });

  assert.deepEqual(await client.ping(), { status: "ok" });
  assert.equal(calls, 2);
});

test("successful empty and non-JSON responses preserve their response bodies", async () => {
  const responses = [new Response(null), new Response("plain-text response")];
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => responses.shift()!
  });

  assert.equal(await client.ping(), undefined);
  assert.equal(await client.ping(), "plain-text response");
});

test("URLSearchParams retain repeated values while request defaults fill only missing keys", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test/proxy/solr",
    requestDefaults: { params: { wt: "json", rows: 20, fq: ["tenant:one", "active:true"] } },
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ status: "ok" }));
    }
  });
  const query = new URLSearchParams();
  query.append("fq", "type:book");
  query.append("fq", "status:published");
  query.set("rows", "5");

  await client.requestRaw("/solr/catalog/select", { query });
  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/proxy/solr/catalog/select");
  assert.equal(url.searchParams.get("wt"), "json");
  assert.equal(url.searchParams.get("rows"), "5");
  assert.deepEqual(url.searchParams.getAll("fq"), [
    "type:book",
    "status:published"
  ]);
});
