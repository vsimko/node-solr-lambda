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
      const read = async () => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            reader.read(),
            new Promise<never>((_resolve, reject) => {
              timeout = setTimeout(() => reject(new Error("Timed out waiting for streamed request frame")), 100);
            })
          ]);
        } finally {
          if (timeout !== undefined) clearTimeout(timeout);
        }
      };

      const opening = await read();
      assert.equal(decoder.decode(opening.value), "[");
      const document = await read();
      assert.equal(decoder.decode(document.value), '{"id":"framing"}');
      const closing = await read();
      assert.equal(decoder.decode(closing.value), "]");
      const end = await read();
      assert.equal(end.done, true, "the request body must close after the JSON array delimiter");

      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    yield { id: "framing" };
  }

  await client.addStream(documents());
});
