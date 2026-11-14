import assert from "node:assert/strict";
import test from "node:test";
import { createSolrClient, SolrHttpError } from "../src/index.js";

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
  for (const name of ["", " ", ".", "..", "../admin", "a/b", "a\\b"]) {
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

test("V2 replica administration serializes add and exact delete routes safely", async () => {
  const requests: { url: URL; method: string; body: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      requests.push({
        url: new URL(String(input)),
        method: String(init?.method),
        body: String(init?.body ?? "")
      });
      return new Response(JSON.stringify({ responseHeader: { status: 0 }, success: {} }));
    }
  });

  await client.v2.collections.addReplica("books", {
    shard: "shard 1", nodeSet: ["node-a", "node-b"], type: "tlog", waitForFinalState: true
  }, { async: "add-1" });
  await client.v2.collections.addReplica("books", { route: "tenant!42", node: "node-a" });
  await client.v2.collections.deleteReplica("books", "shard 1", "core_node 2", { async: "delete-1" });

  assert.deepEqual(requests.map(({ url, method }) => [url.pathname, method]), [
    ["/api/collections/books/shards/shard%201/replicas", "POST"],
    ["/api/collections/books/shards/replicas", "POST"],
    ["/api/collections/books/shards/shard%201/replicas/core_node%202", "DELETE"]
  ]);
  assert.deepEqual(JSON.parse(requests[0]!.body), {
    nodeSet: ["node-a", "node-b"], type: "tlog", waitForFinalState: true
  });
  assert.equal(requests[0]!.url.searchParams.get("async"), "add-1");
  assert.deepEqual(JSON.parse(requests[1]!.body), { route: "tenant!42", node: "node-a" });
  assert.deepEqual(Object.fromEntries(requests[2]!.url.searchParams), {
    deleteInstanceDir: "false", deleteDataDir: "false", deleteIndex: "false", async: "delete-1"
  });
});

test("V2 replica administration validates required selectors and path segments", () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(() => client.v2.collections.addReplica("books", {}), /shard or route/);
  assert.throws(() => client.v2.collections.addReplica("books", { shard: "s", route: "r" }), /shard or route, not both/);
  assert.throws(() => client.v2.collections.addReplica("books", { shard: "../admin" }), /shard name/);
  assert.throws(() => client.v2.collections.addReplica("books", { shard: "s", node: "n", nodeSet: ["n"] }), /node or nodeSet/);
  assert.throws(() => client.v2.collections.addReplica("books", { shard: "s", nodeSet: [] }), /nodeSet/);
  assert.throws(() => client.v2.collections.addReplica("books", { shard: "s", nrtReplicas: -1 }), /non-negative integer/);
  assert.throws(() => client.v2.collections.deleteReplica("books", "../admin", "replica"), /shard name/);
  assert.throws(() => client.v2.collections.deleteReplica("books", "shard", "replica/name"), /replica name/);
  assert.throws(() => client.v2.collections.deleteReplica("books", "shard", "replica", { async: " " }), /async request id/);
});

