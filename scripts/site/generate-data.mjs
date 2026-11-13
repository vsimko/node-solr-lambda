import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repoUrl = "https://github.com/vsimko/solr-ts-client";
const iso = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("SITE_GENERATED_AT must be a valid ISO timestamp.");
  return date.toISOString();
};
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const src = (id, kind, url, retrievedAt, status) => ({ id, kind, url, retrievedAt, status });
const httpJson = async (fetchImpl, url, headers = {}) => {
  const response = await fetchImpl(url, { headers: { accept: "application/vnd.github+json", ...headers } });
  if (!response.ok) throw new Error("HTTP " + response.status + " for " + url);
  return response.json();
};
const optional = async (fetchImpl, url, headers) => {
  try { return { status: "available", value: await httpJson(fetchImpl, url, headers) }; }
  catch (error) { return { status: "unavailable", value: null, error: error.message }; }
};
function normalizeSnapshot(key, value) {
  if (key === "github-actions") return { workflow_runs: (value.workflow_runs || []).map((run) => ({
    id: run.id, name: run.name, event: run.event, status: run.status, conclusion: run.conclusion,
    html_url: run.html_url, head_sha: run.head_sha, head_branch: run.head_branch,
    run_started_at: run.run_started_at, created_at: run.created_at, updated_at: run.updated_at
  })) };
  if (key === "github-issues") return [];
  if (key === "npm-registry") return {
    "dist-tags": value["dist-tags"] || {}, time: value.time || {},
    versions: Object.fromEntries(Object.keys(value.versions || {}).map((version) => [version, true]))
  };
  if (key === "npm-downloads") return { downloads: value.downloads };
  if (key === "github-releases") return (value || []).map((item) => ({
    tag_name: item.tag_name, draft: item.draft, published_at: item.published_at, html_url: item.html_url
  }));
  if (key === "github-tags") return (value || []).map((item) => ({ name: item.name }));
  if (key.startsWith("issue-")) return {
    number: value.number, state: value.state, title: value.title,
    labels: (value.labels || []).map((label) => typeof label === "string" ? label : label.name),
    milestone: value.milestone ? { title: value.milestone.title } : null,
    pull_request: value.pull_request ? { url: value.pull_request.url } : undefined
  };
  if (key.startsWith("pull-")) return { merged: Boolean(value.merged) };
  return value;
}

export function normalizeApiInventory(inventory) {
  return inventory.entries.map((entry, index) => {
    const versions = Object.keys(entry.versions || {}).filter((key) => ["8", "9", "10"].includes(key));
    const tested = versions.filter((key) => entry.versions[key] === "tested");
    const status = !entry.methodImplemented ? "unsupported" :
      tested.length === versions.length && tested.length > 0 ? "verified" :
      tested.length > 0 || entry.integrationTests === "partial" ? "partial" :
      entry.integrationTests === "not-run" ? "unverified" : "unknown";
    return {
      id: entry.id, operationId: entry.id, area: entry.area, method: entry.clientMethod, status, versions,
      versionEvidence: entry.versions || {}, implementation: entry.methodImplemented ? "implemented" : "not-covered",
      typeCoverage: entry.typeCoverage, unitTests: entry.unitTests, integrationTests: entry.integrationTests,
      evidence: { sourceIds: ["api-inventory"], path: "docs/api-inventory.json", pointer: "/entries/" + index, description: entry.notes || entry.id },
      documentation: entry.documentation, testFiles: entry.testFiles || []
    };
  });
}

