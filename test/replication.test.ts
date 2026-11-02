import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient } from "../src/index.js";

test("ReplicationHandler commands use the configured core and JSON response format", async () => {
  const calls: Array<{ url: URL; method: string }> = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      calls.push({ url: new URL(String(input)), method: init?.method ?? "GET" });
      return new Response(JSON.stringify({ responseHeader: { status: 0 }, indexversion: 42 }));
    }
  });

  await client.replication("indexversion");
  await client.replication("fetchindex", {
    leaderUrl: "http://leader:8983/solr/catalog/replication",
    compression: "internal",
    httpConnTimeout: 5000,
    customParams: { maxWriteMBPerSec: 20 }
  });
  await client.replication("filelist", { generation: 42 });

  assert.equal(calls[0]!.url.pathname, "/solr/catalog/replication");
  assert.equal(calls[0]!.url.searchParams.get("command"), "indexversion");
  assert.equal(calls[0]!.url.searchParams.get("wt"), "json");
  assert.equal(calls[1]!.url.searchParams.get("command"), "fetchindex");
  assert.equal(calls[1]!.url.searchParams.get("leaderUrl"), "http://leader:8983/solr/catalog/replication");
  assert.equal(calls[1]!.url.searchParams.get("compression"), "internal");
  assert.equal(calls[1]!.url.searchParams.get("httpConnTimeout"), "5000");
  assert.equal(calls[1]!.url.searchParams.get("maxWriteMBPerSec"), "20");
  assert.equal(calls[2]!.url.searchParams.get("generation"), "42");
  assert.equal(calls[2]!.url.searchParams.get("indexversion"), "42");
  assert.equal(calls[2]!.url.searchParams.get("wt"), "json");
});

test("ReplicationHandler supports read, poll, and replication lifecycle commands", async () => {
  const commands: string[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async input => {
      commands.push(new URL(String(input)).searchParams.get("command") ?? "");
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.replication("details");
  await client.replication("enablereplication");
  await client.replication("disablereplication");
  await client.replication("enablepoll");
  await client.replication("disablepoll");
  await client.replication("abortfetch");

  assert.deepEqual(commands, [
    "details",
    "enablereplication",
    "disablereplication",
    "enablepoll",
    "disablepoll",
    "abortfetch"
  ]);
});

test("ReplicationHandler file content uses a raw streamed response", async () => {
  let target = "";
  let accept = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      target = String(input);
      accept = new Headers(init?.headers).get("accept") ?? "";
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "application/octet-stream" } });
    }
  });

  const response = await client.replicationFile({
    directoryType: "file",
    filePath: "segments_1",
    offset: 10,
    length: 3,
    generation: 42,
    checksum: true
  });
  const url = new URL(target);
  assert.equal(url.pathname, "/solr/catalog/replication");
  assert.equal(url.searchParams.get("command"), "filecontent");
  assert.equal(url.searchParams.get("file"), "segments_1");
  assert.equal(url.searchParams.get("wt"), "filestream");
  assert.equal(url.searchParams.get("offset"), "10");
  assert.equal(url.searchParams.get("length"), "3");
  assert.equal(url.searchParams.get("generation"), "42");
  assert.equal(url.searchParams.get("checksum"), "true");
  assert.equal(accept, "*/*");
  assert.equal((await response.arrayBuffer()).byteLength, 3);
});

test("ReplicationHandler file content validates local file parameters", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response("ok")
  });
  await assert.rejects(
    client.replicationFile({ directoryType: "file", filePath: " ", offset: 0 }),
    /filePath must be a non-empty string/
  );
  await assert.rejects(
    client.replicationFile({ directoryType: "cf", filePath: "schema.xml", offset: -1 }),
    /offset must be a non-negative integer/
  );
  await assert.rejects(
    client.replicationFile({ directoryType: "file", filePath: "segments_1", length: 0 }),
    /length must be a positive integer/
  );
});
