import test from "node:test";
import assert from "node:assert/strict";
import { validateRules, validateSiteData } from "../scripts/site/validate-data.mjs";

const source = { id: "github-actions", kind: "github", url: "https://api.github.com/repos/example/project/actions", retrievedAt: "2026-11-06T08:00:00.000Z", status: "available" };
const base = {
  schemaVersion: 1,
  generatedAt: "2026-11-06T08:00:00.000Z",
  package: { name: "node-solr-lambda", version: "4.0.0-beta.0", repository: "https://github.com/vsimko/node-solr-lambda" },
  sources: [source],
  apiCoverage: { status: "available", sourceIds: [source.id], records: [{ id: "select", operationId: "select", status: "implemented", versions: ["8", "9", "10"], evidence: ["docs/api-reference.md"] }] },
  ci: { status: "available", sourceIds: [source.id], records: [{ id: "run-1", status: "completed", conclusion: "success", runUrl: "https://github.com/example/project/actions/runs/1", commit: "abc123", ref: "refs/heads/main", startedAt: "2026-11-06T07:00:00Z", completedAt: "2026-11-06T07:01:00Z", observed: true }] },
  roadmap: { status: "available", sourceIds: [source.id], records: [{ id: "issue-1", number: 1, url: "https://github.com/example/project/issues/1", priority: "P1", state: "open" }] },
  npm: { status: "available", sourceIds: [source.id], records: [{ id: "downloads-week", packageName: "node-solr-lambda", version: "4.0.0-beta.0", downloads: 0, window: "last-7-days", sourceUrl: "https://www.npmjs.com/package/node-solr-lambda", retrievedAt: "2026-11-06T08:00:00Z" }] },
  releases: { status: "available", sourceIds: [source.id], records: [{ id: "v4-beta", tag: "v4.0.0-beta.0", version: "4.0.0-beta.0", draft: false, publishedAt: "2026-11-01T08:00:00Z", url: "https://github.com/example/project/releases/tag/v4.0.0-beta.0", changelogUrl: "https://github.com/example/project/blob/main/CHANGELOG.md", displayAsPublished: true }] },
  documentation: { status: "available", sourceIds: [source.id], records: [{ id: "api-reference", path: "docs/api-reference.md", url: "https://github.com/example/project/blob/main/docs/api-reference.md", owner: "authored" }] }
};

const rules = { version: 1, rules: [{ id: "one", severity: "error", enabled: true, check: "file-exists", path: "README.md" }] };

test("accepts a valid deterministic P1 data fixture, including a genuine zero metric", () => {
  assert.deepEqual(validateSiteData(base, rules), []);
});

test("rejects malformed rules, duplicate IDs, unsupported checks, and invalid severity", () => {
  const result = validateRules({ version: 1, rules: [
    { id: "same", severity: "error", enabled: true, check: "file-exists", path: "README.md" },
    { id: "same", severity: "fatal", enabled: "yes", check: "eval", path: "../outside" }
  ] });
  assert.ok(result.some((item) => item.message.includes("duplicated")));
  assert.ok(result.some((item) => item.message.includes("Severity")));
  assert.ok(result.some((item) => item.message.includes("enabled")));
  assert.ok(result.some((item) => item.message.includes("Unsupported")));
  assert.ok(result.some((item) => item.message.includes("repository-relative")));
});

test("rejects duplicate IDs, unknown sources, and unavailable domains with records", () => {
  const invalid = structuredClone(base);
  invalid.sources.push({ ...source });
  invalid.apiCoverage.sourceIds = ["missing"];
  invalid.ci.status = "unavailable";
  assert.ok(validateSiteData(invalid, rules).length >= 3);
});

test("does not treat configured matrix dimensions as observed CI success", () => {
  const invalid = structuredClone(base);
  invalid.ci.records[0].matrixConfigured = true;
  invalid.ci.records[0].observed = false;
  assert.ok(validateSiteData(invalid, rules).some((item) => item.id === "ci-configured-not-observed"));
});

test("does not expose drafts or unreleased entries as published releases", () => {
  const invalid = structuredClone(base);
  invalid.releases.records[0].draft = true;
  invalid.releases.records[0].displayAsPublished = true;
  assert.ok(validateSiteData(invalid, rules).some((item) => item.id === "release-unpublished-visible"));
});

test("distinguishes unavailable data from a valid zero downloads count", () => {
  const validZero = structuredClone(base);
  assert.deepEqual(validateSiteData(validZero, rules), []);
  const unavailable = structuredClone(base);
  unavailable.npm.status = "unavailable";
  unavailable.npm.records = [];
  assert.deepEqual(validateSiteData(unavailable, rules), []);
});

test("rejects stale/malformed timestamps and unknown roadmap states", () => {
  const invalid = structuredClone(base);
  invalid.npm.records[0].retrievedAt = "not-a-date";
  invalid.roadmap.records[0].state = "maybe";
  assert.ok(validateSiteData(invalid, rules).some((item) => item.id === "record-npm-retrievedAt"));
  assert.ok(validateSiteData(invalid, rules).some((item) => item.id === "roadmap-state"));
});

test("validates optional P2 domains without requiring their presence", () => {
  assert.deepEqual(validateSiteData(base, rules), []);
  const invalid = structuredClone(base);
  invalid.upstreamSolr = { status: "available", sourceIds: ["unknown"], records: [] };
  assert.ok(validateSiteData(invalid, rules).some((item) => item.id === "optional-source-upstreamSolr"));
});
