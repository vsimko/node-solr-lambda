import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("System info endpoint returns server information", async ({ client }) => {
  const result = await client.systemInfo<{ mode?: string; lucene?: { "solr-spec-version"?: string } }>();
  assert.ok(result.mode || result.lucene, "system info should include server metadata");
});

integrationTest("Metrics API returns JVM metrics", async ({ client }) => {
  const result = await client.metrics<{ metrics?: Record<string, unknown> }>({ group: "jvm" });
  assert.ok(result.metrics && Object.keys(result.metrics).length > 0, "JVM metrics should be present");
});
