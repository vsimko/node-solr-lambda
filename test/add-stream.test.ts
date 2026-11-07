import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient, SolrAbortError, SolrHttpError, SolrTimeoutError, SolrValidationError } from "../src/index.js";

async function readBody(body: BodyInit | null | undefined): Promise<string> {
  assert.ok(body && typeof body === "object" && "getReader" in body);
  const reader = (body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    text += decoder.decode(next.value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

test("addStream emits a JSON array incrementally and reuses update parameters", async () => {
  let requestBody = "";
  let requestUrl: URL | undefined;
  let produced = 0;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    fetch: async (input, init) => {
      requestUrl = new URL(String(input));
      assert.equal((init as RequestInit & { duplex?: string }).duplex, "half");
      const reader = (init?.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      const first = await reader.read();
      assert.equal(decoder.decode(first.value), "[");
      await new Promise(resolve => setTimeout(resolve, 5));
      assert.equal(produced, 1, "only one document may be queued while the consumer is paused");
      requestBody = "[" + decoder.decode((await reader.read()).value);
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        requestBody += decoder.decode(next.value);
      }
      return new Response('{"responseHeader":{"status":0}}', {
        headers: { "content-type": "application/json" }
      });
    }
  });

  async function* documents() {
    for (let i = 0; i < 20; i++) {
      produced++;
      yield { id: `stream-${i}`, title_s: `Document ${i}` };
    }
  }

  const response = await client.addStream(documents(), { commitWithin: 500, route: "shard-a" });
  assert.equal(response.responseHeader?.status, 0);
  assert.deepEqual(JSON.parse(requestBody), Array.from({ length: 20 }, (_, i) => ({
    id: `stream-${i}`,
    title_s: `Document ${i}`
  })));
  assert.equal(requestUrl?.pathname, "/solr/catalog/update");
  assert.equal(requestUrl?.searchParams.get("commitWithin"), "500");
  assert.equal(requestUrl?.searchParams.get("_route_"), "shard-a");
  assert.equal(produced, 20);
});

test("addStream sends an empty iterable as a valid empty JSON array", async () => {
  let requestBody = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    fetch: async (_input, init) => {
      requestBody = await readBody(init?.body);
      return new Response('{"responseHeader":{"status":0}}', {
        headers: { "content-type": "application/json" }
      });
    }
  });

  async function* empty(): AsyncGenerator<never> {}
  await client.addStream(empty());
  assert.equal(requestBody, "[]");
});

test("addStream propagates producer failures and closes the iterator", async () => {
  let finalized = false;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    fetch: async (_input, init) => {
      await readBody(init?.body);
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    try {
      yield { id: "first" };
      throw new Error("producer failed");
    } finally {
      finalized = true;
    }
  }

  await assert.rejects(client.addStream(documents()), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, "producer failed");
    return true;
  });
  assert.equal(finalized, true);
});

test("addStream does not retry a consumed streaming POST body", async () => {
  let calls = 0;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    retry: { maxAttempts: 3, methods: ["POST"] },
    fetch: async (_input, init) => {
      calls++;
      await readBody(init?.body);
      return new Response('{"error":"unavailable"}', {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "content-type": "application/json" }
      });
    }
  });

  async function* documents() {
    yield { id: "one" };
  }

  await assert.rejects(client.addStream(documents()), SolrHttpError);
  assert.equal(calls, 1);
});

test("addStream serializes each document with the configured JSON codec", async () => {
  let requestBody = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    jsonCodec: {
      parse: text => JSON.parse(text),
      stringify: value => JSON.stringify(value, (_key, item: unknown) =>
        typeof item === "bigint" ? `__BIGINT__${item}` : item
      )?.replace(/"__BIGINT__(\d+)"/g, "$1")
    },
    fetch: async (_input, init) => {
      requestBody = await readBody(init?.body);
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    yield { id: "versioned", _version_: 9007199254740993n };
  }

  await client.addStream(documents());
  assert.match(requestBody, /"_version_":9007199254740993/);
});


test("addStream cancellation closes the source async iterator", async () => {
  const abort = new AbortController();
  let finalized = false;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    fetch: async (_input, init) => {
      const reader = (init?.body as ReadableStream<Uint8Array>).getReader();
      await reader.read(); // opening JSON array delimiter
      await reader.read(); // ensure the async generator has started and yielded a document
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", async () => {
          await reader.cancel();
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
        abort.abort("stop streaming");
      });
    }
  });

  async function* documents() {
    try {
      let index = 0;
      while (true) yield { id: `cancel-${index++}` };
    } finally {
      finalized = true;
    }
  }

  await assert.rejects(client.addStream(documents(), {}, { signal: abort.signal }), SolrAbortError);
  assert.equal(finalized, true);
});


test("addStream does not acquire the iterator when Fetch never consumes the body", async () => {
  let iteratorAcquired = false;
  const source: AsyncIterable<{ [key: string]: unknown; id: string }> = {
    [Symbol.asyncIterator]() {
      iteratorAcquired = true;
      return {
        async next() { return { done: true as const, value: undefined }; }
      };
    }
  };
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    fetch: async () => new Response('{"responseHeader":{"status":0}}')
  });

  await client.addStream(source);
  assert.equal(iteratorAcquired, false);
});

test("addStream preserves per-document validation errors instead of wrapping them as network errors", async () => {
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    validation: {
      inputs: {
        addStream: {
          async safeParseAsync() {
            return { success: false as const, error: { issues: [{ path: ["id"], message: "required" }] } };
          }
        }
      }
    },
    fetch: async (_input, init) => {
      await readBody(init?.body);
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    yield { id: "invalid" };
  }

  await assert.rejects(client.addStream(documents()), error => {
    assert.ok(error instanceof SolrValidationError);
    return true;
  });
});

test("addStream timeout interrupts a pending iterator.next() and settles the request", async () => {
  let release!: () => void;
  let finalized = false;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    timeoutMs: 20,
    fetch: async (_input, init) => {
      await readBody(init?.body);
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    try {
      await new Promise<void>(resolve => { release = resolve; });
      yield { id: "after-timeout" };
    } finally {
      finalized = true;
    }
  }

  await assert.rejects(client.addStream(documents()), SolrTimeoutError);
  release();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(finalized, true);
});
