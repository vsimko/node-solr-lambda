import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient, SolrHttpError, SolrNetworkError } from "../src/index.js";

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


test("transport rejects invalid base URL, timeout, and authentication configuration", () => {
  assert.throws(() => createSolrClient({ baseUrl: "https://solr.example.test?wt=json" }), /query string or fragment/);
  assert.throws(() => createSolrClient({ baseUrl: "https://solr.example.test/#catalog" }), /query string or fragment/);
  assert.throws(() => createSolrClient({ timeoutMs: Number.NaN }), /timeoutMs must be a positive number/);
  assert.throws(() => createSolrClient({ timeoutMs: Number.POSITIVE_INFINITY }), /timeoutMs must be a positive number/);
  assert.throws(() => createSolrClient({ auth: { type: "basic", username: " " } }), /non-empty username/);
  assert.throws(() => createSolrClient({ password: "secret" }), /A password requires a username/);
  assert.throws(() => createSolrClient({
    username: "user",
    auth: { type: "bearer", token: "token" }
  }), /Use either auth or username\/password/);
});

test("transport retry configuration rejects invalid attempt, delay, and status boundaries", () => {
  for (const maxAttempts of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => createSolrClient({ retry: { maxAttempts } }), /retry\.maxAttempts must be a positive integer/);
  }
  for (const baseDelayMs of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => createSolrClient({ retry: { baseDelayMs } }), /retry\.baseDelayMs must be zero or greater/);
  }
  for (const maxDelayMs of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => createSolrClient({ retry: { maxDelayMs } }), /retry\.maxDelayMs must be zero or greater/);
  }
  assert.throws(
    () => createSolrClient({ retry: { baseDelayMs: 10, maxDelayMs: 9 } }),
    /retry\.maxDelayMs must be greater than or equal to retry\.baseDelayMs/
  );
  for (const retryableStatuses of [[99], [600], [200.5], [Number.NaN], [Number.POSITIVE_INFINITY]]) {
    assert.throws(
      () => createSolrClient({ retry: { retryableStatuses } }),
      /retryableStatuses must contain HTTP status codes/
    );
  }
  assert.doesNotThrow(() => createSolrClient({
    retry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, retryableStatuses: [100, 200, 429, 599] }
  }));
});

test("requestRaw cleans up the timeout when Fetch returns a response without a body", async () => {
  let signal: AbortSignal | undefined;
  const client = createSolrClient({
    core: "catalog",
    timeoutMs: 10,
    fetch: async (_input, init) => {
      signal = init?.signal ?? undefined;
      return new Response(null);
    }
  });

  const response = await client.requestRaw("/solr/catalog/export");
  assert.equal(response.body, null);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(signal?.aborted, false);
});

test("requestRaw classifies response-body read failures as network errors", async () => {
  const failure = new Error("response stream failed");
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.error(failure); }
    }))
  });

  const response = await client.requestRaw("/solr/catalog/export");
  await assert.rejects(response.text(), SolrNetworkError);
});

test("requestRaw classifies non-success response-body read failures as network errors", async () => {
  const failure = new Error("error response stream failed");
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.error(failure); }
    }), { status: 503, statusText: "Service Unavailable" })
  });

  await assert.rejects(client.requestRaw("/solr/catalog/export"), SolrNetworkError);
});


test("transport validates URL protocol and embedded credentials and accepts basic auth fallbacks", async () => {
  assert.throws(() => createSolrClient({ baseUrl: "ftp://solr.example.test" }), /HTTP or HTTPS/);
  assert.throws(() => createSolrClient({ baseUrl: "https://user:secret@solr.example.test" }), /embedded credentials/);
  assert.throws(() => createSolrClient({ auth: { type: "bearer", token: " " } }), /non-empty token/);

  const authorization: string[] = [];
  const paths: string[] = [];
  const client = createSolrClient({
    baseUrl: "https://solr.example.test/solr",
    username: "legacy-user",
    fetch: async (input, init) => {
      paths.push(new URL(String(input)).pathname);
      authorization.push(new Headers(init?.headers).get("authorization") ?? "");
      return new Response("{}");
    }
  });
  await client.requestRaw("/api/cores");
  assert.deepEqual(paths, ["/api/cores"]);
  assert.deepEqual(authorization, ["Basic bGVnYWN5LXVzZXI6"]);
});

test("request without a configured core or collection fails before Fetch", async () => {
  let calls = 0;
  const client = createSolrClient({
    fetch: async () => {
      calls++;
      return new Response("{}");
    }
  });
  await assert.rejects(client.query(), /Set 'core' or 'collection'/);
  assert.equal(calls, 0);
});
