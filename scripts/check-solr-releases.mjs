#!/usr/bin/env node
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const SOLR_RELEASE_INDEX_URL = "https://downloads.apache.org/solr/solr/";

export function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function parseSolrDirectoryListing(html) {
  const versions = new Set();
  for (const match of html.matchAll(/href=["'](\d+\.\d+\.\d+)\/["']/g)) {
    versions.add(match[1]);
  }
  return [...versions].sort(compareVersions);
}

export function parseSolrMatrixVersions(workflowYaml) {
  const matrices = [...workflowYaml.matchAll(/solr-version\s*:\s*\[([^\]]+)\]/g)];
  if (matrices.length === 0) throw new Error("No solr-version matrix found in .github/workflows/ci.yml");
  const versions = new Set();
  for (const matrix of matrices) {
    for (const match of matrix[1].matchAll(/["'](\d+\.\d+\.\d+)["']/g)) {
      versions.add(match[1]);
    }
  }
  if (versions.size === 0) throw new Error("The Solr CI matrix contains no exact version pins");
  return [...versions].sort(compareVersions);
}

export async function checkSolrReleases({ html, workflowYaml, fetchImpl = fetch } = {}) {
  const sourceUrl = process.env.SOLR_RELEASE_INDEX_URL || SOLR_RELEASE_INDEX_URL;
  const page = html ?? await (async () => {
    const response = await fetchImpl(sourceUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Apache Solr download index returned HTTP ${response.status}`);
    return response.text();
  })();
  const yaml = workflowYaml ?? readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
  const availableVersions = parseSolrDirectoryListing(page);
  if (availableVersions.length === 0) throw new Error("No stable Solr version directories found in the official download index");
  const configuredVersions = parseSolrMatrixVersions(yaml);
  const configured = new Set(configuredVersions);
  return {
    sourceUrl,
    availableVersions,
    configuredVersions,
    missingVersions: availableVersions.filter(version => compareVersions(version, configuredVersions.at(-1)) > 0 && !configured.has(version))
  };
}

async function main() {
  const report = await checkSolrReleases();
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    appendFileSync(outputPath, `missing_versions=${report.missingVersions.join(",")}\n`);
    appendFileSync(outputPath, `available_versions=${report.availableVersions.join(",")}\n`);
    appendFileSync(outputPath, `configured_versions=${report.configuredVersions.join(",")}\n`);
  }
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
