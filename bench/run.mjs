#!/usr/bin/env node
import { createSolrClient } from "../dist/esm/index.js";
import { cpus, release as osRelease, totalmem } from "node:os";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { createJsonArrayStream, measure, runConcurrent, summarizeLatencies } from "./lib.mjs";

const HELP = `Usage: npm run bench -- [options]

Options:
  --workload query|bulk|stream|all   Workload to run (default: all)
  --mode client|fetch|both           Compare the typed client with direct Fetch (default: both)
  --docs N                           Documents for bulk/stream workloads (default: 10000)
  --batch-size N                     Documents per bulk request (default: 500)
  --iterations N                     Query requests per mode (default: 100)
  --rows N                           Documents returned by each query (default: 10; use 0 for count-only)
  --concurrency N                    Concurrent requests (default: 4)
  --warmup N                         Query warm-up requests (default: 10)
  --payload-bytes N                  Approximate body string size per document (default: 256)
  --output PATH                      Write JSON report to a file instead of stdout
  --help                             Show this help

Environment:
  SOLR_BASE_URL      Solr base URL without a core/collection (default: http://127.0.0.1:8983/solr)
  SOLR_COLLECTION    Pre-created disposable collection (default: benchmark)
  SOLR_VERSION       Optional exact server version label for the report
  SOLR_USERNAME / SOLR_PASSWORD or SOLR_BEARER_TOKEN
  SOLR_TIMEOUT_MS    Request timeout (default: 120000)

Use a dedicated disposable collection. The script never creates or deletes collections.
`;

function parseArgs(argv) {
  const options = {
    workload: "all", mode: "both", docs: 10000, batchSize: 500,
    iterations: 100, rows: 10, concurrency: 4, warmup: 10, payloadBytes: 256, output: null
  };
  const names = new Map([
    ["--workload", "workload"], ["--mode", "mode"], ["--docs", "docs"],
    ["--batch-size", "batchSize"], ["--iterations", "iterations"], ["--rows", "rows"],
    ["--concurrency", "concurrency"], ["--warmup", "warmup"],
    ["--payload-bytes", "payloadBytes"], ["--output", "output"]
  ]);
  for (let i = 0; i < argv.length; i++) {
    const [flag, inlineValue] = argv[i].split("=", 2);
    if (flag === "--help" || flag === "-h") return { ...options, help: true };
    const key = names.get(flag);
    if (!key) throw new Error(`Unknown option: ${flag}`);
    const value = inlineValue ?? argv[++i];
    if (value === undefined) throw new Error(`Missing value for ${flag}`);
    options[key] = key === "output" || key === "workload" || key === "mode" ? value : Number(value);
  }
  for (const key of ["docs", "batchSize", "iterations", "concurrency"]) {
    if (!Number.isInteger(options[key]) || options[key] < 1) throw new RangeError(`--${key} must be a positive integer`);
  }
  for (const key of ["warmup", "payloadBytes", "rows"]) {
    if (!Number.isInteger(options[key]) || options[key] < 0) throw new RangeError(`--${key} must be a non-negative integer`);
  }
  if (!["query", "bulk", "stream", "all"].includes(options.workload)) throw new Error("Invalid --workload");
  if (!["client", "fetch", "both"].includes(options.mode)) throw new Error("Invalid --mode");
  return options;
}

function getGitCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}

function makeAuth() {
  if (process.env.SOLR_BEARER_TOKEN) {
    return { client: { type: "bearer", token: process.env.SOLR_BEARER_TOKEN }, header: `Bearer ${process.env.SOLR_BEARER_TOKEN}` };
  }
  if (process.env.SOLR_USERNAME) {
    const password = process.env.SOLR_PASSWORD ?? "";
    const token = Buffer.from(`${process.env.SOLR_USERNAME}:${password}`).toString("base64");
    return { client: { type: "basic", username: process.env.SOLR_USERNAME, password }, header: `Basic ${token}` };
  }
  return { client: undefined, header: undefined };
}

