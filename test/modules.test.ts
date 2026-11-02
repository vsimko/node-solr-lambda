import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError } from "../src/index.js";

test("JSON query delegates to the query module", async () => {
  let url = "";
  let body = "";
  const client = createSolrClient({
    collection: "catalog",
    fetch: async (input, init) => {
      url = String(input);
      body = String(init?.body);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });
  await client.queryJson({ query: "title:solr", limit: 3 });
  assert.equal(new URL(url).pathname, "/solr/catalog/query");
  assert.equal(JSON.parse(body).query, "title:solr");
  assert.equal(JSON.parse(body).limit, 3);
});

test("delete delegates a Solr delete command to the update module", async () => {
  let url = "";
  let body = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      url = String(input);
      body = String(init?.body);
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.delete({ query: "status:expired" });
  assert.equal(new URL(url).pathname, "/solr/catalog/update");
  assert.deepEqual(JSON.parse(body), { delete: { query: "status:expired" } });
});

test("Schema and Config modules use their own collection endpoints", async () => {
  const paths: string[] = [];
  const client = createSolrClient({
    collection: "catalog",
    fetch: async input => {
      paths.push(new URL(String(input)).pathname);
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.schema({ "add-field": { name: "title", type: "string" } });
  await client.config({ "set-property": { "query.maxBooleanClauses": 2048 } });
  assert.deepEqual(paths, ["/solr/catalog/schema", "/solr/catalog/config"]);
});

test("Schema API returns the typed command envelope", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({
      responseHeader: { status: 0, QTime: 3 }
    }), { status: 200, headers: { "content-type": "application/json" } })
  });

  const result = await client.schema({ "add-field": { name: "sku", type: "string" } });
  assert.equal(result.responseHeader?.status, 0);
  assert.equal(result.responseHeader?.QTime, 3);
});

test("Schema API preserves Solr HTTP failures", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({
      error: { code: 400, msg: "Field already exists" }
    }), { status: 400, headers: { "content-type": "application/json" } })
  });

  await assert.rejects(
    client.schema({ "add-field": { name: "sku", type: "string" } }),
    error => error instanceof SolrHttpError && error.status === 400
  );
});

test("System, Metrics, and Security modules share the transport", async () => {
  const calls: Array<{ path: string; method: string; query: string | null }> = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      const url = new URL(String(input));
      calls.push({ path: url.pathname, method: init?.method ?? "GET", query: url.searchParams.get("group") });
      return new Response(JSON.stringify({ ok: true }));
    }
  });
  await client.systemInfo();
  await client.metrics({ group: "jvm" });
  await client.security("authentication");
  await client.security("authorization", { "set-user": { name: "reader" } });
  assert.deepEqual(calls, [
    { path: "/solr/admin/info/system", method: "GET", query: null },
    { path: "/solr/admin/metrics", method: "GET", query: "jvm" },
    { path: "/solr/admin/authentication", method: "GET", query: null },
    { path: "/solr/admin/authorization", method: "POST", query: null }
  ]);
});

test("Streaming Expressions delegate to the advanced API module", async () => {
  let url = "";
  const client = createSolrClient({
    collection: "catalog",
    fetch: async input => {
      url = String(input);
      return new Response(JSON.stringify({ "result-set": { docs: [] } }));
    }
  });
  await client.stream("search(catalog, q=*:*)");
  const parsed = new URL(url);
  assert.equal(parsed.pathname, "/solr/catalog/stream");
  assert.equal(parsed.searchParams.get("expr"), "search(catalog, q=*:*)");
  assert.equal(parsed.searchParams.get("wt"), "json");
});
