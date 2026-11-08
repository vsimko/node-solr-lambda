import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const inventory = JSON.parse(readFileSync("docs/api-inventory.json", "utf8"));
const clientSource = readFileSync("src/client.ts", "utf8");
const transportSource = readFileSync("src/transport.ts", "utf8");
const majors = ["8", "9", "10"];

// Read only declarations inside the class; overloads collapse to one method name.
const declaredMethods = source => new Set(
  [...source.matchAll(/^  (?!(?:private|protected)\b)(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:<|\()/gm)]
    .map(match => match[1])
    .filter(name => name !== "constructor")
);
const transportClass = transportSource.slice(transportSource.indexOf("export class SolrTransport"));
const v2Source = readFileSync("src/v2.ts", "utf8");
const v2Methods = [...declaredMethods(v2Source)].map(name => `v2.${name}`);
const publicMethods = new Set([...declaredMethods(clientSource), ...declaredMethods(transportClass), ...v2Methods]);
const inventoryMethods = new Set(inventory.entries.map(entry => entry.clientMethod));

assert.equal(inventory.schemaVersion, 1);
assert.equal(inventory.runtimeCertification, "unverified");
assert.deepEqual(inventory.documentationBaselines, { "8": "8.11", "9": "9.11", "10": "10.1" });
assert.equal(new Set(inventory.entries.map(entry => entry.id)).size, inventory.entries.length,
  "API inventory ids must be unique");
assert.equal(inventoryMethods.size, publicMethods.size,
  "The inventory must cover every public client method exactly by method name");
assert.deepEqual([...inventoryMethods].sort(), [...publicMethods].sort(),
  "API inventory must cover the complete public client and transport method set");

for (const entry of inventory.entries) {
  assert.ok(entry.id, "Every inventory entry needs an id");
  assert.equal(entry.methodImplemented, true, `Missing implementation flag for ${entry.id}`);
  assert.ok(["partial", "complete", "generic-by-design"].includes(entry.typeCoverage));
  assert.ok(["present", "partial", "missing"].includes(entry.unitTests));
  assert.ok(["not-run", "partial", "tested"].includes(entry.integrationTests));
  assert.ok(entry.documentation && existsSync(entry.documentation), `Missing documentation for ${entry.id}`);
  assert.ok(Array.isArray(entry.testFiles) && entry.testFiles.length > 0);
  for (const file of entry.testFiles) assert.ok(existsSync(file), `Missing test file ${file} for ${entry.id}`);
  for (const major of majors) {
    assert.ok(["tested", "unverified"].includes(entry.versions?.[major]),
      `Invalid Solr ${major} status for ${entry.id}`);
  }
  if (entry.integrationTests === "tested") {
    for (const major of majors) assert.equal(entry.versions?.[major], "tested",
      `Missing Solr ${major} integration evidence for ${entry.id}`);
  }
  if (entry.integrationTests === "not-run") {
    for (const major of majors) assert.equal(entry.versions?.[major], "unverified",
      `Unexpected Solr ${major} evidence for ${entry.id}`);
  }
}
console.log(`Validated ${inventory.entries.length} API inventory entries across ${inventoryMethods.size} public client methods.`);
