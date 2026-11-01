import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const inventory = JSON.parse(readFileSync("docs/api-inventory.json", "utf8"));
const majors = ["8", "9", "10"];
const requiredMethods = [
  "query", "queryJson", "add", "update", "delete", "commit", "softCommit",
  "optimize", "rollback", "ping", "schema", "config", "coreAdmin",
  "collections", "systemInfo", "metrics", "security", "stream", "export",
  "request", "requestRaw"
];

assert.equal(inventory.schemaVersion, 1);
assert.equal(inventory.runtimeCertification, "unverified");
assert.deepEqual(inventory.documentationBaselines, { "8": "8.11", "9": "9.11", "10": "10.1" });
assert.ok(Array.isArray(inventory.entries) && inventory.entries.length >= requiredMethods.length);

const ids = new Set();
const methods = new Set();
for (const entry of inventory.entries) {
  assert.ok(entry.id && !ids.has(entry.id), `Missing or duplicate API inventory id: ${entry.id}`);
  ids.add(entry.id);
  methods.add(entry.clientMethod);
  assert.equal(entry.methodImplemented, true, `Missing implementation flag for ${entry.id}`);
  assert.ok(["partial", "complete", "generic-by-design"].includes(entry.typeCoverage));
  assert.ok(["present", "partial", "missing"].includes(entry.unitTests));
  assert.ok(["not-run", "partial", "tested"].includes(entry.integrationTests), `Invalid integration test status for ${entry.id}`);
  assert.ok(entry.documentation && existsSync(entry.documentation), `Missing documentation for ${entry.id}`);
  assert.ok(Array.isArray(entry.testFiles) && entry.testFiles.length > 0);
  for (const file of entry.testFiles) assert.ok(existsSync(file), `Missing test file ${file} for ${entry.id}`);
  for (const major of majors) assert.ok(["tested", "unverified"].includes(entry.versions?.[major]), `Invalid Solr ${major} status for ${entry.id}`);
  if (entry.integrationTests === "tested") {
    for (const major of majors) assert.equal(entry.versions?.[major], "tested", `Missing Solr ${major} integration evidence for ${entry.id}`);
  }
  if (entry.integrationTests === "not-run") {
    for (const major of majors) assert.equal(entry.versions?.[major], "unverified", `Unexpected Solr ${major} evidence for ${entry.id}`);
  }
}

for (const method of requiredMethods) assert.ok(methods.has(method), `API inventory is missing ${method}`);
console.log(`Validated ${inventory.entries.length} API inventory entries.`);
