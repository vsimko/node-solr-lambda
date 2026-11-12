import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient } from "../src/index.js";

test("addStream emits exactly one JSON array frame and closes the request body", async () => {
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    fetch: async (_input, init) => {
      const reader = (init?.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      try {
        const opening = await reader.read();
        assert.equal(decoder.decode(opening.value), "[");
        const document = await reader.read();
        assert.equal(decoder.decode(document.value), '{"id":"framing"}');
        const closing = await reader.read();
        assert.equal(decoder.decode(closing.value), "]");
        const end = await reader.read();
        assert.equal(end.done, true, "the request body must close after the JSON array delimiter");
      } catch (error) {
        void reader.cancel().catch(() => undefined);
        throw error;
      }
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    yield { id: "framing" };
  }

  await client.addStream(documents());
});
