import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const docsArm = workflow.split("\n").map(line => line.trim()).find(line => line.startsWith("README.md|") && line.endsWith(")"));

test("CI classifies changelog and machine-readable API inventory as documentation", () => {
  assert.ok(docsArm, "documentation patterns must be present in the changed-path classifier");
  const patterns = docsArm.replace(/\)$/, "").split("|");
  assert.ok(patterns.includes("README.md"));
  assert.ok(patterns.includes("CHANGELOG.md"));
  assert.ok(patterns.includes("docs/*.md"));
  assert.ok(patterns.includes("docs/**/*.md"));
  assert.ok(patterns.includes("docs/*.json"));
  assert.ok(patterns.includes("docs/**/*.json"));
});
