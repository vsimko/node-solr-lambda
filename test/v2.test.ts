import { createSolrClient as createClient } from "../src/index.js";
import { test } from "node:test";
import assert from "node:assert/strict";

test("v2 namespace uses shared transport and leaves V1 routes unchanged", async () => {
  const requests: { url: URL; method: string; body?: string; authorization: string | null }[] = [];
  const client = createClient({
    baseUrl: "http://localhost:8983/solr",
    core: "catalog",
    auth: { type: "bearer", token: "test-token" },
    fetch: async (input, init) => {
      requests.push({
        url: new URL(String(input)),
        method: String(init?.method),
        ...(init?.body === undefined ? {} : { body: String(init.body) }),
        authorization: new Headers(init?.headers).get("authorization")
      });
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.v2.request("/api/cores", { method: "POST", query: { wt: "json" }, body: { create: { name: "books" } } });
  const raw = await client.v2.requestRaw("/api/cores", { method: "GET" });
  assert.equal(raw.status, 200);
  assert.deepEqual(await raw.json(), { responseHeader: { status: 0 } });
  await client.query({ query: "*:*" });

  assert.equal(requests[0]!.url.pathname, "/api/cores");
  assert.equal(requests[0]!.method, "POST");
  assert.equal(requests[0]!.url.searchParams.get("wt"), "json");
  assert.deepEqual(JSON.parse(requests[0]!.body!), { create: { name: "books" } });
  assert.equal(requests[0]!.authorization, "Bearer test-token");
  assert.equal(requests[1]!.url.pathname, "/api/cores");
  assert.equal(requests[2]!.url.pathname, "/solr/catalog/select");
});

test("v2 namespace rejects non-V2 paths and query strings in the path", () => {
  const client = createClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(() => client.v2.request("/solr/admin/cores" as `/api/${string}`), /relative \/api\//);
  assert.throws(() => client.v2.request("/api/cores?wt=json" as `/api/${string}`), /relative \/api\//);
});


test("v2 namespace rejects normalized and encoded path traversal", () => {
  const client = createClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  for (const path of [
    "/api/../admin/cores",
    "/api/%2e%2e/admin/cores",
    "/api/%2E%2E/admin/cores",
    "/api/%2fadmin/cores",
    "/api/%5cadmin/cores",
    "/api/%zz"
  ]) {
    assert.throws(
      () => client.v2.request(path as `/api/${string}`),
      /Solr V2 path/
    );
  }
});

test("V2 API resolves outside the standard Solr webapp context and preserves proxy prefixes", async () => {
  const paths: string[] = [];
  const fetch = async (input: RequestInfo | URL) => {
    paths.push(new URL(String(input)).pathname);
    return new Response(JSON.stringify({ ok: true }));
  };

  const standard = createClient({ baseUrl: "http://localhost:8983/solr", fetch });
  await standard.v2.request("/api/cores");
  const proxied = createClient({ baseUrl: "http://localhost:8983/gateway/solr", fetch });
  await proxied.v2.request("/api/cores");

  assert.deepEqual(paths, ["/api/cores", "/gateway/api/cores"]);
});
