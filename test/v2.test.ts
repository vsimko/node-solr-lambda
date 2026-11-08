import { createSolrClient as createClient } from "../src/index.js";
import { test } from "node:test";
import assert from "node:assert/strict";

test("v2 namespace uses shared transport and leaves V1 routes unchanged", async () => {
  const requests: { url: URL; method: string; body?: string; authorization: string | null }[] = [];
  const client = createClient({
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

  await client.v2.request("/api/cores", { method: "POST", body: { create: { name: "books" } } });
  await client.query({ query: "*:*" });

  assert.equal(requests[0]!.url.pathname, "/solr/api/cores");
  assert.equal(requests[0]!.method, "POST");
  assert.deepEqual(JSON.parse(requests[0]!.body!), { create: { name: "books" } });
  assert.equal(requests[0]!.authorization, "Bearer test-token");
  assert.equal(requests[1]!.url.pathname, "/solr/catalog/select");
});

test("v2 namespace rejects non-V2 paths and query strings in the path", () => {
  const client = createClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  assert.throws(() => client.v2.request("/solr/admin/cores" as `/api/${string}`), /relative \/api\//);
  assert.throws(() => client.v2.request("/api/cores?wt=json" as `/api/${string}`), /relative \/api\//);
});