test("V2 alias lifecycle and property methods serialize documented routes and payloads", async () => {
  const requests: { url: URL; method: string; body: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), method: String(init?.method), body: String(init?.body ?? "") });
      const payload = requests.length === 1
        ? { responseHeader: { status: 0 } }
        : requests.length === 2
          ? { responseHeader: { status: 0 }, properties: { owner: "tests", generation: "2" } }
          : requests.length === 3
            ? { responseHeader: { status: 0 }, value: "tests" }
            : { responseHeader: { status: 0 } };
      return new Response(JSON.stringify(payload));
    }
  });

  await client.v2.aliases.create({ name: "books alias", collections: ["books", "archive"] }, { async: "alias-create-1" });
  const allProperties = await client.v2.aliases.getProperties("books alias");
  const oneProperty = await client.v2.aliases.getProperty("books alias", "owner name");
  await client.v2.aliases.setProperties("books alias", { owner: "tests", generation: "2" }, { async: "props-1" });
  await client.v2.aliases.setProperty("books alias", "owner name", "tests");
  await client.v2.aliases.deleteProperty("books alias", "owner name", { async: "props-2" });
  await client.v2.aliases.delete("books alias", { async: "alias-delete-1" });

  assert.deepEqual(allProperties.properties, { owner: "tests", generation: "2" });
  assert.equal(oneProperty.value, "tests");
  assert.deepEqual(requests.map(({ url, method }) => [url.pathname, method]), [
    ["/api/aliases", "POST"],
    ["/api/aliases/books%20alias/properties", "GET"],
    ["/api/aliases/books%20alias/properties/owner%20name", "GET"],
    ["/api/aliases/books%20alias/properties", "PUT"],
    ["/api/aliases/books%20alias/properties/owner%20name", "PUT"],
    ["/api/aliases/books%20alias/properties/owner%20name", "DELETE"],
    ["/api/aliases/books%20alias", "DELETE"]
  ]);
  assert.deepEqual(JSON.parse(requests[0]!.body), { name: "books alias", collections: ["books", "archive"] });
  assert.equal(requests[0]!.url.searchParams.get("async"), "alias-create-1");
  assert.deepEqual(JSON.parse(requests[3]!.body), { properties: { owner: "tests", generation: "2" } });
  assert.equal(requests[3]!.url.searchParams.get("async"), "props-1");
  assert.deepEqual(JSON.parse(requests[4]!.body), { value: "tests" });
  assert.equal(requests[5]!.url.searchParams.get("async"), "props-2");
  assert.equal(requests[6]!.url.searchParams.get("async"), "alias-delete-1");
});

test("V2 alias mutation methods preserve Solr HTTP errors", async () => {
  const client = createSolrClient({
    fetch: async () => new Response(JSON.stringify({ error: { msg: "alias already exists" } }), {
      status: 409,
      statusText: "Conflict"
    })
  });
  await assert.rejects(
    client.v2.aliases.create({ name: "books_alias", collections: ["books"] }),
    error => error instanceof SolrHttpError && error.status === 409
  );
});

test("V2 alias mutations validate names, mappings, properties and async ids before fetch", () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  for (const name of ["", " ", ".", "..", "../admin", "a/b", "a\\\\b"]) {
    assert.throws(() => client.v2.aliases.delete(name), /non-empty alias name/);
    assert.throws(() => client.v2.aliases.getProperties(name), /non-empty alias name/);
  }
  for (const property of ["", " ", ".", "..", "../admin", "a/b", "a\\\\b"]) {
    assert.throws(() => client.v2.aliases.getProperty("books", property), /non-empty property name/);
    assert.throws(() => client.v2.aliases.setProperty("books", property, "x"), /non-empty property name/);
  }
  assert.throws(() => client.v2.aliases.create({ name: "books_alias", collections: [] }), /at least one non-empty collection/);
  assert.throws(() => client.v2.aliases.create({ name: "books_alias", collections: ["books", " "] }), /at least one non-empty collection/);
  assert.throws(() => client.v2.aliases.setProperties("books_alias", {}), /at least one property/);
  assert.throws(() => client.v2.aliases.setProperties("books_alias", { " ": "x" }), /non-empty property names/);
  assert.throws(() => client.v2.aliases.setProperties("books_alias", { " owner ": "x" }), /non-empty property names/);
  assert.throws(() => client.v2.aliases.setProperty("books_alias", "owner", ""), /must not be empty/);
  assert.throws(() => client.v2.aliases.setProperty("books_alias", "owner", (1 as unknown as string)), /must be strings/);
  assert.throws(() => client.v2.aliases.setProperties("books_alias", { owner: (1 as unknown as string) }), /must be strings/);
  assert.throws(() => client.v2.aliases.delete("books_alias", { async: " " }), /async request id/);
});

