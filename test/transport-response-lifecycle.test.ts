import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient } from "../src/index.js";

test("requestRaw cancellation cancels the source body and clears the request timeout", async () => {
  let requestSignal: AbortSignal | undefined;
  let sourceCancelled = false;
  const client = createSolrClient({
    core: "catalog",
    timeoutMs: 15,
    fetch: async (_input, init) => {
      requestSignal = init?.signal ?? undefined;
      return new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("first chunk"));
        },
        cancel() {
          sourceCancelled = true;
        }
      }));
    }
  });

  const response = await client.requestRaw("/solr/catalog/export");
  const reader = response.body!.getReader();
  const first = await reader.read();
  assert.equal(new TextDecoder().decode(first.value), "first chunk");

  await reader.cancel("consumer stopped");
  await new Promise(resolve => setTimeout(resolve, 25));

  assert.equal(sourceCancelled, true);
  assert.ok(requestSignal instanceof AbortSignal);
  assert.equal(requestSignal.aborted, false);
});
