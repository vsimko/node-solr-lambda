import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("System info endpoint returns stable server metadata", async ({ client }) => {
  const result = await client.systemInfo<{ mode?: string; lucene?: { "solr-spec-version"?: string }; jvm?: Record<string, unknown> }>();
  assert.ok(Object.keys(result).length > 0, "system info should not be empty");
  assert.ok(typeof result.mode === "string" || result.lucene !== undefined || result.jvm !== undefined,
    "system info should include at least one stable server metadata section");
  if (result.lucene?.["solr-spec-version"] !== undefined) {
    assert.match(result.lucene["solr-spec-version"]!, /^\\d+\\./, "Lucene/Solr spec version should be version-shaped");
  }
});

integrationTest("Metrics API returns a non-empty JVM metrics registry or exposition", async ({ client }) => {
  const result = await client.metrics({ group: "jvm" });
  if (typeof result === "string") {
    // Solr 10.1 may negotiate the Prometheus exposition writer by default.
    assert.match(result, /^# (HELP|TYPE) |\\bjvm_[a-zA-Z0-9_:]+\\s/m,
      "JVM Prometheus response should contain a metric declaration or sample");
  } else {
    const registries = result.metrics ?? {};
    assert.ok(Object.keys(registries).length > 0, "JVM metrics JSON should contain at least one registry");
    const metricCount = Object.values(registries).reduce((count, registry) =>
      count + Object.keys(registry).length, 0);
    assert.ok(metricCount > 0, "JVM metrics JSON should contain at least one metric");
  }
});
