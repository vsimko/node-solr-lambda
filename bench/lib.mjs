import { monitorEventLoopDelay, performance } from "node:perf_hooks";

export function summarizeLatencies(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return { count: 0, minMs: null, meanMs: null, p50Ms: null, p95Ms: null, p99Ms: null, maxMs: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction) => sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)];
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    count: values.length,
    minMs: sorted[0],
    meanMs: total / values.length,
    p50Ms: percentile(0.50),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    maxMs: sorted[sorted.length - 1]
  };
}

export async function runConcurrent(count, concurrency, task) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("count must be a positive integer");
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError("concurrency must be a positive integer");
  const results = new Array(count);
  const latenciesMs = new Array(count);
  const started = performance.now();
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= count) return;
      const started = performance.now();
      results[index] = await task(index);
      latenciesMs[index] = performance.now() - started;
    }
  }

  await Promise.all(Array.from({ length: Math.min(count, concurrency) }, () => worker()));
  return { results, latenciesMs, elapsedMs: performance.now() - started };
}

export function createJsonArrayStream(iterable) {
  if (!iterable || typeof iterable[Symbol.asyncIterator] !== "function") {
    throw new TypeError("A JSON array stream requires an AsyncIterable");
  }
  const iterator = iterable[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  let opened = false;
  let first = true;
  let closed = false;

  return new ReadableStream({
    async pull(controller) {
      try {
        if (!opened) {
          opened = true;
          controller.enqueue(encoder.encode("["));
          return;
        }
        const item = await iterator.next();
        if (item.done) {
          if (!closed) {
            closed = true;
            controller.enqueue(encoder.encode("]"));
            controller.close();
          }
          return;
        }
        const json = JSON.stringify(item.value);
        if (json === undefined) throw new TypeError("A streamed document must serialize to JSON");
        controller.enqueue(encoder.encode((first ? "" : ",") + json));
        first = false;
      } catch (error) {
        try { await iterator.return?.(error); } catch {}
        controller.error(error);
      }
    },
    async cancel(reason) {
      try { await iterator.return?.(reason); } catch {}
    }
  });
}

export async function measure(operation) {
  const before = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
  let peakRssBytes = before.rss;
  const eventLoop = monitorEventLoopDelay({ resolution: 10 });
  eventLoop.enable();
  const sampler = setInterval(() => {
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  }, 20);
  sampler.unref();

  const started = performance.now();
  try {
    const result = await operation();
    const elapsedMs = performance.now() - started;
    const after = process.memoryUsage();
    const cpu = process.cpuUsage(cpuBefore);
    eventLoop.disable();
    return {
      elapsedMs,
      cpuUserMs: cpu.user / 1000,
      cpuSystemMs: cpu.system / 1000,
      memory: {
        rssBeforeBytes: before.rss,
        rssAfterBytes: after.rss,
        rssPeakSampledBytes: Math.max(peakRssBytes, after.rss),
        heapUsedBeforeBytes: before.heapUsed,
        heapUsedAfterBytes: after.heapUsed,
        heapUsedDeltaBytes: after.heapUsed - before.heapUsed
      },
      eventLoopDelay: {
        meanMs: Number.isFinite(eventLoop.mean) ? eventLoop.mean / 1e6 : null,
        maxMs: Number.isFinite(eventLoop.max) ? eventLoop.max / 1e6 : null
      },
      result
    };
  } finally {
    clearInterval(sampler);
    eventLoop.disable();
  }
}


/** Summarize parsed Solr query payload size and useful response counts. */
export function summarizeQueryResponse(value) {
  const response = value && typeof value === "object" ? value.response : undefined;
  const docs = response && typeof response === "object" && Array.isArray(response.docs)
    ? response.docs
    : [];
  const facetFields = value?.facet_counts?.facet_fields;
  const facetValueCount = facetFields && typeof facetFields === "object"
    ? Object.values(facetFields).reduce((total, buckets) =>
      total + (Array.isArray(buckets) ? Math.floor(buckets.length / 2) : 0), 0)
    : 0;
  return {
    responseBytes: Buffer.byteLength(JSON.stringify(value)),
    documentsReturned: docs.length,
    numFound: Number.isFinite(response?.numFound) ? response.numFound : null,
    facetValueCount
  };
}
