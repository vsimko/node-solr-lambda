import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError } from "../src/index.js";

test("query maps options to Solr parameters", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });
  await client.query({ query: "*:*", filter: ["type:book", "active:true"], limit: 5, offset: 10 });
  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/solr/catalog/select");
  assert.equal(url.searchParams.get("q"), "*:*");
  assert.equal(url.searchParams.getAll("fq").length, 2);
  assert.equal(url.searchParams.get("rows"), "5");
  assert.equal(url.searchParams.get("start"), "10");
});

test("query serializes typed parser, operator, writer, and custom parameters", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  await client.query({
    query: "title:solr",
    defType: "edismax",
    "q.op": "AND",
    wt: "json",
    params: { "facet.field": "category" }
  });

  const params = new URL(requestedUrl).searchParams;
  assert.equal(params.get("defType"), "edismax");
  assert.equal(params.get("q.op"), "AND");
  assert.equal(params.get("wt"), "json");
  assert.equal(params.get("facet.field"), "category");
});

test("add sends a document array", async () => {
  let body = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      body = String(init?.body);
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.add({ id: "one" });
  assert.deepEqual(JSON.parse(body), [{ id: "one" }]);
});

test("add and full-document update serialize overwrite, commitWithin, and SolrCloud route", async () => {
  const requests: { url: URL; body: unknown }[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.add({ id: "one" }, { overwrite: false, commitWithin: 5000, route: "tenant-a" });
  await client.update({ id: "two" }, { overwrite: true, route: "tenant-b" });

  assert.deepEqual(requests[0]!.body, [{ id: "one" }]);
  assert.equal(requests[0]!.url.searchParams.get("overwrite"), "false");
  assert.equal(requests[0]!.url.searchParams.get("commitWithin"), "5000");
  assert.equal(requests[0]!.url.searchParams.get("_route_"), "tenant-a");
  assert.deepEqual(requests[1]!.body, [{ id: "two" }]);
  assert.equal(requests[1]!.url.searchParams.get("overwrite"), "true");
  assert.equal(requests[1]!.url.searchParams.get("_route_"), "tenant-b");
});

test("delete supports ID and query commands with route and commitWithin options", async () => {
  const requests: { url: URL; body: unknown }[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.delete("one", { route: "tenant-a", commitWithin: 1000 });
  await client.delete({ query: "status:expired" }, { route: "tenant-b" });

  assert.deepEqual(requests[0]!.body, { delete: { id: "one" } });
  assert.equal(requests[0]!.url.searchParams.get("_route_"), "tenant-a");
  assert.equal(requests[0]!.url.searchParams.get("commitWithin"), "1000");
  assert.deepEqual(requests[1]!.body, { delete: { query: "status:expired" } });
  assert.equal(requests[1]!.url.searchParams.get("_route_"), "tenant-b");
});

test("atomicUpdate serializes field modifiers without changing the document envelope", async () => {
  interface ProductDocument {
    id: string;
    title: string;
    price: number;
    tags: string[];
    categories: string[];
    labels: string[];
    legacyLabels: string[];
  }
  let body: unknown;
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.atomicUpdate<ProductDocument>({
    id: "one",
    title: { set: "Updated" },
    price: { inc: 2 },
    tags: { add: ["new", "sale"] },
    categories: { "add-distinct": "books" },
    labels: { remove: "legacy" },
    legacyLabels: { removeregex: "^legacy_" }
  });
  assert.deepEqual(body, [{
    id: "one",
    title: { set: "Updated" },
    price: { inc: 2 },
    tags: { add: ["new", "sale"] },
    categories: { "add-distinct": "books" },
    labels: { remove: "legacy" },
    legacyLabels: { removeregex: "^legacy_" }
  }]);
});

test("atomicUpdate validates modifier shapes and values before sending a request", () => {
  interface ProductDocument { id: string; title: string; price: number; tags: string[]; }
  const client = createSolrClient({ core: "catalog", fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(
    () => client.atomicUpdate<ProductDocument>({ id: "one", title: { set: "new", inc: 1 } } as never),
    /must contain exactly one supported modifier/
  );
  assert.throws(
    () => client.atomicUpdate<ProductDocument>({ id: "one", price: { inc: Number.NaN } } as never),
    /must be a finite number/
  );
  assert.throws(
    () => client.atomicUpdate<ProductDocument>({ id: "one", title: { removeregex: 42 } } as never),
    /must be a string or string array/
  );
  assert.throws(
    () => client.atomicUpdate<ProductDocument>({ id: "one" } as never),
    /must contain at least one field modifier/
  );
  assert.throws(
    () => client.atomicUpdate<ProductDocument>({ title: { set: "new" } } as never),
    /must contain exactly one plain unique-key field/
  );
});

test("commit, soft commit, optimize, and rollback serialize typed command bodies", async () => {
  const bodies: unknown[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.commit({ waitSearcher: false, softCommit: false, expungeDeletes: true });
  await client.softCommit();
  await client.optimize({ maxSegments: 2, waitSearcher: false });
  await client.optimize(3);
  await client.optimize();
  await client.rollback();

  assert.deepEqual(bodies, [
    { commit: { waitSearcher: false, softCommit: false, expungeDeletes: true } },
    { commit: { softCommit: true, waitSearcher: false } },
    { optimize: { maxSegments: 2, waitSearcher: false } },
    { optimize: { maxSegments: 3 } },
    { optimize: {} },
    { rollback: {} }
  ]);
});

test("update command options reject invalid values before sending a request", () => {
  const client = createSolrClient({ core: "catalog", fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(() => client.add({ id: "one" }, { commitWithin: -1 }), /commitWithin must be a non-negative integer/);
  assert.throws(() => client.add({ id: "one" }, { commitWithin: 1.5 }), /commitWithin must be a non-negative integer/);
  assert.throws(() => client.add({ id: "one" }, { route: "  " }), /route must be a non-empty string/);
  assert.throws(() => client.delete("one", { route: "" }), /route must be a non-empty string/);
  assert.throws(() => client.optimize({ maxSegments: 0 }), /maxSegments must be a positive integer/);
});

test("HTTP errors retain the Solr payload", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({ error: { msg: "bad request" } }), { status: 400 })
  });
  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    assert.equal(error.message, "bad request");
    return true;
  });
});
