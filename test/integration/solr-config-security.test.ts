import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("Config API accepts an isolated user property and security fixtures are shaped", async ({
  client,
  createId,
  setUserProperty,
  securityData
}) => {
  const property = createId("fixture_property");
  await setUserProperty(property, "integration-value");

  assert.equal(securityData.authentication.class, "solr.BasicAuthPlugin");
  assert.equal(securityData.authentication.blockUnknown, true);
  assert.equal(securityData.authorization.class, "solr.RuleBasedAuthorizationPlugin");
  assert.ok(Array.isArray(securityData.authorization.permissions));

  // The config mutation is the live endpoint assertion; security.json is deliberately
  // kept as data so this standalone CI core never changes its authentication policy.
  assert.equal(typeof client.config, "function");
});
