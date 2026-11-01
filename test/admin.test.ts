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

test("Collections replica lifecycle parameters are serialized", async () => {
  const requested: string[] = [];
  const client = createSolrClient({
    fetch: async (input) => {
      requested.push(String(input));
      return new Response(JSON.stringify({ success: true }));
    }
  });

  await client.collections("ADDREPLICA", {
    collection: "books",
    shard: "shard1",
    type: "NRT",
    node: "node1",
    waitForFinalState: true,
    customParams: { "property.zone": "hot" }
  });
  await client.collections("DELETEREPLICA", {
    collection: "books",
    shard: "shard1",
    replica: "core_node2",
    deleteInstanceDir: false,
    deleteDataDir: true,
    deleteIndex: true
  });

  const add = new URL(requested[0]!);
  assert.equal(add.searchParams.get("action"), "ADDREPLICA");
  assert.equal(add.searchParams.get("collection"), "books");
  assert.equal(add.searchParams.get("type"), "NRT");
  assert.equal(add.searchParams.get("waitForFinalState"), "true");
  assert.equal(add.searchParams.get("property.zone"), "hot");

  const remove = new URL(requested[1]!);
  assert.equal(remove.searchParams.get("action"), "DELETEREPLICA");
  assert.equal(remove.searchParams.get("replica"), "core_node2");
  assert.equal(remove.searchParams.get("deleteDataDir"), "true");
});
