import assert from "node:assert/strict";
import test from "node:test";
import { createSolrClient } from "../src/index.js";

test("V2 Collections list and status use the documented GET routes", async () => {
  const requests: { url: URL; method: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), method: String(init?.method) });
      const body = requests.length === 1
        ? { responseHeader: { status: 0 }, collections: ["books", "users"] }
        : { responseHeader: { status: 0 }, books: { activeShards: 1, inactiveShards: 0 } };
      return new Response(JSON.stringify(body));
    }
  });

  const list = await client.v2.collections.list();
  const status = await client.v2.collections.status("books", { coreInfo: true, segments: false });

  assert.deepEqual(list.collections, ["books", "users"]);
  assert.equal(requests[0]!.url.pathname, "/api/collections");
  assert.equal(requests[0]!.method, "GET");
  assert.equal(requests[1]!.url.pathname, "/api/collections/books");
  assert.equal(requests[1]!.method, "GET");
  assert.equal(requests[1]!.url.searchParams.get("coreInfo"), "true");
  assert.equal(requests[1]!.url.searchParams.get("segments"), "false");
  assert.equal((status.books as { activeShards?: number }).activeShards, 1);
});

test("V2 cluster status uses GET /api/cluster and preserves the extensible response", async () => {
  const requests: { url: URL; method: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), method: String(init?.method) });
      return new Response(JSON.stringify({
        responseHeader: { status: 0 },
        collections: ["books"],
        cluster: { live_nodes: ["node1"] }
      }));
    }
  });

  const status = await client.v2.cluster.status();
  assert.deepEqual(status.collections, ["books"]);
  assert.deepEqual(status.cluster?.live_nodes, ["node1"]);
  assert.equal(requests[0]!.url.pathname, "/api/cluster");
  assert.equal(requests[0]!.method, "GET");
});

test("V2 Collections status rejects empty or path-like collection names before fetch", () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  for (const name of ["", " ", "../admin", "a/b", "a\\b"]) {
    assert.throws(() => client.v2.collections.status(name), /non-empty collection name/);
  }
});
