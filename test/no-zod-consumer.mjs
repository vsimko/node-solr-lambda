import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { npmDistTagForVersion } from "../scripts/release-policy.mjs";

const repositoryRoot = process.cwd();
const consumerDir = mkdtempSync(join(tmpdir(), "node-solr-package-consumer-"));

try {
  writeFileSync(join(consumerDir, "package.json"), JSON.stringify({ private: true, type: "module" }));

  const packOutput = execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", consumerDir],
    { cwd: repositoryRoot, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  );
  const [packageInfo] = JSON.parse(packOutput);
  const archive = join(consumerDir, packageInfo.filename);
  const packedFiles = new Set(packageInfo.files.map(file => file.path));
  const requiredFiles = [
    "package.json", "README.md", "LICENSE",
    "dist/esm/index.js", "dist/cjs/index.js",
    "dist/esm/index.d.ts", "dist/cjs/index.d.ts", "dist/types/index.d.ts"
  ];
  for (const path of requiredFiles) {
    assert.ok(packedFiles.has(path), `packed tarball is missing ${path}`);
  }
  for (const path of packedFiles) {
    assert.equal(
      ["src/", "test/", "scripts/", ".github/"].some(prefix => path.startsWith(prefix)),
      false,
      `development-only path was packed: ${path}`
    );
  }

  const packedManifest = JSON.parse(readFileSync(join(consumerDir, "package.json"), "utf8"));
  assert.equal(packedManifest.name, "node-solr-lambda");
  assert.equal(packedManifest.license, "MIT");
  assert.equal(packedManifest.engines?.node, "^20.0.0 || ^22.0.0 || ^24.0.0");
  assert.equal(packedManifest.peerDependenciesMeta?.zod?.optional, true);
  assert.equal(packedManifest.exports?.["."]?.import?.default, "./dist/esm/index.js");
  assert.equal(packedManifest.exports?.["."]?.require?.default, "./dist/cjs/index.js");
  assert.equal(packedManifest.exports?.["."]?.import?.types, "./dist/esm/index.d.ts");
  assert.equal(packedManifest.exports?.["."]?.require?.types, "./dist/cjs/index.d.ts");
  assert.equal(npmDistTagForVersion(packedManifest.version), "beta");
  assert.equal(npmDistTagForVersion("4.0.0"), "latest");
  assert.equal(npmDistTagForVersion("4.0.0-rc.1"), "rc");
  assert.throws(() => npmDistTagForVersion("4.0.0-dev.1"), /Unsupported prerelease channel/);

  execFileSync(
    "npm",
    ["install", "--no-save", "--package-lock=false", "--ignore-scripts", archive],
    { cwd: consumerDir, stdio: "inherit" }
  );

  const installedManifest = JSON.parse(readFileSync(join(consumerDir, "node_modules", "node-solr-lambda", "package.json"), "utf8"));
  assert.equal(installedManifest.name, packedManifest.name);
  assert.equal(installedManifest.version, packedManifest.version);

  const packageNodeModules = join(consumerDir, "node_modules", "node-solr-lambda", "node_modules");
  if (existsSync(join(consumerDir, "node_modules", "zod")) || existsSync(join(packageNodeModules, "zod"))) {
    throw new Error("Zod was installed as a required runtime dependency");
  }

  // ESM runtime export.
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import { createSolrClient } from 'node-solr-lambda'; const client = createSolrClient(); if (typeof client.request !== 'function') throw new Error('ESM import failed');"
    ],
    { cwd: consumerDir, stdio: "inherit" }
  );

  // CommonJS runtime export.
  execFileSync(
    process.execPath,
    [
      "-e",
      "const { createSolrClient } = require('node-solr-lambda'); const client = createSolrClient(); if (typeof client.request !== 'function') throw new Error('CommonJS require failed');"
    ],
    { cwd: consumerDir, stdio: "inherit" }
  );

  // Compile both ESM and CommonJS TypeScript consumers against the packed declarations.
  writeFileSync(join(consumerDir, "index.mts"), `import { createSolrClient, SolrHttpError, type RequestControlOptions } from "node-solr-lambda";
const client = createSolrClient({ collection: "catalog" });
const controls: RequestControlOptions = { timeoutMs: 500 };
void client.query({ query: "*:*" }, controls);
const error: SolrHttpError | undefined = undefined;
void error;
`);
  writeFileSync(join(consumerDir, "index.cts"), `import { createSolrClient, type RequestControlOptions } from "node-solr-lambda";
const client = createSolrClient({ collection: "catalog" });
const controls: RequestControlOptions = { timeoutMs: 500 };
void client.query({ query: "*:*" }, controls);
`);
  writeFileSync(join(consumerDir, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: ["node"],
      typeRoots: [join(repositoryRoot, "node_modules", "@types")]
    },
    files: ["index.mts", "index.cts"]
  }, null, 2));

  execFileSync(
    process.execPath,
    [join(repositoryRoot, "node_modules", "typescript", "bin", "tsc"), "--project", join(consumerDir, "tsconfig.json")],
    { cwd: consumerDir, stdio: "inherit" }
  );
} finally {
  rmSync(consumerDir, { recursive: true, force: true });
}