test("V2 alias status rejects empty or path-like alias names before fetch", () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  for (const name of ["", " ", ".", "..", "../admin", "a/b", "a\\\\b"]) {
    assert.throws(() => client.v2.aliases.status(name), /non-empty alias name/);
  }
});

test("V2 collection backup, list, delete and restore serialize the documented Solr 9.3+ routes", async () => {
  const requests: { url: URL; method: string; body: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), method: String(init?.method), body: String(init?.body ?? "") });
      return new Response(JSON.stringify({ responseHeader: { status: 0 }, response: { backupId: 0 }, backups: [{ backupId: 0 }] }));
    }
  });

  const created = await client.v2.collections.backup("books", "books-backup", {
    location: "file:///backups", repository: "shared", incremental: true,
    extraProperties: { source: "integration" }, async: "backup-1"
  });
  const listed = await client.v2.backups.list("books-backup", { location: "file:///backups", repository: "shared" });
  const deleted = await client.v2.backups.delete("books-backup", 0, { location: "file:///backups", repository: "shared" });
  const restored = await client.v2.backups.restore("books-backup", {
    collection: "books-restored", location: "file:///backups", backupId: 0,
    "create-collection": { nrtReplicas: 1, nodeSet: ["node-a"] }
  }, { async: "restore-1" });

  assert.equal(created.response?.backupId, 0);
  assert.equal(listed.backups?.[0]?.backupId, 0);
  assert.equal(deleted.response?.backupId, 0);
  assert.equal(restored.response?.backupId, 0);
  assert.deepEqual(requests.map(({ url, method }) => [url.pathname, method]), [
    ["/api/collections/books/backups/books-backup/versions", "POST"],
    ["/api/backups/books-backup/versions", "GET"],
    ["/api/backups/books-backup/versions/0", "DELETE"],
    ["/api/backups/books-backup/restore", "POST"]
  ]);
  assert.deepEqual(JSON.parse(requests[0]!.body), {
    location: "file:///backups", repository: "shared", incremental: true,
    extraProperties: { source: "integration" }
  });
  assert.equal(requests[0]!.url.searchParams.get("async"), "backup-1");
  assert.equal(requests[1]!.url.searchParams.get("location"), "file:///backups");
  assert.equal(requests[1]!.url.searchParams.get("repository"), "shared");
  assert.equal(requests[2]!.url.searchParams.get("location"), "file:///backups");
  assert.deepEqual(JSON.parse(requests[3]!.body), {
    collection: "books-restored", location: "file:///backups",
    "create-collection": { nrtReplicas: 1, nodeSet: ["node-a"] }
  });
  assert.equal(requests[3]!.url.searchParams.get("backupId"), "0");
  assert.equal(requests[3]!.url.searchParams.get("async"), "restore-1");
});

test("V2 backup operations reject invalid names, locations, IDs and async identifiers before fetch", () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(() => client.v2.collections.backup("books", "../backup", { location: "file:///backups" }), /backup name/);
  assert.throws(() => client.v2.collections.backup("books", "backup", { location: " " }), /non-empty location/);
  assert.throws(() => client.v2.collections.backup("books", "backup", { location: "file:///backups", async: " " }), /async request id/);
  assert.throws(() => client.v2.backups.list("../backup", { location: "file:///backups" }), /backup name/);
  assert.throws(() => client.v2.backups.list("backup", { location: " " }), /non-empty location/);
  assert.throws(() => client.v2.backups.delete("backup", -1, { location: "file:///backups" }), /non-negative safe integer/);
  assert.throws(() => client.v2.backups.restore("backup", { collection: "../target" }), /collection name/);
  assert.throws(() => client.v2.backups.restore("backup", { collection: "target", backupId: -1 }), /non-negative safe integer/);
  assert.throws(() => client.v2.backups.restore("backup", { collection: "target" }, { async: " " }), /async request id/);
});
