import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError } from "../src/index.js";

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

test("Collections RELOAD, MODIFYCOLLECTION, and role actions serialize action-specific parameters", async () => {
  const requested: string[] = [];
  const client = createSolrClient({
    fetch: async input => {
      requested.push(String(input));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.collections("RELOAD", { name: "books" });
  await client.collections("MODIFYCOLLECTION", {
    collection: "books",
    replicationFactor: 2,
    autoAddReplicas: true,
    maxShardsPerNode: 4,
    rule: ["replica:<2"],
    snitch: ["class:example.ZoneSnitch"]
  });
  await client.collections("ADDROLE", { node: "solr-node-1:8983_solr", role: "overseer" });
  await client.collections("REMOVEROLE", { node: "solr-node-1:8983_solr", role: "overseer" });

  const reload = new URL(requested[0]!);
  assert.equal(reload.searchParams.get("action"), "RELOAD");
  assert.equal(reload.searchParams.get("name"), "books");

  const modify = new URL(requested[1]!);
  assert.equal(modify.searchParams.get("action"), "MODIFYCOLLECTION");
  assert.equal(modify.searchParams.get("collection"), "books");
  assert.equal(modify.searchParams.get("replicationFactor"), "2");
  assert.equal(modify.searchParams.get("autoAddReplicas"), "true");
  assert.equal(modify.searchParams.get("maxShardsPerNode"), "4");
  assert.equal(modify.searchParams.get("rule"), "replica:<2");
  assert.equal(modify.searchParams.get("snitch"), "class:example.ZoneSnitch");

  for (const [index, action] of [[2, "ADDROLE"], [3, "REMOVEROLE"]] as const) {
    const url = new URL(requested[index]!);
    assert.equal(url.searchParams.get("action"), action);
    assert.equal(url.searchParams.get("node"), "solr-node-1:8983_solr");
    assert.equal(url.searchParams.get("role"), "overseer");
  }
});

test("Collections action responses retain their named default envelopes", async () => {
  const payloads = [
    { responseHeader: { status: 0, QTime: 1 }, collections: ["books", "catalog"] },
    { responseHeader: { status: 0, QTime: 2 } },
    { responseHeader: { status: 0, QTime: 3 }, success: { "10.0.0.1:8983_solr": "core_node2" } },
    { responseHeader: { status: 0, QTime: 4 } }
  ];
  let index = 0;
  const client = createSolrClient({
    fetch: async () => new Response(JSON.stringify(payloads[index++]))
  });

  const listed = await client.collections("LIST");
  assert.deepEqual(listed.collections, ["books", "catalog"]);
  assert.equal(listed.responseHeader?.status, 0);

  const created = await client.collections("CREATE", { name: "books" });
  assert.equal(created.responseHeader?.status, 0);

  const replica = await client.collections("ADDREPLICA", { collection: "books", shard: "shard1", type: "nrt" });
  assert.deepEqual(replica.success, { "10.0.0.1:8983_solr": "core_node2" });

  const role = await client.collections("ADDROLE", { node: "solr-node-1:8983_solr", role: "overseer" });
  assert.equal(role.responseHeader?.status, 0);
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
    nrtReplicas: 2,
    tlogReplicas: 1,
    pullReplicas: 1,
    createNodeSet: "node1,node2",
    "createNodeSet.shuffle": false,
    perReplicaState: true,
    alias: "books-current",
    rule: ["replica:<2", "freedisk:>10"],
    snitch: ["class:example.ZoneSnitch"],
    policy: "legacy-policy",
    withCollection: "books-metadata",
    customParams: { "property.dataDir": "/var/solr/books" }
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
  assert.equal(create.searchParams.get("nrtReplicas"), "2");
  assert.equal(create.searchParams.get("tlogReplicas"), "1");
  assert.equal(create.searchParams.get("pullReplicas"), "1");
  assert.equal(create.searchParams.get("createNodeSet"), "node1,node2");
  assert.equal(create.searchParams.get("createNodeSet.shuffle"), "false");
  assert.equal(create.searchParams.get("perReplicaState"), "true");
  assert.equal(create.searchParams.get("alias"), "books-current");
  assert.equal(create.searchParams.get("rule"), "replica:<2,freedisk:>10");
  assert.equal(create.searchParams.get("snitch"), "class:example.ZoneSnitch");
  assert.equal(create.searchParams.get("policy"), "legacy-policy");
  assert.equal(create.searchParams.get("withCollection"), "books-metadata");
  assert.equal(create.searchParams.get("property.dataDir"), "/var/solr/books");

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

test("Authentication API serializes typed BasicAuth user and property commands", async () => {
  const requested: Array<{ url: string; method: string | undefined; body: unknown }> = [];
  const client = createSolrClient({ fetch: async (input, init) => {
    requested.push({ url: String(input), method: init?.method, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    return new Response(JSON.stringify({ authentication: { class: "solr.BasicAuthPlugin", blockUnknown: true, realm: "Solr", credentials: { admin: "salted-hash" } } }));
  } });
  const response = await client.security("authentication");
  assert.equal(response.authentication?.class, "solr.BasicAuthPlugin");
  assert.equal(response.authentication?.blockUnknown, true);
  assert.equal(response.authentication?.credentials?.admin, "salted-hash");
  await client.security("authentication", { "set-user": { alice: "secret-password", bob: "another-secret" } });
  await client.security("authentication", { "delete-user": ["alice", "bob"] });
  await client.security("authentication", { "set-property": { blockUnknown: true, realm: "Internal Solr", forwardCredentials: false } });
  await client.security("authentication", { "set-user": { basic: { alice: "secret-password" } } });
  await client.security("authentication", { "set-property": { basic: { realm: "Basic realm" } } });
  assert.deepEqual(requested.map(item => new URL(item.url).pathname), Array(6).fill("/solr/admin/authentication"));
  assert.deepEqual(requested.slice(1).map(item => item.method), Array(5).fill("POST"));
  assert.deepEqual(requested.slice(1).map(item => item.body), [
    { "set-user": { alice: "secret-password", bob: "another-secret" } },
    { "delete-user": ["alice", "bob"] },
    { "set-property": { blockUnknown: true, realm: "Internal Solr", forwardCredentials: false } },
    { "set-user": { basic: { alice: "secret-password" } } },
    { "set-property": { basic: { realm: "Basic realm" } } }
  ]);
});

test("Authentication command passwords are not copied into client-generated HTTP error metadata", async () => {
  const password = "do-not-expose-this-password";
  const client = createSolrClient({
    fetch: async () => new Response(JSON.stringify({ error: { msg: "invalid authentication configuration" } }), { status: 400, statusText: "Bad Request" })
  });
  await assert.rejects(client.security("authentication", { "set-user": { alice: password } }), error => {
    assert.ok(error instanceof SolrHttpError);
    const publicError = [error.message, error.body, JSON.stringify(error.errorResponse)].join(" ");
    assert.equal(publicError.includes(password), false);
    return true;
  });
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

test("Collections shard lifecycle and MIGRATE actions serialize V1 parameters exactly", async () => {
  const requests: URL[] = [];
  const client = createSolrClient({ fetch: async input => {
    requests.push(new URL(String(input)));
    return new Response(JSON.stringify({ responseHeader: { status: 0, QTime: 1 }, requestid: "async-1" }));
  } });
  const created = await client.collections("CREATESHARD", { collection: "books", shard: "shard2", createNodeSet: "solr-1:8983_solr", nrtReplicas: 2, tlogReplicas: 1, pullReplicas: 0, waitForFinalState: true, async: "create-1" });
  assert.equal(created.responseHeader?.status, 0);
  await client.collections("DELETESHARD", { collection: "books", shard: "shard2", deleteInstanceDir: true, deleteDataDir: true, deleteIndex: true });
  await client.collections("SPLITSHARD", { collection: "books", "split.key": "tenant!", ranges: "0-7fffffff,80000000-ffffffff", splitMethod: "rewrite", waitForFinalState: true, async: "split-1" });
  const migrated = await client.collections("MIGRATE", { collection: "source", "split.key": "tenant!", "target.collection": "target", "forward.timeout": 60, async: "migrate-1" });
  assert.equal(migrated.requestid, "async-1");
  assert.equal(requests[0]?.searchParams.get("action"), "CREATESHARD");
  assert.equal(requests[0]?.searchParams.get("createNodeSet"), "solr-1:8983_solr");
  assert.equal(requests[0]?.searchParams.get("nrtReplicas"), "2");
  assert.equal(requests[0]?.searchParams.get("async"), "create-1");
  assert.equal(requests[1]?.searchParams.get("deleteInstanceDir"), "true");
  assert.equal(requests[2]?.searchParams.get("split.key"), "tenant!");
  assert.equal(requests[2]?.searchParams.has("splitKey"), false, "V1 handler must use split.key, not V2 splitKey");
  assert.equal(requests[2]?.searchParams.get("ranges"), "0-7fffffff,80000000-ffffffff");
  assert.equal(requests[3]?.searchParams.get("action"), "MIGRATE");
  assert.equal(requests[3]?.searchParams.get("collection"), "source");
  assert.equal(requests[3]?.searchParams.get("split.key"), "tenant!");
  assert.equal(requests[3]?.searchParams.get("target.collection"), "target");
  assert.equal(requests[3]?.searchParams.get("forward.timeout"), "60");
  assert.equal(requests[3]?.searchParams.get("async"), "migrate-1");
});
