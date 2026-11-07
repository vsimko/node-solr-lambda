import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const run = (args) => {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};

test("all website JavaScript modules parse before deployment", () => {
  run(["--check", "website/assets/dashboard.js"]);
  run(["--check", "website/assets/progress.js"]);
});

test("built website contains its dashboard module, dependency, and generated inventory", () => {
  const htmlPath = "dist-site/index.html";
  const dashboardPath = "dist-site/assets/dashboard.js";
  const progressPath = "dist-site/assets/progress.js";
  const dataPath = "dist-site/data/site-data.json";
  for (const path of [htmlPath, dashboardPath, progressPath, dataPath]) {
    assert.ok(existsSync(path), `Missing deployment artifact: ${path}`);
  }

  const html = readFileSync(htmlPath, "utf8");
  assert.match(html, /<script type="module" src="assets\/dashboard\.js"><\/script>/);
  for (const id of ["implementation-progress", "api-summary", "api-list", "api-search", "version-filter"]) {
    assert.match(html, new RegExp(`id="${id}"`), `Missing dashboard target: ${id}`);
  }

  const dashboard = readFileSync(dashboardPath, "utf8");
  assert.match(dashboard, /from ["']\.\/progress\.js["']/);
  assert.match(dashboard, /fetch\(["']data\/site-data\.json["']\)/);

  const data = JSON.parse(readFileSync(dataPath, "utf8"));
  assert.ok(Array.isArray(data.apiCoverage?.records), "Generated API inventory must be an array");
  assert.ok(data.apiCoverage.records.length > 0, "Generated API inventory must not be empty");
  assert.ok(Array.isArray(data.roadmap?.records), "Generated roadmap records must be an array");
});
