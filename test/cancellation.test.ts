import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrAbortError, SolrTimeoutError } from "../src/index.js";

test("client timeout aborts a pending request with SolrTimeoutError", async () => {
  const client = createSolrClient({
    core: "catalog",
    timeoutMs: 15,
    fetch: async (_input, init) => new Promise((_resolve, reject) => {
      const signal = init?.signal ?? undefined;
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    })
  });

  await assert.rejects(client.query({ query: "*:*" }), (error: unknown) => {
    assert.ok(error instanceof SolrTimeoutError);
    assert.equal(error.timeoutMs, 15);
    assert.equal(error.endpoint, "http://localhost:8983/solr/catalog/select");
    return true;
  });
});

test("timeout remains active while a JSON response body is being read", async () => {
  const client = createSolrClient({
    core: "catalog",
    timeoutMs: 10,
    fetch: async (_input, init) => new Response(new ReadableStream<Uint8Array>({
      start(streamController) {
        const signal = init?.signal ?? undefined;
        signal?.addEventListener("abort", () => streamController.error(signal.reason), { once: true });
      }
    }))
  });

  await assert.rejects(client.ping(), SolrTimeoutError);
});

test("per-request timeout overrides the client timeout", async () => {
  const client = createSolrClient({
    core: "catalog",
    timeoutMs: 1000,
    fetch: async (_input, init) => new Promise((_resolve, reject) => {
      if (!init?.signal) throw new Error("expected request signal");
      const signal = init.signal;
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    })
  });

  await assert.rejects(client.ping({ timeoutMs: 10 }), (error: unknown) => {
    assert.ok(error instanceof SolrTimeoutError);
    assert.equal(error.timeoutMs, 10);
    return true;
  });
});

test("caller cancellation is distinct from a timeout", async () => {
  const controller = new AbortController();
  const reason = new Error("cancelled by caller");
  const client = createSolrClient({
    core: "catalog",
    timeoutMs: 1000,
    fetch: async (_input, init) => new Promise((_resolve, reject) => {
      if (!init?.signal) throw new Error("expected request signal");
      const signal = init.signal;
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    })
  });

  const request = client.query({ query: "*:*" }, { signal: controller.signal });
  setTimeout(() => controller.abort(reason), 5);
  await assert.rejects(request, (error: unknown) => {
    assert.ok(error instanceof SolrAbortError);
    assert.equal(error.reason, reason);
    assert.equal(error.endpoint, "http://localhost:8983/solr/catalog/select");
    return true;
  });
});

test("successful JSON requests clear the timeout", async () => {
  let signal: AbortSignal | undefined;
  const client = createSolrClient({
    core: "catalog",
    timeoutMs: 10,
    fetch: async (_input, init) => {
      signal = init?.signal ?? undefined;
      return new Response(JSON.stringify({ status: "ok" }));
    }
  });

  await client.ping();
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(signal?.aborted, false);
});

test("raw export keeps cancellation active while its body is consumed", async () => {
  const controller = new AbortController();
  const reason = new Error("stop export");
  const client = createSolrClient({
    core: "catalog",
    timeoutMs: 1000,
    fetch: async (_input, init) => new Response(new ReadableStream<Uint8Array>({
      start(streamController) {
        const signal = init?.signal ?? undefined;
        signal?.addEventListener("abort", () => streamController.error(signal.reason), { once: true });
      }
    }))
  });

  const response = await client.export({ fl: "id", sort: "id asc" }, { signal: controller.signal });
  const reader = response.body!.getReader();
  const pendingRead = reader.read();
  controller.abort(reason);
  await assert.rejects(pendingRead, SolrAbortError);
});

test("raw export clears timeout when the response body is consumed", async () => {
  let signal: AbortSignal | undefined;
  const client = createSolrClient({
    core: "catalog",
    timeoutMs: 10,
    fetch: async (_input, init) => {
      signal = init?.signal ?? undefined;
      return new Response("id\n1\n");
    }
  });

  const response = await client.export({ fl: "id", sort: "id asc" });
  assert.equal(await response.text(), "id\n1\n");
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(signal?.aborted, false);
});
