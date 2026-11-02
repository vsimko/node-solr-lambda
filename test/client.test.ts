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

test("add sends a single document to the JSON docs convenience path", async () => {
  let requestedUrl = "";
  let body: unknown;
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requestedUrl = String(input);
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.add({ id: "one" });
  assert.equal(new URL(requestedUrl).pathname, "/solr/catalog/update/json/docs");
  assert.deepEqual(body, { id: "one" });
});

test("add sends a document array to the standard update path", async () => {
  let requestedUrl = "";
  let body: unknown;
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requestedUrl = String(input);
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.add([{ id: "one" }, { id: "two" }]);
  assert.equal(new URL(requestedUrl).pathname, "/solr/catalog/update");
  assert.deepEqual(body, [{ id: "one" }, { id: "two" }]);
});

test("updateCommands sends a typed command object to the JSON update path", async () => {
  let requestedUrl = "";
  let body: unknown;
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requestedUrl = String(input);
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.updateCommands({
    add: { doc: { id: "one", title: "One" }, overwrite: false, commitWithin: 5000 },
    delete: { query: "status:expired" },
    commit: { waitSearcher: false, openSearcher: false },
    optimize: { waitSearcher: false, openSearcher: false },
    rollback: {}
  }, { route: "tenant-a" });

  assert.equal(new URL(requestedUrl).pathname, "/solr/catalog/update/json");
  assert.equal(new URL(requestedUrl).searchParams.get("_route_"), "tenant-a");
  assert.equal(new URL(requestedUrl).searchParams.get("openSearcher"), "false");
  assert.deepEqual(body, {
    add: { doc: { id: "one", title: "One" }, overwrite: false, commitWithin: 5000 },
    delete: { query: "status:expired" },
    commit: { waitSearcher: false },
    optimize: { waitSearcher: false },
    rollback: {}
  });
});

test("updateCommands rejects empty, unknown, and malformed commands", () => {
  const client = createSolrClient({ core: "catalog", fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(() => client.updateCommands({} as never), /must contain at least one command/);
  assert.throws(() => client.updateCommands({ unknown: {} } as never), /Unsupported JSON update command/);
  assert.throws(() => client.updateCommands({ add: { doc: [] } } as never), /requires a document object/);
  assert.throws(() => client.updateCommands({ delete: { id: "one", query: "*:*" } } as never), /must contain an ID, ID list, or query/);
  assert.throws(() => client.updateCommands({ add: { doc: { id: "one" }, commitWithin: -1 } }), /commitWithin must be a non-negative integer/);
  assert.throws(
    () => client.updateCommands({ commit: { openSearcher: true }, optimize: { openSearcher: false } }),
    /must use the same openSearcher value/
  );
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

  assert.deepEqual(requests[0]!.body, { id: "one" });
  assert.equal(requests[0]!.url.pathname, "/solr/catalog/update/json/docs");
  assert.equal(requests[0]!.url.searchParams.get("overwrite"), "false");
  assert.equal(requests[0]!.url.searchParams.get("commitWithin"), "5000");
  assert.equal(requests[0]!.url.searchParams.get("_route_"), "tenant-a");
  assert.deepEqual(requests[1]!.body, { id: "two" });
  assert.equal(requests[1]!.url.pathname, "/solr/catalog/update/json/docs");
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

test("commit, soft commit, optimize, and rollback serialize typed command bodies and searcher params", async () => {
  const requests: Array<{ url: URL; body: unknown }> = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.commit({ waitSearcher: false, softCommit: false, expungeDeletes: true, openSearcher: false });
  await client.commit();
  await client.softCommit();
  await client.softCommit({ waitSearcher: false, openSearcher: false });
  await client.optimize({ maxSegments: 2, waitSearcher: false, openSearcher: false });
  await client.optimize(3);
  await client.optimize();
  await client.rollback();

  assert.deepEqual(requests.map(request => request.body), [
    { commit: { waitSearcher: false, softCommit: false, expungeDeletes: true } },
    { commit: {} },
    { commit: { softCommit: true, waitSearcher: true } },
    { commit: { softCommit: true, waitSearcher: false } },
    { optimize: { maxSegments: 2, waitSearcher: false } },
    { optimize: { maxSegments: 3 } },
    { optimize: {} },
    { rollback: {} }
  ]);
  assert.equal(requests[0]!.url.searchParams.get("openSearcher"), "false");
  assert.equal(requests[1]!.url.searchParams.has("openSearcher"), false);
  assert.equal(requests[3]!.url.searchParams.get("openSearcher"), "false");
  assert.equal(requests[4]!.url.searchParams.get("openSearcher"), "false");
});

test("update command options reject invalid values before sending a request", () => {
  const client = createSolrClient({ core: "catalog", fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(() => client.add({ id: "one" }, { commitWithin: -1 }), /commitWithin must be a non-negative integer/);
  assert.throws(() => client.add({ id: "one" }, { commitWithin: 1.5 }), /commitWithin must be a non-negative integer/);
  assert.throws(() => client.add({ id: "one" }, { route: "  " }), /route must be a non-empty string/);
  assert.throws(() => client.delete("one", { route: "" }), /route must be a non-empty string/);
  assert.throws(() => client.optimize({ maxSegments: 0 }), /maxSegments must be a positive integer/);
  assert.throws(() => client.commit({ softCommit: true, expungeDeletes: true }), /expungeDeletes is not supported on a soft commit/);
  assert.throws(() => client.commit({ maxSegments: 1 } as never), /maxSegments is optimize-only/);
});

test("requestRaw sends raw string bodies unchanged with caller content type", async () => {
  let requestBody: BodyInit | null | undefined;
  let contentType: string | null = null;
  const client = createSolrClient({
    baseUrl: "http://localhost:8983",
    fetch: async (_input, init) => {
      requestBody = init?.body;
      contentType = new Headers(init?.headers).get("content-type");
      return new Response("accepted");
    }
  });
  const xml = "<add><doc><field name=\"id\">one</field></doc></add>";

  const response = await client.requestRaw("/solr/catalog/update", {
    method: "POST",
    body: xml,
    headers: { "content-type": "text/xml" }
  });

  assert.equal(requestBody, xml);
  assert.equal(contentType, "text/xml");
  assert.equal(await response.text(), "accepted");
});

test("requestRaw continues to JSON serialize object bodies", async () => {
  let requestBody: BodyInit | null | undefined;
  let contentType: string | null = null;
  const client = createSolrClient({
    baseUrl: "http://localhost:8983",
    fetch: async (_input, init) => {
      requestBody = init?.body;
      contentType = new Headers(init?.headers).get("content-type");
      return new Response("accepted");
    }
  });

  await client.requestRaw("/solr/catalog/update", { method: "POST", body: { add: { doc: { id: "one" } } } });
  assert.equal(requestBody, JSON.stringify({ add: { doc: { id: "one" } } }));
  assert.equal(contentType, "application/json");
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
