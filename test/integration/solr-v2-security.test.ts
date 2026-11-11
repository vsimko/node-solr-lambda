import assert from "node:assert/strict";
import test from "node:test";
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

test("V2 Collections and cluster routes enforce BasicAuth before handler execution", {
  skip: process.env.SOLR_SECURITY !== "true" || !baseUrl || !username || !password
}, async () => {
  const paths = ["/api/collections", "/api/cluster", "/api/aliases"];
  const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

  for (const path of paths) {
    const anonymous = await fetch(new URL(path, baseUrl));
    assert.equal(anonymous.status, 401, `${path} must reject anonymous access`);
    await anonymous.arrayBuffer();

    const authenticated = await fetch(new URL(path, baseUrl), {
      headers: { authorization }
    });
    assert.notEqual(authenticated.status, 401,
      `${path} must accept valid credentials and reach the endpoint handler`);
    await authenticated.arrayBuffer();

    const invalidAuthorization = `Basic ${Buffer.from(`${username}:wrong-password`).toString("base64")}`;
    const denied = await fetch(new URL(path, baseUrl), {
      headers: { authorization: invalidAuthorization }
    });
    assert.equal(denied.status, 401, `${path} must reject invalid credentials`);
    await denied.arrayBuffer();
  }
});