async function readJsonResponse(response, label) {
  const text = await response.text();
  let value;
  try { value = text.length ? JSON.parse(text) : null; }
  catch { throw new Error(`${label}: Solr returned non-JSON response (HTTP ${response.status})`); }
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}: ${JSON.stringify(value)}`);
  return value;
}

async function* generateDocuments(prefix, count, payload) {
  for (let index = 0; index < count; index++) {
    yield { id: `${prefix}-${index}`, title_s: `Benchmark document ${index}`, body_s: payload };
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { process.stdout.write(HELP); return; }

  const baseUrl = process.env.SOLR_BASE_URL || "http://127.0.0.1:8983/solr";
  const parsedBaseUrl = new URL(baseUrl);
  if (parsedBaseUrl.username || parsedBaseUrl.password) throw new Error("Do not put Solr credentials in SOLR_BASE_URL; use environment variables.");
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  const collection = process.env.SOLR_COLLECTION || "benchmark";
  const timeoutMs = Number(process.env.SOLR_TIMEOUT_MS || 120000);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("SOLR_TIMEOUT_MS must be a positive number");
  const auth = makeAuth();
  const headers = { accept: "application/json", ...(auth.header ? { authorization: auth.header } : {}) };
  const updateUrl = new URL(`${encodeURIComponent(collection)}/update`, normalizedBaseUrl);
  const selectUrl = new URL(`${encodeURIComponent(collection)}/select`, normalizedBaseUrl);
  const client = createSolrClient({
    baseUrl,
    collection,
    retry: false,
    timeoutMs,
    ...(auth.client ? { auth: auth.client } : {})
  });
  const payload = "x".repeat(options.payloadBytes);
  const runId = randomUUID().slice(0, 8);
  const modes = options.mode === "both" ? ["client", "fetch"] : [options.mode];
  const workloads = options.workload === "all" ? ["bulk", "stream", "query"] : [options.workload];
  const results = [];

  async function sendBulk(mode, docs) {
    if (mode === "client") return client.add(docs);
    return readJsonResponse(await fetch(updateUrl, {
      method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(docs),
      signal: AbortSignal.timeout(timeoutMs)
    }), "direct Fetch bulk update");
  }

  async function sendCommit(mode) {
    if (mode === "client") return client.commit({ waitSearcher: true });
    return readJsonResponse(await fetch(updateUrl, {
      method: "POST", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ commit: { waitSearcher: true } }), signal: AbortSignal.timeout(timeoutMs)
    }), "direct Fetch commit");
  }

  async function sendQuery(mode) {
    if (mode === "client") return client.query({ query: "*:*", limit: options.rows, params: { wt: "json" } });
    const url = new URL(selectUrl);
    url.searchParams.set("q", "*:*");
    url.searchParams.set("rows", String(options.rows));
    url.searchParams.set("wt", "json");
    return readJsonResponse(await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) }), "direct Fetch query");
  }

  for (const workload of workloads) {
    for (const mode of modes) {
      if (workload === "query") {
        for (let index = 0; index < options.warmup; index++) await sendQuery(mode);
      }
      const measured = await measure(async () => {
        if (workload === "bulk") {
          const batchCount = Math.ceil(options.docs / options.batchSize);
          const requests = await runConcurrent(batchCount, options.concurrency, async (batchIndex) => {
            const start = batchIndex * options.batchSize;
            const count = Math.min(options.batchSize, options.docs - start);
            const documents = Array.from({ length: count }, (_, index) => ({
              id: `bench-${runId}-bulk-${mode}-${start + index}`,
              title_s: `Benchmark document ${start + index}`,
              body_s: payload
            }));
            await sendBulk(mode, documents);
          });
          const commitStarted = performance.now();
          await sendCommit(mode);
          const commitMs = performance.now() - commitStarted;
          return {
            documents: options.docs, requests: batchCount,
            requestsPerSecond: batchCount / (requests.elapsedMs / 1000),
            documentsPerSecond: options.docs / (requests.elapsedMs / 1000),
            requestLatency: summarizeLatencies(requests.latenciesMs),
            commitMs
          };
        }

        if (workload === "stream") {
          const prefix = `bench-${runId}-stream-${mode}`;
          const started = performance.now();
          if (mode === "client") {
            await client.addStream(generateDocuments(prefix, options.docs, payload));
          } else {
            const body = createJsonArrayStream(generateDocuments(prefix, options.docs, payload));
            await readJsonResponse(await fetch(updateUrl, {
              method: "POST",
              headers: { ...headers, "content-type": "application/json" },
              body,
              duplex: "half",
              signal: AbortSignal.timeout(timeoutMs)
            }), "direct Fetch streaming update");
          }
          const ingestionMs = performance.now() - started;
          const commitStarted = performance.now();
          await sendCommit(mode);
          const commitMs = performance.now() - commitStarted;
          return {
            documents: options.docs,
            documentsPerSecond: options.docs / (ingestionMs / 1000),
            ingestionMs,
            commitMs
          };
        }

        const requests = await runConcurrent(options.iterations, options.concurrency, () => sendQuery(mode));
        return {
          requests: options.iterations, concurrency: options.concurrency, warmup: options.warmup,
          requestsPerSecond: options.iterations / (requests.elapsedMs / 1000),
          latency: summarizeLatencies(requests.latenciesMs)
        };
      });
      results.push({ workload, mode, ...measured });
    }
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    metadata: {
      node: process.version,
      v8: process.versions.v8,
      platform: process.platform,
      osRelease: osRelease(),
      arch: process.arch,
      totalMemoryBytes: totalmem(),
      cpuModel: cpus()[0]?.model || null,
      cpuCount: cpus().length,
      solrVersion: process.env.SOLR_VERSION || null,
      baseUrl: `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}${parsedBaseUrl.pathname}`,
      collection,
      gitCommit: getGitCommit(),
      runId
    },
    configuration: options,
    results
  };
  const json = JSON.stringify(report, null, 2) + "\n";
  if (options.output) {
    const outputPath = resolve(options.output);
    writeFileSync(outputPath, json);
    process.stdout.write(`Benchmark report written to ${outputPath}\n`);
  } else {
    process.stdout.write(json);
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
