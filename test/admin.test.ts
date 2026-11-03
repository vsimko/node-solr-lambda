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
    type: "nrt",
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
  assert.equal(add.searchParams.get("type"), "nrt");
  assert.equal(add.searchParams.get("waitForFinalState"), "true");
  assert.equal(add.searchParams.get("property.zone"), "hot");

  const remove = new URL(requested[1]!);
  assert.equal(remove.searchParams.get("action"), "DELETEREPLICA");
  assert.equal(remove.searchParams.get("replica"), "core_node2");
  assert.equal(remove.searchParams.get("deleteDataDir"), "true");
});

test("Collections replica move and property actions are serialized", async () => {
  const requested: string[] = [];
  const client = createSolrClient({
    fetch: async (input) => {
      requested.push(String(input));
      return new Response(JSON.stringify({ success: true }));
    }
  });

  await client.collections("MOVEREPLICA", {
    collection: "books",
    replica: "core_node2",
    targetNode: "solr-node-2:8983_solr",
    timeout: 120
  });
  await client.collections("BALANCESHARDUNIQUE", {
    collection: "books",
    property: "preferredLeader",
    onlyactivenodes: true
  });
  await client.collections("REBALANCELEADERS", {
    collection: "books",
    maxAtOnce: 2,
    maxWaitSeconds: 30
  });
  await client.collections("ADDREPLICAPROP", {
    collection: "books",
    shard: "shard1",
    replica: "core_node2",
    property: "preferredLeader",
    "property.value": "true"
  });
  await client.collections("DELETEREPLICAPROP", {
    collection: "books",
    shard: "shard1",
    replica: "core_node2",
    property: "preferredLeader"
  });

  const move = new URL(requested[0]!);
  assert.equal(move.searchParams.get("action"), "MOVEREPLICA");
  assert.equal(move.searchParams.get("targetNode"), "solr-node-2:8983_solr");
  assert.equal(move.searchParams.get("timeout"), "120");

  const balance = new URL(requested[1]!);
  assert.equal(balance.searchParams.get("action"), "BALANCESHARDUNIQUE");
  assert.equal(balance.searchParams.get("property"), "preferredLeader");

  const rebalance = new URL(requested[2]!);
  assert.equal(rebalance.searchParams.get("action"), "REBALANCELEADERS");
  assert.equal(rebalance.searchParams.get("maxAtOnce"), "2");
  assert.equal(rebalance.searchParams.get("maxWaitSeconds"), "30");

  const addProperty = new URL(requested[3]!);
  assert.equal(addProperty.searchParams.get("action"), "ADDREPLICAPROP");
  assert.equal(addProperty.searchParams.get("property.value"), "true");

  const deleteProperty = new URL(requested[4]!);
  assert.equal(deleteProperty.searchParams.get("action"), "DELETEREPLICAPROP");
  assert.equal(deleteProperty.searchParams.get("replica"), "core_node2");
});


test("typed administrative list parameters and custom params are serialized", async () => {
  const requested: string[] = [];
  const client = createSolrClient({
    fetch: async (input) => {
      requested.push(String(input));
      return new Response(JSON.stringify({ success: true }));
    }
  });

  await client.collections("CREATE", {
    name: "books",
    shards: "shard1,shard2",
    "router.name": "implicit",
    "collection.configName": "_default",
    rule: ["replica:<2", "freedisk:>10"]
  });
  await client.collections("CREATEALIAS", {
    name: "books-current",
    collections: ["books-v1", "books-v2"]
  });
  await client.coreAdmin("STATUS", {
    core: "books",
    customParams: { indexInfo: true, wt: "json" }
  });

  const create = new URL(requested[0]!);
  assert.equal(create.searchParams.get("action"), "CREATE");
  assert.equal(create.searchParams.get("router.name"), "implicit");
  assert.equal(create.searchParams.get("collection.configName"), "_default");
  assert.equal(create.searchParams.get("rule"), "replica:<2,freedisk:>10");

  const alias = new URL(requested[1]!);
  assert.equal(alias.searchParams.get("collections"), "books-v1,books-v2");

  const status = new URL(requested[2]!);
  assert.equal(status.searchParams.get("action"), "STATUS");
  assert.equal(status.searchParams.get("indexInfo"), "true");
  assert.equal(status.searchParams.get("wt"), "json");
});

test("Core Admin STATUS accepts minimal and detailed response payloads", async () => {
  const payloads = [
    { status: { catalog: { name: "catalog" } } },
    {
      responseHeader: { status: 0, QTime: 2 },
      initFailures: {},
      status: {
        catalog: {
          name: "catalog",
          instanceDir: "/var/solr/data/catalog",
          dataDir: "/var/solr/data/catalog/data",
          config: "solrconfig.xml",
          schema: "managed-schema",
          startTime: "2026-11-03T05:00:00Z",
          uptime: 120_000,
          index: { numDocs: 12, maxDoc: 14, deletedDocs: 2, numSegments: 3, sizeInBytes: 4096, size: "4 KB" },
          futureServerField: { enabled: true }
        }
      }
    }
  ];
  for (const payload of payloads) {
    const client = createSolrClient({
      fetch: async () => new Response(JSON.stringify(payload))
    });
    const result = await client.coreAdmin<import("../src/index.js").CoreAdminStatusResponse>(
      "STATUS",
      { core: "catalog", indexInfo: true }
    );
    assert.equal(result.status?.catalog?.name, "catalog");
  }
  const client = createSolrClient({
    fetch: async () => new Response(JSON.stringify(payloads[1]))
  });
  const detailed = await client.coreAdmin<import("../src/index.js").CoreAdminStatusResponse>(
    "STATUS",
    { core: "catalog", indexInfo: true }
  );
  assert.equal(detailed.status?.catalog?.index?.numDocs, 12);
  assert.deepEqual(detailed.status?.catalog?.futureServerField, { enabled: true });
});


test("System API diagnostics use their global endpoints", async () => {
  const requested: string[] = [];
  const responses = [
    { mode: "standalone", lucene: { "solr-spec-version": "10.1.0" } },
    { system: { "java.version": "21", "os.name": "Linux" } },
    { threadDump: "solr-thread-1 RUNNABLE" },
    { levels: ["INFO", "WARN"], loggers: { "org.apache.solr": { level: "INFO" } } }
  ];
  const client = createSolrClient({
    fetch: async input => {
      requested.push(String(input));
      return new Response(JSON.stringify(responses[requested.length - 1]));
    }
  });
  const info = await client.systemInfo();
  const properties = await client.systemProperties();
  const threads = await client.systemThreads();
  const logging = await client.systemLogging();
  assert.equal(info.mode, "standalone");
  assert.equal(properties.system?.["java.version"], "21");
  assert.match(threads.threadDump ?? "", /RUNNABLE/);
  assert.ok(logging.loggers?.["org.apache.solr"]);
  assert.deepEqual(requested.map(value => new URL(value).pathname), [
    "/solr/admin/info/system",
    "/solr/admin/info/properties",
    "/solr/admin/info/threads",
    "/solr/admin/info/logging"
  ]);
});
