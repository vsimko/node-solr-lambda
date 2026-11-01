import assert from "node:assert/strict";
import test from "node:test";
import { SolrClient } from "../../src/index.js";

const baseUrl = process.env.SOLR_BASE_URL;
const core = process.env.SOLR_CORE;
const username = process.env.SOLR_USERNAME;
const password = process.env.SOLR_PASSWORD;

test("Security API reads and updates BasicAuth and RuleBasedAuthorization configuration", {
  skip: process.env.SOLR_SECURITY !== "true" || !baseUrl || !core || !username || !password
}, async () => {
  const client = new SolrClient({
    baseUrl: baseUrl!,
    core: core!,
    timeoutMs: 30_000,
    auth: { type: "basic", username: username!, password: password! }
  });

  const authentication = await client.security<{
    authentication?: { class?: string; blockUnknown?: boolean };
  }>("authentication");
  assert.equal(authentication.authentication?.class, "solr.BasicAuthPlugin");
  assert.equal(authentication.authentication?.blockUnknown, true);

  const authorization = await client.security<{
    authorization?: { class?: string; permissions?: unknown[] };
  }>("authorization");
  assert.equal(authorization.authorization?.class, "solr.RuleBasedAuthorizationPlugin");
  assert.ok(Array.isArray(authorization.authorization?.permissions));

  await client.security("authentication", {
    "set-property": { realm: "integration-security-test" }
  });
  const updated = await client.security<{
    authentication?: { realm?: string };
  }>("authentication");
  assert.equal(updated.authentication?.realm, "integration-security-test");
});
