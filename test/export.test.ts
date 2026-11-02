import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient } from "../src/index.js";

test("export serializes typed field lists, sort clauses, and repeated filters", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async input => {
      requestedUrl = String(input);
      return new Response("[]");
    }
  });

  const response = await client.export({
    q: "status:published",
    fq: ["tenant:one", "active:true"],
    fl: ["id", "price_d", "title_s"],
    sort: [{ field: "price_d", direction: "asc" }, "id desc"],
    batchSize: 500,
    wt: "json"
  });
  const params = new URL(requestedUrl).searchParams;
  assert.equal(response.ok, true);
  assert.equal(params.get("q"), "status:published");
  assert.deepEqual(params.getAll("fq"), ["tenant:one", "active:true"]);
  assert.equal(params.get("fl"), "id,price_d,title_s");
  assert.equal(params.get("sort"), "price_d asc, id desc");
  assert.equal(params.get("batchSize"), "500");
  assert.equal(params.get("wt"), "json");
});

test("exportStream exposes response bytes incrementally", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id":"one"}\n'));
        controller.enqueue(new TextEncoder().encode('{"id":"two"}\n'));
        controller.close();
      }
    }))
  });

  const stream = await client.exportStream({ fl: "id", sort: "id asc" });
  const reader = stream.getReader();
  const first = await reader.read();
  const second = await reader.read();
  assert.equal(new TextDecoder().decode(first.value), '{"id":"one"}\n');
  assert.equal(new TextDecoder().decode(second.value), '{"id":"two"}\n');
  assert.equal((await reader.read()).done, true);
});

test("export rejects missing required parameters and invalid batch sizes", () => {
  const client = createSolrClient({ core: "catalog", fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(() => client.export({ fl: "", sort: "id asc" }), /Export fl/);
  assert.throws(() => client.export({ fl: "id", sort: "" }), /Export sort/);
  assert.throws(() => client.export({ fl: "id", sort: [], batchSize: 10 }), /Export sort/);
  assert.throws(() => client.export({ fl: "id", sort: "id asc", batchSize: 0 }), /batchSize/);
  assert.throws(() => client.export({ fl: "id", sort: "id asc", customParams: { wt: "csv" } }), /cannot override/);
});
