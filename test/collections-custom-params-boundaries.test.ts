import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient } from "../src/index.js";

test("Collections customParams serializes only supported scalar values", async () => {
  let requested = "";
  const client = createSolrClient({
    fetch: async input => {
      requested = String(input);
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.collections("ADDREPLICA", {
    collection: "books",
    customParams: {
      "property.zone": "hot",
      "property.weight": 3,
      "property.preferred": true,
      "property.disabled": false,
      "property.null": null,
      "property.object": { enabled: true },
      "property.array": ["a", "b"]
    }
  });

  const url = new URL(requested);
  assert.equal(url.searchParams.get("action"), "ADDREPLICA");
  assert.equal(url.searchParams.get("collection"), "books");
  assert.equal(url.searchParams.get("property.zone"), "hot");
  assert.equal(url.searchParams.get("property.weight"), "3");
  assert.equal(url.searchParams.get("property.preferred"), "true");
  assert.equal(url.searchParams.get("property.disabled"), "false");
  assert.equal(url.searchParams.has("property.null"), false);
  assert.equal(url.searchParams.has("property.object"), false);
  assert.equal(url.searchParams.has("property.array"), false);
});

test("Collections customParams safely ignores null, array, and empty containers", async () => {
  const requested: string[] = [];
  const client = createSolrClient({
    fetch: async input => {
      requested.push(String(input));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.collections("LIST", { customParams: null });
  await client.collections("LIST", { customParams: {} });

  for (const target of requested) {
    const url = new URL(target);
    assert.equal(url.searchParams.get("action"), "LIST");
    assert.deepEqual([...url.searchParams.keys()], ["action"]);
  }
});
