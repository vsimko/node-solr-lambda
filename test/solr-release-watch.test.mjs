import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkSolrReleases,
  compareVersions,
  parseSolrDirectoryListing,
  parseSolrMatrixVersions
} from "../scripts/check-solr-releases.mjs";

const listing = `
<html><body>
<a href="../">Parent Directory</a>
<a href="10.1.0/">10.1.0/</a>
<a href="9.11.0/">9.11.0/</a>
<a href="10.2.0-rc1/">10.2.0-rc1/</a>
<a href="solr-operator/">solr-operator/</a>
</body></html>`;

const workflow = `
jobs:
  integration:
    strategy:
      matrix:
        solr-version: ["8.11.4", "9.11.0", "10.1.0"]
  security-integration:
    strategy:
      matrix:
        solr-version: ["8.11.4", "9.11.0", "10.1.0"]
`;

test("Solr download parser extracts stable version directories and sorts numerically", () => {
  assert.deepEqual(parseSolrDirectoryListing(listing), ["9.11.0", "10.1.0"]);
  assert.equal(compareVersions("10.1.0", "9.11.0"), 1);
});

test("Solr matrix parser reads exact versions across all CI suites", () => {
  assert.deepEqual(parseSolrMatrixVersions(workflow), ["8.11.4", "9.11.0", "10.1.0"]);
});

test("release check reports only official versions absent from the pinned matrix", async () => {
  const result = await checkSolrReleases({ html: listing, workflowYaml: workflow });
  assert.deepEqual(result.availableVersions, ["9.11.0", "10.1.0"]);
  assert.deepEqual(result.configuredVersions, ["8.11.4", "9.11.0", "10.1.0"]);
  assert.deepEqual(result.missingVersions, []);
});

test("release check ignores older unpinned releases and flags only versions newer than the newest baseline", async () => {
  const html = listing.replace("</body>", '<a href="9.10.1/">9.10.1/</a><a href="10.2.0/">10.2.0/</a></body>');
  const result = await checkSolrReleases({ html, workflowYaml: workflow });
  assert.deepEqual(result.missingVersions, ["10.2.0"]);
});

test("release check fails closed when the official index has no stable version directories", async () => {
  await assert.rejects(
    checkSolrReleases({ html: "<html>temporary error</html>", workflowYaml: workflow }),
    /No stable Solr version directories/
  );
});

test("matrix parser fails closed when the CI matrix format changes unexpectedly", () => {
  assert.throws(() => parseSolrMatrixVersions("jobs: {}"), /No solr-version matrix/);
});


test("CI keeps pinned Solr baselines parseable and candidate qualification opt-in", () => {
  const ciWorkflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.deepEqual(parseSolrMatrixVersions(ciWorkflow), ["8.11.4", "9.11.0", "10.1.0"]);
  assert.equal(
    [...ciWorkflow.matchAll(/include: \$\{\{ fromJSON\(needs\.changes\.outputs\.solr_matrix_include\) \}\}/g)].length,
    3
  );
  assert.match(ciWorkflow, /candidate_solr_version:/);
  assert.match(ciWorkflow, /downloads\.apache\.org\/solr\/solr\/\$CANDIDATE_SOLR_VERSION/);
});
