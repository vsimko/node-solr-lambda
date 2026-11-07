import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError } from "../src/index.js";


const BIGINT_MARKER = "__SOLR_BIGINT__";

function createLosslessJsonCodec() {
  return {
    parse(text: string): unknown {
      let protectedText = "";
      let inString = false;
      let escaped = false;
      for (let i = 0; i < text.length;) {
        const char = text[i]!;
        if (inString) {
          protectedText += char;
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') inString = false;
          i++;
          continue;
        }
        if (char === '"') {
          inString = true;
          protectedText += char;
          i++;
          continue;
        }
        if (char === "-" || (char >= "0" && char <= "9")) {
          const match = text.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
          if (match) {
            const token = match[0];
            if (!token.includes(".") && !/[eE]/.test(token) && (BigInt(token) > BigInt(Number.MAX_SAFE_INTEGER) || BigInt(token) < BigInt(Number.MIN_SAFE_INTEGER))) {
              protectedText += JSON.stringify(BIGINT_MARKER + token);
            } else {
              protectedText += token;
            }
            i += token.length;
            continue;
          }
        }
        protectedText += char;
        i++;
      }
      return JSON.parse(protectedText, (_key, value: unknown) =>
        typeof value === "string" && value.startsWith(BIGINT_MARKER)
          ? BigInt(value.slice(BIGINT_MARKER.length))
          : value
      ) as unknown;
    },
    stringify(value: unknown): string | undefined {
      return JSON.stringify(value, (_key, item: unknown) =>
        typeof item === "bigint" ? BIGINT_MARKER + item.toString() : item
      )?.replace(/"__SOLR_BIGINT__(-?\d+)"/g, "$1");
    }
  };
}


test("query parameters preserve repeated values and serialize scalar types consistently", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test/proxy/solr/",
    core: "catalog / blue",
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  const date = new Date("2026-11-02T09:30:00.000Z");
  await client.query({
    query: "title:coffee & tea",
    params: {
      repeated: ["first value", "second/value"],
      enabled: false,
      disabled: true,
      empty: null,
      createdAfter: date,
      special: "a+b & c/d = 100%"
    }
  });

  const url = new URL(requestedUrl);
  assert.equal(url.origin, "https://solr.example.test");
  assert.equal(url.pathname, "/proxy/solr/catalog%20%2F%20blue/select");
  assert.equal(url.searchParams.get("q"), "title:coffee & tea");
  assert.deepEqual(url.searchParams.getAll("repeated"), ["first value", "second/value"]);
  assert.equal(url.searchParams.get("enabled"), "false");
  assert.equal(url.searchParams.get("disabled"), "true");
  assert.equal(url.searchParams.get("empty"), "null");
  assert.equal(url.searchParams.get("createdAfter"), "2026-11-02T09:30:00.000Z");
  assert.equal(url.searchParams.get("special"), "a+b & c/d = 100%");
});

test("URLSearchParams input is preserved without double encoding", async () => {
  let requestedUrl = "";
  const query = new URLSearchParams();
  query.append("fq", "category:coffee");
  query.append("fq", "status:active");
  query.append("q", "name:tea & coffee");

  const client = createSolrClient({
    baseUrl: "https://solr.example.test/solr",
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  await client.request("/solr/catalog/select", { query });
  const url = new URL(requestedUrl);
  assert.deepEqual(url.searchParams.getAll("fq"), ["category:coffee", "status:active"]);
  assert.equal(url.searchParams.get("q"), "name:tea & coffee");
});

test("request defaults serialize dates and nulls while explicit request values take precedence", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    requestDefaults: {
      params: {
        since: new Date("2026-01-01T00:00:00.000Z"),
        optional: null,
        page: 1
      }
    },
    fetch: async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  await client.request("/select", { query: { page: 2 } });
  const params = new URL(requestedUrl).searchParams;
  assert.equal(params.get("since"), "2026-01-01T00:00:00.000Z");
  assert.equal(params.get("optional"), "null");
  assert.equal(params.get("page"), "2");
});

test("invalid dates fail before a network request is sent", async () => {
  let fetchCalled = false;
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => {
      fetchCalled = true;
      return new Response("{}");
    }
  });

  await assert.rejects(
    client.request("/select", { query: { createdAfter: new Date(Number.NaN) } }),
    RangeError
  );
  assert.equal(fetchCalled, false);
});


