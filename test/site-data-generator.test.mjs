import test from "node:test";
import assert from "node:assert/strict";
import { normalizeApiInventory, parseDocumentationCatalogue } from "../scripts/site/generate-data.mjs";

test("normalizes API evidence per operation and preserves separate coverage dimensions", () => {
  const data = normalizeApiInventory({ entries: [
    { id: "query.select", area: "Query", clientMethod: "query", methodImplemented: true, typeCoverage: "complete", unitTests: "present", integrationTests: "tested", versions: { "8": "tested", "9": "tested", "10": "tested" }, notes: "pinned evidence" },
    { id: "admin.example", area: "Admin", clientMethod: "admin", methodImplemented: true, typeCoverage: "partial", unitTests: "present", integrationTests: "not-run", versions: { "8": "not-run", "9": "not-run", "10": "not-run" } }
  ] });
  assert.equal(data[0].status, "verified");
  assert.equal(data[0].typeCoverage, "complete");
  assert.deepEqual(data[0].versions, ["8", "9", "10"]);
  assert.equal(data[1].status, "unverified");
  assert.equal(data[1].integrationTests, "not-run");
  assert.equal(data[0].evidence.path, "docs/api-inventory.json");
});

test("builds a deterministic canonical documentation catalogue without external links", () => {
  const markdown = [
    "- [Query](query.md)",
    "- [API inventory](api-inventory.json)",
    "- [External](https://example.com)",
    "- [Anchor](#top)",
    "- [Query duplicate](query.md#filters)"
  ].join("\n");
  const first = parseDocumentationCatalogue(markdown);
  const second = parseDocumentationCatalogue(markdown);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map((item) => item.path), ["docs/query.md", "docs/api-inventory.json"]);
});


test("generates byte-stable source data from fixed time and normalized external fixtures", async () => {
  const { generateSiteData } = await import("../scripts/site/generate-data.mjs");
  const version = "4.0.0-beta.0";
  const fetchImpl = async (url) => {
    let value = {};
    if (url.includes("/actions/runs")) value = { workflow_runs: [] };
    else if (url.includes("/issues?")) value = [];
    else if (url.includes("/issues/")) {
      const number = Number(url.split("/").pop());
      value = { number, state: "open", title: "Fixture issue " + number, labels: [], milestone: null };
    } else if (url.includes("/pulls/")) value = { merged: false };
    else if (url.includes("registry.npmjs.org")) value = { "dist-tags": { latest: version }, versions: { [version]: {} }, time: { [version]: "2026-11-01T00:00:00Z" } };
    else if (url.includes("api.npmjs.org")) value = { downloads: 0 };
    else if (url.includes("/releases") || url.includes("/tags")) value = [];
    return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
  };
  const options = { asOf: "2026-11-06T09:00:00Z", fetchImpl };
  const first = await generateSiteData(options);
  const second = await generateSiteData(options);
  assert.deepEqual(first, second);
  assert.equal(first.generatedAt, "2026-11-06T09:00:00.000Z");
  assert.equal(first.npm.records[0].downloads, 0);
  assert.ok(first.ci.configuredMatrix.some((item) => item.dimension === "node"));
});


test("uses timestamped public snapshots as stale data when sources are rate-limited", async () => {
  const fs = await import("node:fs");
  const { generateSiteData } = await import("../scripts/site/generate-data.mjs");
  const cachePath = "build/site-snapshots.json";
  const previous = fs.existsSync(cachePath) ? fs.readFileSync(cachePath, "utf8") : null;
  fs.mkdirSync("build", { recursive: true });
  const retrievedAt = "2026-11-05T09:00:00.000Z";
  const roadmap = fs.readFileSync("docs/roadmap.md", "utf8");
  const numbers = [...new Set([...roadmap.matchAll(/https:\/\/github\.com\/vsimko\/node-solr-lambda\/(?:issues|pull)\/(\d+)/g)].map((m) => Number(m[1])))];
  const snapshot = {
    "github-actions": { value: { workflow_runs: [] }, retrievedAt, url: "https://api.github.com/repos/vsimko/node-solr-lambda/actions/runs?per_page=20" },
    "github-issues": { value: [], retrievedAt, url: "https://api.github.com/repos/vsimko/node-solr-lambda/issues?state=all&per_page=100" },
    "npm-registry": { value: { "dist-tags": { latest: "4.0.0-beta.0" }, versions: { "4.0.0-beta.0": {} }, time: {} }, retrievedAt, url: "https://registry.npmjs.org/node-solr-lambda" },
    "npm-downloads": { value: { downloads: 23 }, retrievedAt, url: "https://api.npmjs.org/downloads/point/2026-10-30:2026-11-05/node-solr-lambda" },
    "github-releases": { value: [], retrievedAt, url: "https://api.github.com/repos/vsimko/node-solr-lambda/releases?per_page=50" },
    "github-tags": { value: [], retrievedAt, url: "https://api.github.com/repos/vsimko/node-solr-lambda/tags?per_page=50" }
  };
  for (const number of numbers) snapshot["issue-" + number] = { value: { number, state: "open", title: "Cached issue " + number, labels: [], milestone: null }, retrievedAt };
  fs.writeFileSync(cachePath, JSON.stringify(snapshot));
  try {
    const data = await generateSiteData({ asOf: "2026-11-06T09:00:00Z", fetchImpl: async () => { throw new Error("rate limited"); } });
    assert.equal(data.ci.status, "stale");
    assert.equal(data.roadmap.status, "stale");
    assert.equal(data.npm.status, "stale");
    assert.equal(data.npm.records[0].downloads, 23);
    assert.equal(data.sources.find((item) => item.id === "npm-downloads").retrievedAt, retrievedAt);
  } finally {
    if (previous === null) fs.rmSync(cachePath, { force: true });
    else fs.writeFileSync(cachePath, previous);
  }
});


test("summarizes implementation progress without conflating implementation, types, runtime evidence, and roadmap state", async () => {
  const { summarizeProgress } = await import("../website/assets/progress.js");
  const api = [
    { implementation: "implemented", typeCoverage: "complete", status: "verified" },
    { implementation: "implemented", typeCoverage: "partial", status: "partial" },
    { implementation: "not-covered", typeCoverage: "none", status: "unsupported" }
  ];
  const roadmap = [
    { state: "closed" },
    { state: "merged" },
    { state: "open" },
    { state: "in-progress" }
  ];
  assert.deepEqual(summarizeProgress(api, roadmap), [
    { id: "implemented", label: "API operations implemented", value: 2, total: 3, detail: "Public operations present in the client" },
    { id: "typed", label: "Complete TypeScript contracts", value: 1, total: 3, detail: "Operations with complete type coverage" },
    { id: "verified", label: "Runtime verified", value: 1, total: 3, detail: "Verified on every pinned Solr version listed" },
    { id: "roadmap", label: "Roadmap work completed", value: 2, total: 4, detail: "Closed issues and merged pull requests" }
  ]);
  assert.equal(summarizeProgress([], [])[0].total, 0);
});
