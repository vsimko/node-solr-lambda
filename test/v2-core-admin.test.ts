import assert from "node:assert/strict";
import test from "node:test";
import { createSolrClient } from "../src/index.js";

test("V2 Core Admin status methods use the documented GET routes and query parameters", async () => {
  const requests: { url: URL; method: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), method: String(init?.method) });
      return new Response(JSON.stringify({ responseHeader: { status: 0 }, status: { books: { name: "books" } } }));
    }
  });

  const all = await client.v2.coreAdmin.list({ indexInfo: false });
  const one = await client.v2.coreAdmin.status("books", { indexInfo: true });

  assert.equal(all.status?.books?.name, "books");
  assert.equal(one.status?.books?.name, "books");
  assert.equal(requests[0]!.url.pathname, "/api/cores/");
  assert.equal(requests[0]!.method, "GET");
  assert.equal(requests[0]!.url.searchParams.get("indexInfo"), "false");
  assert.equal(requests[1]!.url.pathname, "/api/cores/books");
  assert.equal(requests[1]!.method, "GET");
  assert.equal(requests[1]!.url.searchParams.get("indexInfo"), "true");
});

test("V2 Core Admin lifecycle methods serialize exact V2 routes and bodies", async () => {
  const requests: { url: URL; method: string; body?: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      requests.push({
        url: new URL(String(input)),
        method: String(init?.method),
        ...(init?.body === undefined ? {} : { body: String(init.body) })
      });
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.v2.coreAdmin.reload("books");
  await client.v2.coreAdmin.rename("books", { to: "books-renamed" });
  await client.v2.coreAdmin.unload("books", { deleteIndex: true, deleteDataDir: true });

  assert.equal(requests[0]!.url.pathname, "/api/cores/books/reload");
  assert.equal(requests[0]!.method, "POST");
  assert.equal(requests[0]!.body, undefined);
  assert.equal(requests[1]!.url.pathname, "/api/cores/books/rename");
  assert.equal(requests[1]!.method, "POST");
  assert.deepEqual(JSON.parse(requests[1]!.body!), { to: "books-renamed" });
  assert.equal(requests[2]!.url.pathname, "/api/cores/books/unload");
  assert.equal(requests[2]!.method, "POST");
  assert.deepEqual(JSON.parse(requests[2]!.body!), { deleteIndex: true, deleteDataDir: true });
});

test("V2 Core Admin rejects empty or path-like core names before fetch", () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  for (const name of ["", " ", "../admin", "a/b", "a\\\\b"]) {
    assert.throws(() => client.v2.coreAdmin.status(name), /non-empty core name/);
  }
});
