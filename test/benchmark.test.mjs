import test from "node:test";
import assert from "node:assert/strict";
import { createJsonArrayStream, measure, runConcurrent, summarizeLatencies } from "../bench/lib.mjs";

async function readStream(stream) {
  const reader = stream.getReader();
  const chunks = [];
  const decoder = new TextDecoder();
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    chunks.push(decoder.decode(item.value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join("");
}

test("benchmark latency summary reports nearest-rank percentiles", () => {
  assert.deepEqual(summarizeLatencies([5, 1, 4, 2, 3]), {
    count: 5, minMs: 1, meanMs: 3, p50Ms: 3, p95Ms: 5, p99Ms: 5, maxMs: 5
  });
});

test("benchmark latency summary handles an empty sample", () => {
  assert.deepEqual(summarizeLatencies([]), {
    count: 0, minMs: null, meanMs: null, p50Ms: null, p95Ms: null, p99Ms: null, maxMs: null
  });
});

test("JSON array stream emits valid compact JSON and handles an empty iterable", async () => {
  async function* documents() {
    yield { id: "one", value: 1 };
    yield { id: "two", value: "text" };
  }
  assert.equal(await readStream(createJsonArrayStream(documents())), '[{"id":"one","value":1},{"id":"two","value":"text"}]');
  assert.equal(await readStream(createJsonArrayStream((async function* () {})())), "[]");
});

test("JSON array stream closes the source iterator on cancellation", async () => {
  let closed = false;
  async function* documents() {
    try {
      yield { id: "one" };
      yield { id: "two" };
    } finally {
      closed = true;
    }
  }
  const reader = createJsonArrayStream(documents()).getReader();
  await reader.read();
  await reader.read();
  await reader.cancel();
  assert.equal(closed, true);
});

test("JSON array stream rejects unserializable values and closes its source", async () => {
  let closed = false;
  async function* documents() {
    try {
      yield undefined;
    } finally {
      closed = true;
    }
  }
  const reader = createJsonArrayStream(documents()).getReader();
  await reader.read();
  await assert.rejects(reader.read(), /serialize to JSON/);
  assert.equal(closed, true);
});

test("measurement captures CPU, memory, event-loop, and operation result", async () => {
  const measured = await measure(async () => "measured");
  assert.equal(measured.result, "measured");
  assert.ok(Number.isFinite(measured.elapsedMs));
  assert.ok(Number.isFinite(measured.cpuUserMs));
  assert.ok(Number.isFinite(measured.cpuSystemMs));
  for (const key of [
    "rssBeforeBytes", "rssAfterBytes", "rssPeakSampledBytes",
    "heapUsedBeforeBytes", "heapUsedAfterBytes", "heapUsedDeltaBytes"
  ]) assert.ok(Number.isFinite(measured.memory[key]), key);
  assert.ok(
    measured.eventLoopDelay.meanMs === null || Number.isFinite(measured.eventLoopDelay.meanMs)
  );
  assert.ok(
    measured.eventLoopDelay.maxMs === null || Number.isFinite(measured.eventLoopDelay.maxMs)
  );
});

test("concurrent runner executes each task once and records latency", async () => {
  const seen = [];
  const result = await runConcurrent(7, 3, async (index) => {
    seen.push(index);
    await Promise.resolve();
    return index * 2;
  });
  assert.deepEqual(seen.sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(result.results, [0, 2, 4, 6, 8, 10, 12]);
  assert.equal(result.latenciesMs.length, 7);
  assert.ok(result.elapsedMs >= 0);
});
