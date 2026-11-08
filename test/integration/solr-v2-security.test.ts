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
  const anonymous = await fetch(`${baseUrl}/api/cores/`);
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
