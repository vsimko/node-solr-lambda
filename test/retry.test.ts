import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSolrClient,
  SolrAbortError,
  SolrHttpError,
  SolrNetworkError
} from "../src/index.js";

test("GET retries transient HTTP responses up to the configured attempt limit", async () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
    fetch: async () => {
      calls += 1;
      return calls < 3
        ? new Response("temporarily unavailable", { status: 503 })
        : new Response(JSON.stringify({ status: "ok" }));
    }
  });

  assert.deepEqual(await client.ping(), { status: "ok" });
  assert.equal(calls, 3);
});

test("GET retries network failures and respects retryNetworkErrors", async () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
    fetch: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("temporary network failure");
      return new Response(JSON.stringify({ status: "ok" }));
    }
  });

  assert.deepEqual(await client.ping(), { status: "ok" });
  assert.equal(calls, 2);

  let disabledCalls = 0;
  const noNetworkRetry = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 3, retryNetworkErrors: false },
    fetch: async () => {
      disabledCalls += 1;
      throw new TypeError("network unavailable");
    }
  });

  await assert.rejects(noNetworkRetry.ping(), SolrNetworkError);
  assert.equal(disabledCalls, 1);
});

test("non-idempotent update POST requests are not retried by default", async () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
    fetch: async () => {
      calls += 1;
      return new Response("temporary failure", { status: 503 });
    }
  });

  await assert.rejects(client.add({ id: "book-1" }), SolrHttpError);
  assert.equal(calls, 1);
});

test("update POST requests can be retried only when explicitly enabled", async () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: {
      maxAttempts: 2,
      baseDelayMs: 0,
      maxDelayMs: 0,
      methods: ["GET", "POST"]
    },
    fetch: async () => {
      calls += 1;
      return calls === 1
        ? new Response("temporary failure", { status: 503 })
        : new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.add({ id: "book-1" });
  assert.equal(calls, 2);
});

test("caller cancellation stops retries immediately", async () => {
  const controller = new AbortController();
  const reason = new Error("cancelled by caller");
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
    fetch: async () => {
      calls += 1;
      controller.abort(reason);
      throw reason;
    }
  });

  await assert.rejects(
    client.ping({ signal: controller.signal }),
    (error: unknown) => {
      assert.ok(error instanceof SolrAbortError);
      assert.equal(error.reason, reason);
      return true;
    }
  );
  assert.equal(calls, 1);
});

test("custom retryable statuses and maxAttempts are respected", async () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: {
      maxAttempts: 4,
      retryableStatuses: [429],
      baseDelayMs: 0,
      maxDelayMs: 0
    },
    fetch: async () => {
      calls += 1;
      return new Response("server error", { status: 503 });
    }
  });

  await assert.rejects(client.ping(), SolrHttpError);
  assert.equal(calls, 1);
});
