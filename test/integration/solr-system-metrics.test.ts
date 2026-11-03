import assert from "node:assert/strict";
import type { SolrMetricsJsonResponse } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

integrationTest("System info endpoint returns stable server metadata", async ({ client }) => {
  const result = await client.systemInfo<{ mode?: string; lucene?: { "solr-spec-version"?: string }; jvm?: Record<string, unknown> }>();
  assert.ok(Object.keys(result).length > 0, "system info should not be empty");
  assert.ok(typeof result.mode === "string" || result.lucene !== undefined || result.jvm !== undefined,
    "system info should include at least one stable server metadata section");
  if (result.lucene?.["solr-spec-version"] !== undefined) {
    assert.match(result.lucene["solr-spec-version"]!, /^\d+\./, "Lucene/Solr spec version should be version-shaped");
  }
});

integrationTest("System properties endpoint returns JVM/process properties", async ({ client }) => {
  const result = await client.systemProperties();
  const propertyKeys = Object.keys(result).filter(key => key !== "responseHeader");
  assert.ok(propertyKeys.length > 0, "System properties should include at least one JVM/process property");
});

integrationTest("System threads endpoint returns a thread dump", async ({ client }) => {
  const result = await client.systemThreads();
  const threadDump = result.system?.threadDump ?? [];
  assert.ok(Array.isArray(threadDump) && threadDump.length > 0,
    "thread dump should include at least one JVM thread entry");
});

integrationTest("System logging endpoint returns logger metadata", async ({ client }) => {
  const result = await client.systemLogging();
  assert.ok(result.levels !== undefined || result.loggers !== undefined || result.watcher !== undefined,
    "logging response should include levels, loggers, or watcher metadata");
});

integrationTest("Metrics API returns a non-empty JVM metrics registry or exposition", async ({ client }) => {
  const result = await client.metrics({ group: "jvm" });
  if (typeof result === "string") {
    // Solr 10.1 may negotiate the Prometheus exposition writer by default.
    assert.match(result, /^# (HELP|TYPE) |\bjvm_[a-zA-Z0-9_:]+\s/m,
      "JVM Prometheus response should contain a metric declaration or sample");
  } else {
    const registries = result.metrics ?? {};
    assert.ok(Object.keys(registries).length > 0, "JVM metrics JSON should contain at least one registry");
    const metricCount = Object.values(registries).reduce((count, registry) =>
      count + Object.keys(registry).length, 0);
    assert.ok(metricCount > 0, "JVM metrics JSON should contain at least one metric");
  }
});


integrationTest("Metrics API exposes node metrics and applies registry, prefix, and regex filters", async ({ client }) => {
  const result = await client.metrics<SolrMetricsJsonResponse>({ group: "node", wt: "json" });
  const registries = result.metrics ?? {};
  const nonEmptyRegistry = Object.entries(registries).find(([, metrics]) => Object.keys(metrics).length > 0);
  assert.ok(nonEmptyRegistry, "node group should expose a non-empty JSON metrics registry");

  const [registryName, registry] = nonEmptyRegistry;
  const metricName = Object.keys(registry)[0];
  assert.ok(metricName, "node registry should contain at least one metric");

  const byRegistry = await client.metrics<SolrMetricsJsonResponse>({
    group: "node", registry: registryName, wt: "json"
  });
  assert.deepEqual(Object.keys(byRegistry.metrics ?? {}), [registryName],
    "registry filter should return only the requested registry");

  const prefix = metricName.slice(0, Math.min(3, metricName.length));
  const byPrefix = await client.metrics<SolrMetricsJsonResponse>({
    group: "node", registry: registryName, prefix, wt: "json"
  });
  const prefixNames = Object.keys(byPrefix.metrics?.[registryName] ?? {});
  assert.ok(prefixNames.length > 0, "prefix filter should retain matching node metrics");
  assert.ok(prefixNames.every(name => name.startsWith(prefix)),
    "prefix filter should exclude metric names outside the requested prefix");

  const regexPrefix = metricName.slice(0, 1);
  const byRegex = await client.metrics<SolrMetricsJsonResponse>({
    group: "node", registry: registryName, regex: "^" + regexPrefix, wt: "json"
  });
  const regexNames = Object.keys(byRegex.metrics?.[registryName] ?? {});
  assert.ok(regexNames.length > 0, "regex filter should retain matching node metrics");
  assert.ok(regexNames.every(name => name.startsWith(regexPrefix)),
    "regex filter should exclude metric names outside the requested expression");
});