import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const repositoryRoot = process.cwd();
const consumerDir = mkdtempSync(join(tmpdir(), "node-solr-no-zod-"));

try {
  writeFileSync(join(consumerDir, "package.json"), JSON.stringify({ private: true, type: "module" }));

  const packOutput = execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", consumerDir],
    { cwd: repositoryRoot, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  );
  const [packageInfo] = JSON.parse(packOutput);
  const archive = join(consumerDir, packageInfo.filename);

  execFileSync(
    "npm",
    ["install", "--no-save", "--package-lock=false", "--ignore-scripts", archive],
    { cwd: consumerDir, stdio: "inherit" }
  );

  if (existsSync(join(consumerDir, "node_modules", "zod"))) {
    throw new Error("Zod was installed as a required runtime dependency");
  }

  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import { createSolrClient } from 'node-solr-lambda'; const client = createSolrClient(); if (typeof client.request !== 'function') throw new Error('Client import failed');"
    ],
    { cwd: consumerDir, stdio: "inherit" }
  );
} finally {
  rmSync(consumerDir, { recursive: true, force: true });
}
