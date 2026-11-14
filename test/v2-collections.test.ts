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

test("V2 Collections create posts the flat post-9.3 request body", async () => {
  let captured: { url: URL; method: string; body: string | undefined } | undefined;
  const client = createSolrClient({
    fetch: async (input, init) => {
      captured = { url: new URL(String(input)), method: String(init?.method), body: String(init?.body ?? "") };
      return new Response(JSON.stringify({ responseHeader: { status: 0 }, collection: "books" }));
    }
  });
  const response = await client.v2.collections.create({
    name: "books", config: "books-config", numShards: 2, replicationFactor: 2
  });
  assert.equal(captured!.url.pathname, "/api/collections");
  assert.equal(captured!.method, "POST");
  assert.deepEqual(JSON.parse(captured!.body!), {
    name: "books", config: "books-config", numShards: 2, replicationFactor: 2
  });
  assert.equal(response.collection, "books");
});

test("V2 Collections delete uses DELETE and serializes only explicit directory flags", async () => {
  let captured: { url: URL; method: string } | undefined;
  const client = createSolrClient({
    fetch: async (input, init) => {
      captured = { url: new URL(String(input)), method: String(init?.method) };
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.v2.collections.delete("books archive", { deleteIndex: true });
  assert.equal(captured!.url.pathname, "/api/collections/books%20archive");
  assert.equal(captured!.method, "DELETE");
  assert.equal(captured!.url.searchParams.get("deleteIndex"), "true");
  assert.equal(captured!.url.searchParams.has("deleteDataDir"), false);
  assert.equal(captured!.url.searchParams.has("deleteInstanceDir"), false);
});

test("V2 Collections reload uses POST /api/collections/{collection}/reload", async () => {
  let captured: { url: URL; method: string } | undefined;
  const client = createSolrClient({
    fetch: async (input, init) => {
      captured = { url: new URL(String(input)), method: String(init?.method) };
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.v2.collections.reload("books");
  assert.equal(captured!.url.pathname, "/api/collections/books/reload");
  assert.equal(captured!.method, "POST");
});

test("V2 Collections lifecycle methods validate names before fetch", () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(() => client.v2.collections.create({ name: " ", config: "books" }), /non-empty name and config/);
  for (const name of ["", " ", "../admin", "a/b", "a\\\\b"]) {
    assert.throws(() => client.v2.collections.delete(name), /non-empty collection name/);
    assert.throws(() => client.v2.collections.reload(name), /non-empty collection name/);
  }
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

test("V2 alias list and status use the documented GET routes", async () => {
  const requests: { url: URL; method: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), method: String(init?.method) });
      const body = requests.length === 1
        ? { responseHeader: { status: 0 }, aliases: { books_alias: "books" }, properties: {} }
        : { responseHeader: { status: 0 }, alias: "books_alias", collections: ["books"], properties: { owner: "tests" } };
      return new Response(JSON.stringify(body));
    }
  });

  const list = await client.v2.aliases.list();
  const status = await client.v2.aliases.status("books_alias");
  assert.equal(list.aliases?.books_alias, "books");
  assert.deepEqual(status.collections, ["books"]);
  assert.equal(status.properties?.owner, "tests");
  assert.equal(requests[0]!.url.pathname, "/api/aliases");
  assert.equal(requests[0]!.method, "GET");
  assert.equal(requests[1]!.url.pathname, "/api/aliases/books_alias");
  assert.equal(requests[1]!.method, "GET");
});

test("V2 alias status falls back to the V2 list only when detail GET is not allowed", async () => {
  const requests: { url: URL; method: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      const url = new URL(String(input));
      const method = String(init?.method);
      requests.push({ url, method });
      if (url.pathname === "/api/aliases/books_alias") {
        return new Response("", { status: 405, statusText: "Method Not Allowed" });
      }
      return new Response(JSON.stringify({
        responseHeader: { status: 0 },
        aliases: { books_alias: "books,archive" },
        properties: { books_alias: { owner: "tests" } }
      }));
    }
  });

  const status = await client.v2.aliases.status("books_alias");
  assert.equal(requests[0]!.url.pathname, "/api/aliases/books_alias");
  assert.equal(requests[0]!.method, "GET");
  assert.equal(requests[1]!.url.pathname, "/api/aliases");
  assert.equal(requests[1]!.method, "GET");
  assert.equal(status.alias, "books_alias");
  assert.deepEqual(status.collections, ["books", "archive"]);
  assert.deepEqual(status.properties, { owner: "tests" });
});

test("V2 alias status preserves non-405 detail errors", async () => {
  const client = createSolrClient({
    fetch: async () => new Response(JSON.stringify({ error: { msg: "forbidden" } }), {
      status: 403,
      statusText: "Forbidden"
    })
  });
  await assert.rejects(client.v2.aliases.status("books_alias"), (error: unknown) =>
    error instanceof Error && "status" in error && error.status === 403
  );
});

test("V2 alias status rejects empty or path-like alias names before fetch", () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  for (const name of ["", " ", ".", "..", "../admin", "a/b", "a\\\\b"]) {
    assert.throws(() => client.v2.aliases.status(name), /non-empty alias name/);
  }
});
