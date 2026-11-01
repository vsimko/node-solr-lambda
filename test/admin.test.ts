import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient } from "../src/index.js";

test("Core Admin uses the global endpoint", async () => {
  let target = "";
  const client = createSolrClient({
    fetch: async (input) => {
      target = String(input);
      return new Response(JSON.stringify({ status: { catalog: { name: "catalog" } } }));
    }
  });
  await client.coreAdmin("STATUS", { core: "catalog" });
  const url = new URL(target);
  assert.equal(url.pathname, "/solr/admin/cores");
  assert.equal(url.searchParams.get("action"), "STATUS");
  assert.equal(url.searchParams.get("core"), "catalog");
});

test("Collections Admin uses the global endpoint", async () => {
  let target = "";
  const client = createSolrClient({
    fetch: async (input) => {
      target = String(input);
      return new Response(JSON.stringify({ success: true }));
    }
  });
  await client.collections("LIST");
  const url = new URL(target);
  assert.equal(url.pathname, "/solr/admin/collections");
  assert.equal(url.searchParams.get("action"), "LIST");
});

test("export returns a raw response stream", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response("id,title\n1,Example", { headers: { "content-type": "text/csv" } })
  });
  const response = await client.export({ fl: "id,title", sort: "id asc" });
  assert.equal(response.headers.get("content-type"), "text/csv");
  assert.equal(await response.text(), "id,title\n1,Example");
});
