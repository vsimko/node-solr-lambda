import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient, SolrAbortError, SolrNetworkError } from "../src/index.js";

test("Streaming Expressions parse the complete JSON response envelope", async () => {
  let requestUrl = "";
  let accept = "";
  const payload = { "result-set": { docs: [{ id: "doc-1" }] } };
  const client = createSolrClient({
    collection: "catalog",
    fetch: async (input, init) => {
      requestUrl = String(input);
      accept = new Headers(init?.headers).get("accept") ?? "";
      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" }
      });
    }
  });

  const result = await client.stream<typeof payload>("search(catalog, q=*:*)");
  assert.deepEqual(result, payload);
  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/solr/catalog/stream");
  assert.equal(url.searchParams.get("wt"), "json");
  assert.equal(accept, "application/json");
});

test("Streaming Expressions retain expression tuples and server error tuples in the JSON envelope", async () => {
  const payload = {
    "result-set": {
      docs: [
        { id: "doc-1", score: 1.5, customOperatorField: { value: true } },
        { EXCEPTION: "Expression evaluation failed", EOF: true }
      ],
      EOF: true,
      RESPONSE_TIME: 12
    },
    futureEnvelopeField: "preserved"
  };
  const client = createSolrClient({
    collection: "catalog",
    fetch: async () => new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json" }
    })
  });

  const result = await client.stream("search(catalog, q=*:*)");
  assert.deepEqual(result, payload);
  assert.equal(result["result-set"]?.docs?.[1]?.EXCEPTION, "Expression evaluation failed");
  assert.equal(result.futureEnvelopeField, "preserved");
});

test("Streaming Expressions caller cancellation interrupts response-body consumption", async () => {
  const controller = new AbortController();
  const reason = new Error("cancel Streaming Expressions response");
  let bodyStarted!: () => void;
  const started = new Promise<void>(resolve => { bodyStarted = resolve; });
  const client = createSolrClient({
    collection: "catalog",
    timeoutMs: 1_000,
    fetch: async (_input, init) => new Response(new ReadableStream<Uint8Array>({
      start(streamController) {
        streamController.enqueue(new TextEncoder().encode('{"result-set":'));
        init?.signal?.addEventListener("abort", () => streamController.error(init.signal?.reason), { once: true });
        bodyStarted();
      }
    }))
  });

  const pending = client.stream("search(catalog, q=*:*)", { signal: controller.signal });
  await started;
  controller.abort(reason);
  await assert.rejects(pending, (error: unknown) => {
    assert.ok(error instanceof SolrAbortError);
    assert.equal(error.reason, reason);
    return true;
  });
});

test("Streaming Expressions body read errors are classified and request cleanup allows reuse", async () => {
  let calls = 0;
  const client = createSolrClient({
    collection: "catalog",
    timeoutMs: 1_000,
    fetch: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(new ReadableStream<Uint8Array>({
          start(streamController) {
            streamController.error(new Error("broken Streaming Expressions response"));
          }
        }));
      }
      return new Response(JSON.stringify({ status: "ok" }));
    }
  });

  await assert.rejects(client.stream("search(catalog, q=*:*)"), SolrNetworkError);
  assert.deepEqual(await client.ping(), { status: "ok" });
  assert.equal(calls, 2);
});