test("long query parameters are transmitted intact without implicit GET-to-POST switching", async () => {
  let requestedUrl = "";
  let requestedMethod = "";
  const longQuery = `title:${"solr-client-".repeat(4_000)}`;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    collection: "catalog",
    fetch: async (input, init) => {
      requestedUrl = String(input);
      requestedMethod = String(init?.method);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });

  await client.query({ query: longQuery });

  const url = new URL(requestedUrl);
  assert.equal(requestedMethod, "GET");
  assert.equal(url.pathname, "/solr/catalog/select");
  assert.equal(url.searchParams.get("q"), longQuery);
});


test("custom JSON codec preserves 64-bit integers in nested success responses and arrays", async () => {
  const payload = '{"_version_":9007199254740993,"normal":42,"decimal":1.25,"nested":{"values":[1,9007199254740995,2.5]}}';
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    jsonCodec: createLosslessJsonCodec(),
    fetch: async () => new Response(payload, { headers: { "content-type": "application/json" } })
  });

  const result = await client.request<{
    _version_: bigint;
    normal: number;
    decimal: number;
    nested: { values: readonly (number | bigint)[] };
  }>("/solr/catalog/select");

  assert.equal(result._version_, 9007199254740993n);
  assert.equal(result.normal, 42);
  assert.equal(result.decimal, 1.25);
  assert.deepEqual(result.nested.values, [1, 9007199254740995n, 2.5]);
});

test("custom JSON codec serializes BigInt request values without precision loss", async () => {
  let requestBody = "";
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    jsonCodec: createLosslessJsonCodec(),
    fetch: async (_input, init) => {
      requestBody = String(init?.body);
      return new Response('{"responseHeader":{"status":0}}', { headers: { "content-type": "application/json" } });
    }
  });

  await client.request("/solr/catalog/update", {
    method: "POST",
    body: {
      add: [{ doc: { id: "book-1", _version_: 9007199254740993n, nested: { values: [1n, 2n] } } }]
    }
  });

  assert.match(requestBody, /"_version_":9007199254740993/);
  assert.match(requestBody, /"values":\[1,2\]/);
  assert.doesNotMatch(requestBody, /__SOLR_BIGINT__/);
});

test("custom JSON codec parses structured HTTP error payloads", async () => {
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    jsonCodec: createLosslessJsonCodec(),
    fetch: async () => new Response(
      '{"error":{"code":409,"msg":"version conflict","observedVersion":9007199254740993}}',
      { status: 409, statusText: "Conflict", headers: { "content-type": "application/json" } }
    )
  });

  await assert.rejects(
    client.request("/solr/catalog/update", { method: "POST", body: {} }),
    (error: unknown) => {
      assert.ok(error instanceof SolrHttpError);
      assert.equal(error.errorResponse?.error && typeof error.errorResponse.error === "object"
        ? error.errorResponse.error.observedVersion
        : undefined, 9007199254740993n);
      return true;
    }
  );
});

test("custom JSON codec falls back to the raw response text for malformed JSON", async () => {
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    jsonCodec: createLosslessJsonCodec(),
    fetch: async () => new Response('{"_version_":9007199254740993', {
      headers: { "content-type": "application/json" }
    })
  });

  const result = await client.request<string>("/solr/catalog/select");
  assert.equal(result, '{"_version_":9007199254740993');
});

test("native JSON remains the default when no custom codec is configured", async () => {
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    fetch: async () => new Response('{"_version_":9007199254740993}', {
      headers: { "content-type": "application/json" }
    })
  });

  const result = await client.request<{ _version_: number }>("/solr/catalog/select");
  assert.equal(result._version_, 9007199254740992);
});


test("client validates the configured JSON codec contract", () => {
  assert.throws(
    () => createSolrClient({
      baseUrl: "https://solr.example.test",
      jsonCodec: { parse: JSON.parse } as never
    }),
    /jsonCodec must provide parse\(\) and stringify\(\) functions/
  );
});
