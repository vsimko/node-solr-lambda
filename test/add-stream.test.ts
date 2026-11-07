import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createSolrClient, SolrAbortError, SolrHttpError, SolrNetworkError, SolrTimeoutError, SolrValidationError } from "../src/index.js";

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
      assert.ok(produced < 20, "the producer must not eagerly materialize the entire input");
      await new Promise(resolve => setTimeout(resolve, 5));
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

test("addStream applies bounded pull-based backpressure to a slow request consumer", async () => {
  let produced = 0;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    fetch: async (_input, init) => {
      const reader = (init?.body as ReadableStream<Uint8Array>).getReader();
      assert.equal(new TextDecoder().decode((await reader.read()).value), "[");
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(produced, 1, "only the single queued document may be produced ahead");
      const firstDocument = await reader.read();
      assert.match(new TextDecoder().decode(firstDocument.value), /"id":"slow-0"/);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(produced, 2, "the one-chunk queue must not drain the remaining source");
      const secondDocument = await reader.read();
      assert.match(new TextDecoder().decode(secondDocument.value), /"id":"slow-1"/);
      await readRemaining(reader);
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    for (let index = 0; index < 100; index++) {
      produced++;
      yield { id: `slow-${index}` };
    }
  }

  await client.addStream(documents());
  assert.equal(produced, 100);
});

async function readRemaining(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  while (true) {
    const next = await reader.read();
    if (next.done) return;
  }
}

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
    assert.ok(error instanceof SolrNetworkError);
    assert.equal((error.cause as Error).message, "producer failed");
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
      )?.replace(/"__BIGINT__(\\d+)"/g, "$1")
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

test("addStream applies input validation to each document before serialization", async () => {
  let requestBody = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    validation: {
      inputs: {
        addStream: z.object({ id: z.string(), title_s: z.string().transform(value => value.toUpperCase()) })
      }
    },
    fetch: async (_input, init) => {
      requestBody = await readBody(init?.body);
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    yield { id: "validated", title_s: "lowercase" };
  }

  await client.addStream(documents());
  assert.deepEqual(JSON.parse(requestBody), [{ id: "validated", title_s: "LOWERCASE" }]);
});

test("addStream rejects an invalid document and closes the source iterator", async () => {
  let finalized = false;
  let fetchCalls = 0;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    validation: { inputs: { addStream: z.object({ id: z.string() }) } },
    fetch: async (_input, init) => {
      fetchCalls++;
      await readBody(init?.body);
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    try {
      yield { id: "valid" };
      yield { id: 42 };
    } finally {
      finalized = true;
    }
  }

  await assert.rejects(client.addStream(documents()), SolrValidationError);
  assert.equal(finalized, true);
  assert.equal(fetchCalls, 1);
});

test("addStream reuses configured auth, headers, and request-default parameters", async () => {
  let authorization: string | null = null;
  let customHeader: string | null = null;
  let contentType: string | null = null;
  let requestUrl: URL | undefined;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    auth: { type: "bearer", token: "stream-token" },
    headers: { "x-client": "shared-header" },
    requestDefaults: { params: { wt: "json", echoParams: "none" } },
    fetch: async (input, init) => {
      requestUrl = new URL(String(input));
      const headers = new Headers(init?.headers);
      authorization = headers.get("authorization");
      customHeader = headers.get("x-client");
      contentType = headers.get("content-type");
      await readBody(init?.body);
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    yield { id: "one" };
  }

  await client.addStream(documents(), {}, { headers: { "x-request": "request-header" } });
  assert.equal(authorization, "Bearer stream-token");
  assert.equal(customHeader, "shared-header");
  assert.equal(contentType, "application/json");
  assert.equal(requestUrl?.searchParams.get("wt"), "json");
  assert.equal(requestUrl?.searchParams.get("echoParams"), "none");
});

test("addStream timeout closes the source iterator and reports SolrTimeoutError", async () => {
  let finalized = false;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    timeoutMs: 10,
    fetch: async (_input, init) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    })
  });

  async function* documents() {
    try {
      let index = 0;
      while (true) yield { id: `timeout-${index++}` };
    } finally {
      finalized = true;
    }
  }

  await assert.rejects(client.addStream(documents()), SolrTimeoutError);
  assert.equal(finalized, true);
});

test("addStream cancellation closes the source async iterator", async () => {
  const abort = new AbortController();
  let finalized = false;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    fetch: async (_input, init) => {
      const reader = (init?.body as ReadableStream<Uint8Array>).getReader();
      await reader.read();
      await reader.read();
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

test("addStream closes the iterator when the Fetch consumer cancels the body", async () => {
  let finalized = false;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    fetch: async (_input, init) => {
      const reader = (init?.body as ReadableStream<Uint8Array>).getReader();
      await reader.read();
      await reader.read();
      await reader.cancel("consumer stopped reading");
      return new Response('{"responseHeader":{"status":0}}');
    }
  });

  async function* documents() {
    try {
      let index = 0;
      while (true) yield { id: `consumer-${index++}` };
    } finally {
      finalized = true;
    }
  }

  await client.addStream(documents());
  assert.equal(finalized, true);
});