export function parseDocumentationCatalogue(markdown) {
  const records = [];
  const seen = new Set();
  for (const match of markdown.matchAll(/^\s*- \[([^\]]+)\]\(([^)]+)\)/gm)) {
    const title = match[1], target = match[2];
    if (/^(https?:|#|mailto:)/i.test(target)) continue;
    const path = target.split("#")[0];
    if (!path || (!path.endsWith(".md") && !path.endsWith(".json"))) continue;
    const fullPath = path.startsWith("docs/") ? path : "docs/" + path;
    if (seen.has(fullPath)) continue;
    seen.add(fullPath);
    records.push({ id: fullPath, title, path: fullPath, url: repoUrl + "/blob/master/" + fullPath, owner: "authored" });
  }
  return records;
}

export async function generateSiteData({ asOf, token, fetchImpl = fetch } = {}) {
  const generatedAt = iso(asOf);
  const packageJson = readJson("package.json");
  const inventory = readJson("docs/api-inventory.json");
  const docsIndex = readFileSync(resolve(root, "docs/index.md"), "utf8");
  const roadmap = readFileSync(resolve(root, "docs/roadmap.md"), "utf8");
  const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");
  const ciWorkflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const headers = token ? { authorization: "Bearer " + token } : {};
  const snapshotPath = resolve(root, "build/site-snapshots.json");
  let snapshots = {};
  try { snapshots = JSON.parse(readFileSync(snapshotPath, "utf8")); } catch {}
  const matrixValues = (key) => {
    const match = ciWorkflow.match(new RegExp("^\\s+" + key + ": \\[(.*)\\]$", "m"));
    if (!match) return [];
    return match[1].split(",").map((value) => value.trim().replace(/^["']|["']$/g, "")).map((value) => /^\d+$/.test(value) ? Number(value) : value);
  };
  const configuredMatrix = [
    { dimension: "node", values: matrixValues("node"), sourcePath: ".github/workflows/ci.yml" },
    { dimension: "solr-version", values: matrixValues("solr-version"), sourcePath: ".github/workflows/ci.yml" }
  ].filter((item) => item.values.length > 0);
  const start = new Date(Date.parse(generatedAt) - 6 * 86400000).toISOString().slice(0, 10);
  const end = generatedAt.slice(0, 10);
  const endpoints = [
    ["github-actions", "https://api.github.com/repos/vsimko/solr-ts-client/actions/runs?per_page=20", headers],
    ["github-issues", "https://api.github.com/repos/vsimko/solr-ts-client/issues?state=all&per_page=100", headers],
    ["npm-registry", "https://registry.npmjs.org/solr-ts-client", {}],
    ["npm-downloads", "https://api.npmjs.org/downloads/point/" + start + ":" + end + "/solr-ts-client", {}],
    ["github-releases", "https://api.github.com/repos/vsimko/solr-ts-client/releases?per_page=50", headers],
    ["github-tags", "https://api.github.com/repos/vsimko/solr-ts-client/tags?per_page=50", headers]
  ];
  const results = await Promise.all(endpoints.map(async (item) => {
    const fresh = await optional(fetchImpl, item[1], item[2]);
    const key = item[0];
    if (fresh.status === "available") {
      snapshots[key] = { value: normalizeSnapshot(key, fresh.value), retrievedAt: generatedAt, url: item[1] };
      return { ...fresh, retrievedAt: generatedAt, url: item[1] };
    }
    const cached = snapshots[key];
    if (cached?.value && cached.retrievedAt) return { status: "stale", value: cached.value, retrievedAt: cached.retrievedAt, url: cached.url || item[1], error: fresh.error };
    return { ...fresh, retrievedAt: generatedAt };
  }));
  const lookup = Object.fromEntries(results.map((item, index) => [endpoints[index][0], item]));
  const sources = [
    src("package", "repository", repoUrl + "/blob/master/package.json", generatedAt, "available"),
    src("api-inventory", "repository", repoUrl + "/blob/master/docs/api-inventory.json", generatedAt, "available"),
    src("docs-index", "repository", repoUrl + "/blob/master/docs/index.md", generatedAt, "available"),
    src("roadmap", "repository", repoUrl + "/blob/master/docs/roadmap.md", generatedAt, "available"),
    src("changelog", "repository", repoUrl + "/blob/master/CHANGELOG.md", generatedAt, "available"),
    src("ci-workflow", "repository", repoUrl + "/blob/master/.github/workflows/ci.yml", generatedAt, "available")
  ];
  for (const item of endpoints) sources.push(src(item[0], item[0].startsWith("npm") ? "npm" : "github", lookup[item[0]].url || item[1], lookup[item[0]].retrievedAt, lookup[item[0]].status));
  const runs = (lookup["github-actions"].value?.workflow_runs || []).map((run) => ({
    id: String(run.id), runId: String(run.id), workflow: run.name || "GitHub Actions", event: run.event || "unknown",
    status: run.status, conclusion: run.conclusion || undefined, runUrl: run.html_url, commit: run.head_sha,
    ref: run.head_branch ? "refs/heads/" + run.head_branch : "unknown", startedAt: run.run_started_at || run.created_at,
    ...(run.status === "completed" ? { completedAt: run.updated_at } : {}), observed: true
  }));
  const roadmapNumbers = [...new Set([...roadmap.matchAll(/https:\/\/github\.com\/vsimko\/solr-ts-client\/(?:issues|pull)\/(\d+)/g)].map((m) => Number(m[1])))];
  const roadmapLookups = await Promise.all(roadmapNumbers.map(async (number) => {
    const key = "issue-" + number;
    const fresh = await optional(fetchImpl, "https://api.github.com/repos/vsimko/solr-ts-client/issues/" + number, headers);
    if (fresh.status === "available") {
      snapshots[key] = { value: normalizeSnapshot(key, fresh.value), retrievedAt: generatedAt, url: "https://api.github.com/repos/vsimko/solr-ts-client/issues/" + number };
      return { ...fresh, retrievedAt: generatedAt, url: "https://api.github.com/repos/vsimko/solr-ts-client/issues/" + number };
    }
    if (fresh.error?.includes("HTTP 404")) return { ...fresh, retrievedAt: generatedAt };
    const cached = snapshots[key];
    if (cached?.value && cached.retrievedAt) return { status: "stale", value: cached.value, retrievedAt: cached.retrievedAt, url: cached.url, error: fresh.error };
    return { ...fresh, retrievedAt: generatedAt };
  }));
  const roadmapRecords = lookup["github-issues"].value ? await Promise.all(roadmapNumbers.map(async (number, index) => {
    const issue = roadmapLookups[index].value;
    const roadmapLines = roadmap.split("\n");
    const lineIndex = roadmapLines.findIndex((row) => row.includes("/" + number + ")"));
    const line = lineIndex >= 0 ? roadmapLines[lineIndex] : "";
    let heading = "";
    for (let index = lineIndex; index >= 0; index--) {
      if (/^#{1,4}\s/.test(roadmapLines[index])) { heading = roadmapLines[index]; break; }
    }
    const context = (heading + " " + line).trim();
    const priority = /P1/i.test(context) ? "P1" : /P2/i.test(context) ? "P2" : /release gate/i.test(context) ? "P0" : "P3";
    const labels = issue?.labels?.map((label) => typeof label === "string" ? label : label.name) || [];
    let state = issue ? (labels.some((label) => label.toLowerCase() === "in progress" || label.toLowerCase() === "in-progress") ? "in-progress" : issue.state) :
      roadmapLookups[index].error?.includes("HTTP 404") ? "missing" : "unknown";
    if (issue?.pull_request) {
      const prKey = "pull-" + number;
      const freshPr = await optional(fetchImpl, "https://api.github.com/repos/vsimko/solr-ts-client/pulls/" + number, headers);
      if (freshPr.status === "available") snapshots[prKey] = { value: normalizeSnapshot(prKey, freshPr.value), retrievedAt: generatedAt };
      const pr = freshPr.status === "available" ? freshPr : (snapshots[prKey]?.value ? { status: "stale", value: snapshots[prKey].value } : freshPr);
      if (pr.value?.merged) state = "merged";
    }
    return {
      id: "github-" + number, number, url: repoUrl + "/issues/" + number, priority,
      state, title: issue?.title || "Unavailable GitHub item",
      labels, milestone: issue?.milestone?.title || null, isPullRequest: Boolean(issue?.pull_request),
      roadmapContext: context
    };
  })) : [];
  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, JSON.stringify(snapshots, null, 2) + "\n");
  const changelogStart = changelog.indexOf("## Unreleased");
  const changelogTail = changelogStart >= 0 ? changelog.slice(changelogStart + "## Unreleased".length) : "";
  const nextChangelogHeading = changelogTail.search(/^## /m);
  const unreleasedContent = (nextChangelogHeading >= 0 ? changelogTail.slice(0, nextChangelogHeading) : changelogTail).trim();
  const docs = parseDocumentationCatalogue(docsIndex).filter((item) => {
    try { readFileSync(resolve(root, item.path)); return true; } catch { return false; }
  });
  const npm = lookup["npm-registry"].value;
  const downloads = lookup["npm-downloads"].value?.downloads;
  const npmRecords = lookup["npm-registry"].status !== "unavailable" &&
    lookup["npm-downloads"].status !== "unavailable" && Number.isFinite(downloads) ? [{
    id: "npm-latest", packageName: packageJson.name, version: npm["dist-tags"]?.latest || packageJson.version,
    distTags: npm["dist-tags"] || {}, publishedAt: npm.time?.[npm["dist-tags"]?.latest] || null,
    downloads, window: "last-7-days",
    windowStart: new Date(lookup["npm-downloads"].url.match(/point\/([^:]+):/)[1] + "T00:00:00Z").toISOString(),
    windowEnd: new Date(lookup["npm-downloads"].url.match(/point\/[^:]+:([^/]+)/)[1] + "T23:59:59Z").toISOString(),
    sourceUrl: "https://www.npmjs.com/package/solr-ts-client", retrievedAt: lookup["npm-downloads"].retrievedAt
  }] : [];
  const releaseMap = new Map();
  for (const item of (lookup["github-releases"].value || [])) {
    if (!/^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(item.tag_name || "")) continue;
    const version = item.tag_name.replace(/^v/, "");
    releaseMap.set(item.tag_name, {
      id: item.tag_name, tag: item.tag_name, version, draft: Boolean(item.draft),
      ...(item.published_at ? { publishedAt: item.published_at } : {}), url: item.html_url,
      changelogUrl: repoUrl + "/blob/master/CHANGELOG.md", displayAsPublished: Boolean(item.published_at && !item.draft),
      npmPublished: Boolean(npm?.versions?.[version]), npmPublishedAt: npm?.time?.[version] || null, tagOnly: false
    });
  }
  for (const item of (lookup["github-tags"].value || [])) {
    const tag = item.name || "";
    if (!/^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag) || releaseMap.has(tag)) continue;
    const version = tag.replace(/^v/, "");
    releaseMap.set(tag, {
      id: tag, tag, version, draft: false, url: repoUrl + "/tree/" + tag,
      changelogUrl: repoUrl + "/blob/master/CHANGELOG.md", displayAsPublished: false,
      npmPublished: Boolean(npm?.versions?.[version]), npmPublishedAt: npm?.time?.[version] || null, tagOnly: true
    });
  }
  const releases = [...releaseMap.values()];
  const sourceStatus = (name) => lookup[name].status;
  return {
    schemaVersion: 1, generatedAt,
    package: { name: packageJson.name, repository: repoUrl, version: packageJson.version, source: "package.json" },
    sources,
    apiCoverage: { status: "available", sourceIds: ["api-inventory"], observedAt: generatedAt, records: normalizeApiInventory(inventory) },
    ci: { status: sourceStatus("github-actions"), sourceIds: ["github-actions", "ci-workflow"], observedAt: generatedAt, configuredMatrix, records: runs },
    roadmap: { status: sourceStatus("github-issues") === "unavailable" ? "unavailable" : (sourceStatus("github-issues") === "available" && roadmapLookups.every((item) => item.status === "available") ? "available" : "stale"), sourceIds: ["roadmap", "github-issues"], observedAt: generatedAt, records: lookup["github-issues"].value ? roadmapRecords : [] },
    npm: { status: npmRecords.length === 0 ? "unavailable" : (sourceStatus("npm-registry") === "available" && sourceStatus("npm-downloads") === "available" ? "available" : "stale"), sourceIds: ["npm-registry", "npm-downloads"], observedAt: generatedAt, records: npmRecords },
    releases: { status: releases.length === 0 && sourceStatus("github-releases") === "unavailable" && sourceStatus("github-tags") === "unavailable" ? "unavailable" : (sourceStatus("github-releases") === "available" && sourceStatus("github-tags") === "available" ? "available" : "stale"), sourceIds: ["github-releases", "github-tags", "npm-registry", "changelog"], observedAt: generatedAt, unreleased: { sourceId: "changelog", path: "CHANGELOG.md", url: repoUrl + "/blob/master/CHANGELOG.md", content: unreleasedContent, observedAt: generatedAt }, records: releases },
    documentation: { status: "available", sourceIds: ["docs-index"], observedAt: generatedAt, records: docs }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.env.SITE_GENERATED_AT) throw new Error("Set SITE_GENERATED_AT to an explicit ISO timestamp.");
  const data = await generateSiteData({ asOf: process.env.SITE_GENERATED_AT, token: process.env.GITHUB_TOKEN });
  const output = resolve(root, "build/site-data.json");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(data, null, 2) + "\n");
  console.log("Generated " + output + " at " + data.generatedAt);
}
