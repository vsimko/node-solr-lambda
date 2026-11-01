import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

  execFileSync(
    "npm",
    ["install", "--no-save", "--package-lock=false", "--ignore-scripts", archive],
    { cwd: consumerDir, stdio: "inherit" }
  );

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
