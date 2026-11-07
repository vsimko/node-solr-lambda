import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient, SolrHttpError } from "../src/index.js";

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

  await assert.rejects(client.addStream(documents()), /producer failed/);
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
