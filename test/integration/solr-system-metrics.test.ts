import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("System info endpoint returns server information", async ({ client }) => {
  const result = await client.systemInfo<{ mode?: string; lucene?: { "solr-spec-version"?: string } }>();
  assert.ok(result.mode || result.lucene, "system info should include server metadata");
});

integrationTest("Metrics API returns JVM metrics", async ({ client }) => {
  const result = await client.metrics<string | { metrics?: Record<string, unknown> }>({ group: "jvm" });
  if (typeof result === "string") {
    // Newer Solr lines may negotiate the Prometheus exposition writer by default.
    assert.match(result, /jvm_[a-z_]+/, "JVM metrics text should contain Prometheus metric names");
  } else {
    // Older Solr lines return the classic JSON metrics registry.
    assert.ok(result.metrics && Object.keys(result.metrics).length > 0, "JVM metrics JSON should contain registry data");
  }
});
