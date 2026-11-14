import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { SolrClient, SolrHttpError } from "../../src/index.js";

const baseUrl = process.env.SOLR_BASE_URL;
const core = process.env.SOLR_CORE;
const username = process.env.SOLR_USERNAME;
const password = process.env.SOLR_PASSWORD;

test("V2 Core Admin enforces authentication and permits an authenticated admin", {
  skip: process.env.SOLR_SECURITY !== "true" || !baseUrl || !core || !username || !password ||
    !["9.11.0", "10.1.0"].includes(process.env.SOLR_VERSION ?? "")
}, async () => {
  const anonymous = await fetch(new URL("/api/cores/", baseUrl));
  assert.equal(anonymous.status, 401);
  await anonymous.arrayBuffer();

  const client = new SolrClient({
    baseUrl: baseUrl!,
    core: core!,
    timeoutMs: 30_000,
    auth: { type: "basic", username: username!, password: password! }
  });
  const result = await client.v2.coreAdmin.list({ indexInfo: false });
  assert.ok(result.responseHeader);
  assert.ok(result.status);

  const denied = new SolrClient({
    baseUrl: baseUrl!,
    core: core!,
    timeoutMs: 30_000,
    auth: { type: "basic", username: username!, password: "wrong-password" }
  });
  await assert.rejects(
    () => denied.v2.coreAdmin.list(),
    error => error instanceof SolrHttpError && error.status === 401
  );
});

test("V2 Collections, cluster, and alias discovery/mutation routes enforce BasicAuth", {
  skip: process.env.SOLR_SECURITY !== "true" || !baseUrl || !username || !password
}, async () => {
  const probe = "security_alias_" + randomUUID().replaceAll("-", "");
  const requests: { path: string; method: string; body?: string }[] = [
    { path: "/api/collections", method: "GET" },
    { path: "/api/cluster", method: "GET" },
    { path: "/api/aliases", method: "GET" },
    { path: "/api/collections/security_probe_collection/shards/shard1/replicas", method: "POST", body: JSON.stringify({ node: "missing-node" }) },
    { path: "/api/collections/security_probe_collection/shards/shard1/replicas/core_node999", method: "DELETE" },

    { path: "/api/aliases/" + probe, method: "GET" },
    { path: "/api/aliases/" + probe + "/properties", method: "GET" },
    { path: "/api/aliases/" + probe + "/properties/owner", method: "GET" },
    { path: "/api/aliases", method: "POST", body: JSON.stringify({ name: probe, collections: [probe + "_missing_collection"] }) },
    { path: "/api/aliases/" + probe, method: "DELETE" },
    { path: "/api/aliases/" + probe + "/properties", method: "PUT", body: JSON.stringify({ properties: { owner: "security-probe" } }) },
    { path: "/api/aliases/" + probe + "/properties/owner", method: "PUT", body: JSON.stringify({ value: "security-probe" }) },
    { path: "/api/aliases/" + probe + "/properties/owner", method: "DELETE" }
  ];
  if (["9.11.0", "10.1.0"].includes(process.env.SOLR_VERSION ?? "")) {
    const backup = "security_backup_" + randomUUID().replaceAll("-", "");
    const location = "/var/solr/backups";
    requests.push(
      { path: `/api/collections/${probe}_missing/backups/${backup}/versions`, method: "POST", body: JSON.stringify({ location }) },
      { path: `/api/backups/${backup}/versions?location=${encodeURIComponent(location)}`, method: "GET" },
      { path: `/api/backups/${backup}/versions/0?location=${encodeURIComponent(location)}`, method: "DELETE" },
      { path: `/api/backups/${backup}/restore`, method: "POST", body: JSON.stringify({ collection: probe + "_missing_target", location }) }
    );
  }
  const authorization = "Basic " + Buffer.from(username + ":" + password).toString("base64");
  const invalidAuthorization = "Basic " + Buffer.from(username + ":wrong-password").toString("base64");

  for (const request of requests) {
    const headers = request.body === undefined ? undefined : { "content-type": "application/json" };
    const anonymous = await fetch(new URL(request.path, baseUrl), {
      method: request.method,
      ...(headers ? { headers } : {}),
      ...(request.body === undefined ? {} : { body: request.body })
    });
    assert.equal(anonymous.status, 401, request.method + " " + request.path + " must reject anonymous access");
    await anonymous.arrayBuffer();

    const authenticated = await fetch(new URL(request.path, baseUrl), {
      method: request.method,
      headers: { ...(headers ?? {}), authorization },
      ...(request.body === undefined ? {} : { body: request.body })
    });
    assert.notEqual(authenticated.status, 401,
      request.method + " " + request.path + " must accept valid credentials and reach the endpoint handler");
    await authenticated.arrayBuffer();

    const denied = await fetch(new URL(request.path, baseUrl), {
      method: request.method,
      headers: { ...(headers ?? {}), authorization: invalidAuthorization },
      ...(request.body === undefined ? {} : { body: request.body })
    });
    assert.equal(denied.status, 401, request.method + " " + request.path + " must reject invalid credentials");
    await denied.arrayBuffer();
  }
});
