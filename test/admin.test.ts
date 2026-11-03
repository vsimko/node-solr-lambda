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

test("Core Admin async status and recovery actions serialize their required parameters", async () => {
  const requested: string[] = [];
  const client = createSolrClient({
    fetch: async (input) => {
      requested.push(String(input));
      return new Response(JSON.stringify({ status: "completed" }));
    }
  });

  await client.coreAdmin("REQUESTSTATUS", { requestid: "core-job-42" });
  await client.coreAdmin("REQUESTRECOVERY", { core: "catalog_shard1_replica1" });

  const requestStatus = new URL(requested[0]!);
  assert.equal(requestStatus.pathname, "/solr/admin/cores");
  assert.equal(requestStatus.searchParams.get("action"), "REQUESTSTATUS");
  assert.equal(requestStatus.searchParams.get("requestid"), "core-job-42");

  const recovery = new URL(requested[1]!);
  assert.equal(recovery.pathname, "/solr/admin/cores");
  assert.equal(recovery.searchParams.get("action"), "REQUESTRECOVERY");
  assert.equal(recovery.searchParams.get("core"), "catalog_shard1_replica1");
});


test("Metrics API serializes typed registry filters and custom parameters", async () => {
  let requested = "";
  const client = createSolrClient({
    fetch: async input => {
      requested = String(input);
      return new Response(JSON.stringify({
        metrics: {
          "solr.core.catalog": {
            "QUERY./select.requests": 12,
            "QUERY./select.errors": 1,
            "QUERY./select.requestTimes.meanRate": 2.5
          }
        }
      }));
    }
  });
  const result = await client.metrics({
    group: ["jvm", "node"],
    registry: "solr.core.catalog",
    prefix: "QUERY",
    regex: ".*requests.*",
    customParams: { wt: "json" }
  });
  assert.equal(typeof result, "object");
  if (typeof result === "object" && result !== null) {
    assert.equal(result.metrics?.["solr.core.catalog"]?.["QUERY./select.requests"], 12);
  }
  const url = new URL(requested);
  assert.equal(url.pathname, "/solr/admin/metrics");
  assert.deepEqual(url.searchParams.getAll("group"), ["jvm", "node"]);
  assert.equal(url.searchParams.get("registry"), "solr.core.catalog");
  assert.equal(url.searchParams.get("prefix"), "QUERY");
  assert.equal(url.searchParams.get("regex"), ".*requests.*");
  assert.equal(url.searchParams.get("wt"), "json");
});

test("Metrics API accepts Prometheus exposition text", async () => {
  const client = createSolrClient({
    fetch: async () => new Response("# HELP jvm_memory_bytes JVM memory\\njvm_memory_bytes 1024\\n")
  });
  const result = await client.metrics();
  assert.equal(typeof result, "string");
  if (typeof result === "string") assert.match(result, /jvm_memory_bytes 1024/);
});


test("System API diagnostics use their global endpoints", async () => {
  const requested: string[] = [];
  const responses = [
    { mode: "standalone", lucene: { "solr-spec-version": "10.1.0" } },
    { properties: { "java.version": "21", "os.name": "Linux" } },
    { system: { threadDump: ["thread", { id: 1, name: "solr-thread-1", state: "RUNNABLE" }] } },
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
  assert.equal(properties.properties?.["java.version"], "21");
  assert.ok(threads.system?.threadDump?.length);
  assert.ok(logging.loggers?.["org.apache.solr"]);
  assert.deepEqual(requested.map(value => new URL(value).pathname), [
    "/solr/admin/info/system",
    "/solr/admin/info/properties",
    "/solr/admin/info/threads",
    "/solr/admin/info/logging"
  ]);
});

test("Authorization API serializes typed built-in permission and user-role commands", async () => {
  const requested: Array<{ url: string; method: string | undefined; body: unknown }> = [];
  const client = createSolrClient({ fetch: async (input, init) => {
    requested.push({ url: String(input), method: init?.method, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    return new Response(JSON.stringify({ authorization: { class: "solr.RuleBasedAuthorizationPlugin", "user-role": { alice: ["admin", "dev"] }, permissions: [{ name: "read", role: ["admin", "dev"] }] } }));
  } });
  const response = await client.security("authorization");
  assert.equal(response.authorization?.class, "solr.RuleBasedAuthorizationPlugin");
  assert.deepEqual(response.authorization?.["user-role"]?.alice, ["admin", "dev"]);
  await client.security("authorization", { "set-user-role": { alice: ["admin", "dev"], guest: null } });
  await client.security("authorization", { "set-permission": { name: "catalog-read", collection: "catalog", path: ["/select", "/query"], method: ["GET", "POST"], params: { wt: ["json", "xml"], rows: 10 }, role: ["admin", "reader"], customPluginOption: { enabled: true } } });
  await client.security("authorization", { "update-permission": { index: 2, role: "admin", path: "/update" } });
  await client.security("authorization", { "delete-permission": 3 });
  assert.deepEqual(requested.map(item => new URL(item.url).pathname), Array(5).fill("/solr/admin/authorization"));
  assert.deepEqual(requested.slice(1).map(item => item.method), ["POST", "POST", "POST", "POST"]);
  assert.deepEqual(requested.slice(1).map(item => item.body), [
    { "set-user-role": { alice: ["admin", "dev"], guest: null } },
    { "set-permission": { name: "catalog-read", collection: "catalog", path: ["/select", "/query"], method: ["GET", "POST"], params: { wt: ["json", "xml"], rows: 10 }, role: ["admin", "reader"], customPluginOption: { enabled: true } } },
    { "update-permission": { index: 2, role: "admin", path: "/update" } },
    { "delete-permission": 3 }
  ]);
});

test("Collections alias and cluster status operations use typed default response models", async () => {
  const responses = [
    { aliases: { "books-current": "books-v2" } },
    { responseHeader: { status: 0, QTime: 1 } },
    { responseHeader: { status: 0, QTime: 2 } },
    { cluster: { live_nodes: ["solr-0:8983_solr"], aliases: { "books-current": "books-v2" }, collections: { "books-v2": { replicationFactor: 1, shards: { shard1: { state: "active", replicas: { core_node1: { core: "books-v2_shard1_replica_n1", node_name: "solr-0:8983_solr", state: "active", leader: true, type: "NRT", properties: { preferredLeader: "true" } } } } } } } } }
  ];
  let index = 0;
  const client = createSolrClient({ fetch: async () => new Response(JSON.stringify(responses[index++])) });
  const aliases = await client.collections("LISTALIASES");
  assert.equal(aliases.aliases?.["books-current"], "books-v2");
  const created = await client.collections("CREATEALIAS", { name: "books-current", collections: ["books-v1", "books-v2"] });
  assert.equal(created.responseHeader?.status, 0);
  const deleted = await client.collections("DELETEALIAS", { name: "books-current" });
  assert.equal(deleted.responseHeader?.status, 0);
  const status = await client.collections("CLUSTERSTATUS", { collection: "books-v2" });
  assert.ok(status.cluster?.live_nodes?.includes("solr-0:8983_solr"));
  assert.equal(status.cluster?.collections?.["books-v2"]?.shards?.shard1?.replicas?.core_node1?.leader, true);
  assert.equal(status.cluster?.aliases?.["books-current"], "books-v2");
});
