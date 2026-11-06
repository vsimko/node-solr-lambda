import test from "node:test";
import assert from "node:assert/strict";
import { validateRules, validateSiteData } from "../scripts/site/validate-data.mjs";

const source = { id: "github-actions", kind: "github", url: "https://api.github.com/repos/example/project/actions", retrievedAt: "2026-11-06T08:00:00.000Z", status: "available" };
const base = {
  schemaVersion: 1,
  generatedAt: "2026-11-06T08:00:00.000Z",
  package: { name: "node-solr-lambda", version: "4.0.0-beta.0", repository: "https://github.com/vsimko/node-solr-lambda", source: "package.json" },
  sources: [source],
  apiCoverage: { status: "available", sourceIds: [source.id], records: [{ id: "select", operationId: "select", status: "verified", versions: ["8", "9", "10"], evidence: { sourceIds: [source.id], path: "README.md", description: "Canonical API inventory evidence" } }] },
  ci: { status: "available", sourceIds: [source.id], records: [{ id: "run-1", runId: "1", workflow: "CI", event: "pull_request", status: "completed", conclusion: "success", runUrl: "https://github.com/example/project/actions/runs/1", commit: "abc123", ref: "refs/heads/main", startedAt: "2026-11-06T07:00:00Z", completedAt: "2026-11-06T07:01:00Z", observed: true }] },
  roadmap: { status: "available", sourceIds: [source.id], records: [{ id: "issue-1", number: 1, url: "https://github.com/example/project/issues/1", priority: "P1", state: "open" }] },
  npm: { status: "available", sourceIds: [source.id], records: [{ id: "downloads-week", packageName: "node-solr-lambda", version: "4.0.0-beta.0", downloads: 0, window: "last-7-days", windowStart: "2026-10-30T00:00:00Z", windowEnd: "2026-11-06T00:00:00Z", sourceUrl: "https://www.npmjs.com/package/node-solr-lambda", retrievedAt: "2026-11-06T08:00:00Z" }] },
  releases: { status: "available", sourceIds: [source.id], records: [{ id: "v4-beta", tag: "v4.0.0-beta.0", version: "4.0.0-beta.0", draft: false, publishedAt: "2026-11-01T08:00:00Z", url: "https://github.com/example/project/releases/tag/v4.0.0-beta.0", changelogUrl: "https://github.com/example/project/blob/main/CHANGELOG.md", displayAsPublished: true }] },
  documentation: { status: "available", sourceIds: [source.id], records: [{ id: "api-reference", path: "docs/api-reference.md", url: "https://github.com/example/project/blob/main/docs/api-reference.md", owner: "authored" }] }
};

const rules = { version: 1, rules: [{ id: "one", severity: "error", enabled: true, check: "file-exists", path: "README.md" }] };

test("accepts a valid deterministic P1 data fixture, including a genuine zero metric", () => {
  assert.deepEqual(validateSiteData(base, rules), []);
});

test("validates local-link and required-text rule definitions", () => {
  const valid = validateRules({ version: 1, rules: [
    { id: "links", severity: "error", enabled: true, check: "local-links", path: "docs/index.md" },
    { id: "text", severity: "warning", enabled: true, check: "text-contains", path: "README.md", text: "# node-solr-lambda" }
  ] });
  assert.deepEqual(valid, []);
  const invalid = validateRules({ version: 1, rules: [
    { id: "links", severity: "error", enabled: true, check: "local-links", path: "../outside.md" },
    { id: "text", severity: "warning", enabled: true, check: "text-contains", path: "README.md" }
  ] });
  assert.ok(invalid.some((item) => item.message.includes("repository-relative")));
  assert.ok(invalid.some((item) => item.message.includes("text-contains")));
});

test("rejects malformed rules, duplicate IDs, unsupported checks, and invalid severity", () => {
  const result = validateRules({ version: 1, rules: [
    { id: "same", severity: "error", enabled: true, check: "file-exists", path: "README.md" },
    { id: "same", severity: "fatal", enabled: "yes", check: "file-exists", path: "../outside" },
    { id: "bad-check", severity: "warning", enabled: true, check: "eval", path: "README.md" }
  ] });
  assert.ok(result.some((item) => item.message.includes("duplicated")));
  assert.ok(result.some((item) => item.message.includes("Severity") && item.severity === "error"));
  assert.ok(result.some((item) => item.message.includes("enabled")));
  assert.ok(result.some((item) => item.message.includes("Unsupported") && item.severity === "error"));
  assert.ok(result.some((item) => item.message.includes("repository-relative")));
});

test("rejects duplicate IDs, unknown sources, and unavailable domains with records", () => {
  const invalid = structuredClone(base);
  invalid.sources.push({ ...source });
  invalid.apiCoverage.sourceIds = ["missing"];
  invalid.ci.status = "unavailable";
  assert.ok(validateSiteData(invalid, rules).length >= 3);
});

test("rejects missing API evidence provenance and incomplete package source metadata", () => {
  const invalid = structuredClone(base);
  invalid.apiCoverage.records[0].evidence.sourceIds = ["missing"];
  invalid.package.source = "";
  const ids = validateSiteData(invalid, rules).map((item) => item.id);
  assert.ok(ids.includes("api-coverage-evidence-source"));
  assert.ok(ids.includes("site-data-package"));
});

test("requires explicit CI identity and bounded npm download windows", () => {
  const invalid = structuredClone(base);
  delete invalid.ci.records[0].workflow;
  invalid.npm.records[0].windowStart = "2026-11-07T00:00:00Z";
  const ids = validateSiteData(invalid, rules).map((item) => item.id);
  assert.ok(ids.includes("record-ci-workflow"));
  assert.ok(ids.includes("npm-window-range"));
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

test("accepts valid optional P2 Solr, TypeScript API, and CI history records", () => {
  const valid = structuredClone(base);
  valid.upstreamSolr = { status: "available", sourceIds: [source.id], records: [{ id: "solr-10.1", version: "10.1.0", releaseDate: "2026-01-01", sourceUrl: "https://solr.apache.org/downloads.html" }] };
  valid.typescriptApi = { status: "available", sourceIds: [source.id], records: [{ id: "client-export", path: "api/SolrClient.html", sourcePath: "src/client.ts", exportName: "SolrClient", visibility: "public" }] };
  valid.ciHistory = { status: "available", sourceIds: [source.id], records: [{ id: "run-history-1", runId: "123", durationSeconds: 62, url: "https://github.com/example/project/actions/runs/123", completedAt: "2026-11-06T08:00:00Z" }] };
  assert.deepEqual(validateSiteData(valid, rules), []);
});

test("rejects non-official Solr sources, leaked internal API declarations, and invalid CI history", () => {
  const invalid = structuredClone(base);
  invalid.upstreamSolr = { status: "available", sourceIds: [source.id], records: [{ id: "solr-1", version: "latest", releaseDate: "yesterday", sourceUrl: "https://example.com/solr" }] };
  invalid.typescriptApi = { status: "available", sourceIds: [source.id], records: [{ id: "private", path: "api/private.html", sourcePath: "src/private.ts", exportName: "Secret", visibility: "internal", includedInPublicReference: true }] };
  invalid.ciHistory = { status: "available", sourceIds: [source.id], records: [{ id: "history", runId: "123", durationSeconds: -1, url: "https://example.com/run", completedAt: "bad-date" }] };
  const ids = validateSiteData(invalid, rules).map((item) => item.id);
  assert.ok(ids.includes("solr-release-source"));
  assert.ok(ids.includes("typescript-api-private-export"));
  assert.ok(ids.includes("ci-history-duration"));
  assert.ok(ids.includes("ci-history-url"));
  assert.ok(ids.includes("ci-history-date"));
});

test("accepts disabled declarative rules without executing or interpreting them", () => {
  const result = validateRules({ version: 1, rules: [{ id: "disabled-check", severity: "warning", enabled: false, check: "file-exists", path: "README.md" }] });
  assert.deepEqual(result, []);
});

test("rejects invalid npm semver and mismatched published release tags", () => {
  const invalid = structuredClone(base);
  invalid.npm.records[0].version = "latest";
  invalid.releases.records[0].tag = "v3.9.9";
  const ids = validateSiteData(invalid, rules).map((item) => item.id);
  assert.ok(ids.includes("npm-version"));
  assert.ok(ids.includes("release-tag-version"));
});
