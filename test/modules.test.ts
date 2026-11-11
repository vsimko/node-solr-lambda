import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError } from "../src/index.js";

test("JSON query delegates to the query module", async () => {
  let url = "";
  let body = "";
  const client = createSolrClient({
    collection: "catalog",
    fetch: async (input, init) => {
      url = String(input);
      body = String(init?.body);
      return new Response(JSON.stringify({ response: { numFound: 0, docs: [] } }));
    }
  });
  await client.queryJson({ query: "title:solr", limit: 3 });
  assert.equal(new URL(url).pathname, "/solr/catalog/query");
  assert.equal(JSON.parse(body).query, "title:solr");
  assert.equal(JSON.parse(body).limit, 3);
});

test("delete delegates a Solr delete command to the update module", async () => {
  let url = "";
  let body = "";
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      url = String(input);
      body = String(init?.body);
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.delete({ query: "status:expired" });
  assert.equal(new URL(url).pathname, "/solr/catalog/update");
  assert.deepEqual(JSON.parse(body), { delete: { query: "status:expired" } });
});

test("Update API uses the documented JSON endpoints and typed success response", async () => {
  const calls: Array<{ path: string; body: unknown }> = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      calls.push({ path: new URL(String(input)).pathname, body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ responseHeader: { status: 0, QTime: 2 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  const single = await client.add({ id: "single", title_s: "single" });
  await client.add([{ id: "array-one" }, { id: "array-two" }]);
  await client.updateCommands({ add: { doc: { id: "command" }, overwrite: true } });

  assert.equal(single.responseHeader?.status, 0);
  assert.equal(single.responseHeader?.QTime, 2);
  assert.deepEqual(calls, [
    { path: "/solr/catalog/update/json/docs", body: { id: "single", title_s: "single" } },
    { path: "/solr/catalog/update", body: [{ id: "array-one" }, { id: "array-two" }] },
    { path: "/solr/catalog/update/json", body: { add: { doc: { id: "command" }, overwrite: true } } }
  ]);
});

test("Update API preserves Solr HTTP errors for failed mutations", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({
      error: { code: 400, msg: "Invalid update command" }
    }), { status: 400, headers: { "content-type": "application/json" } })
  });

  await assert.rejects(
    client.atomicUpdate({ id: "book-1", price: { inc: 1 } }),
    error => error instanceof SolrHttpError && error.status === 400
  );
});

test("Schema and Config modules use their own collection endpoints", async () => {
  const paths: string[] = [];
  const client = createSolrClient({
    collection: "catalog",
    fetch: async input => {
      paths.push(new URL(String(input)).pathname);
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  await client.schema({ "add-field": { name: "title", type: "string" } });
  await client.config({ "set-property": { "query.maxBooleanClauses": 2048 } });
  assert.deepEqual(paths, ["/solr/catalog/schema", "/solr/catalog/config"]);
});

test("Schema API returns the typed command envelope", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({
      responseHeader: { status: 0, QTime: 3 }
    }), { status: 200, headers: { "content-type": "application/json" } })
  });

  const result = await client.schema({ "add-field": { name: "sku", type: "string" } });
  assert.equal(result.responseHeader?.status, 0);
  assert.equal(result.responseHeader?.QTime, 3);
});

test("Schema field operations serialize add, replace, and delete commands", async () => {
  const bodies: unknown[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ responseHeader: { status: 0, QTime: 1 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  await client.schema({ "add-field": { name: "sku", type: "string", stored: true } });
  await client.schema({ "replace-field": { name: "sku", type: "text_general", stored: true } });
  await client.schema({ "delete-field": { name: "sku" } });

  assert.deepEqual(bodies, [
    { "add-field": { name: "sku", type: "string", stored: true } },
    { "replace-field": { name: "sku", type: "text_general", stored: true } },
    { "delete-field": { name: "sku" } }
  ]);
});

test("Schema field type operations serialize analyzer, tokenizer, filter, and similarity definitions", async () => {
  const bodies: unknown[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ responseHeader: { status: 0, QTime: 1 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  await client.schema({
    "add-field-type": {
      name: "text_en",
      class: "solr.TextField",
      analyzer: {
        tokenizer: { class: "solr.StandardTokenizerFactory" },
        filters: [{ class: "solr.LowerCaseFilterFactory" }]
      },
      similarity: { class: "solr.SchemaSimilarityFactory" }
    }
  });
  await client.schema({
    "replace-field-type": {
      name: "text_en",
      class: "solr.TextField",
      indexAnalyzer: { tokenizer: { class: "solr.KeywordTokenizerFactory" } },
      queryAnalyzer: { tokenizer: { class: "solr.StandardTokenizerFactory" } }
    }
  });
  await client.schema({ "delete-field-type": { name: "text_en" } });

  assert.deepEqual(bodies, [
    { "add-field-type": {
      name: "text_en",
      class: "solr.TextField",
      analyzer: {
        tokenizer: { class: "solr.StandardTokenizerFactory" },
        filters: [{ class: "solr.LowerCaseFilterFactory" }]
      },
      similarity: { class: "solr.SchemaSimilarityFactory" }
    } },
    { "replace-field-type": {
      name: "text_en",
      class: "solr.TextField",
      indexAnalyzer: { tokenizer: { class: "solr.KeywordTokenizerFactory" } },
      queryAnalyzer: { tokenizer: { class: "solr.StandardTokenizerFactory" } }
    } },
    { "delete-field-type": { name: "text_en" } }
  ]);
});

test("Schema dynamic and copy field operations serialize add, replace, and delete commands", async () => {
  const bodies: unknown[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ responseHeader: { status: 0, QTime: 1 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  await client.schema({ "add-dynamic-field": { name: "*_sku", type: "string", stored: true } });
  await client.schema({ "replace-dynamic-field": { name: "*_sku", type: "text_general", stored: true } });
  await client.schema({ "delete-dynamic-field": { name: "*_sku" } });
  await client.schema({ "add-copy-field": { source: "title", dest: ["text", "catchall"], maxChars: 128 } });
  await client.schema({ "delete-copy-field": { source: "title", dest: "text" } });

  assert.deepEqual(bodies, [
    { "add-dynamic-field": { name: "*_sku", type: "string", stored: true } },
    { "replace-dynamic-field": { name: "*_sku", type: "text_general", stored: true } },
    { "delete-dynamic-field": { name: "*_sku" } },
    { "add-copy-field": { source: "title", dest: ["text", "catchall"], maxChars: 128 } },
    { "delete-copy-field": { source: "title", dest: "text" } }
  ]);
});

test("Schema API preserves Solr HTTP failures", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({
      error: { code: 400, msg: "Field already exists" }
    }), { status: 400, headers: { "content-type": "application/json" } })
  });

  await assert.rejects(
    client.schema({ "add-field": { name: "sku", type: "string" } }),
    error => error instanceof SolrHttpError && error.status === 400
  );
});

test("System, Metrics, and Security modules share the transport", async () => {
  const calls: Array<{ path: string; method: string; query: string | null }> = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      const url = new URL(String(input));
      calls.push({ path: url.pathname, method: init?.method ?? "GET", query: url.searchParams.get("group") });
      return new Response(JSON.stringify({ ok: true }));
    }
  });
  await client.systemInfo();
  await client.metrics({ group: "jvm" });
  await client.security("authentication");
  await client.security("authorization", { "set-user-role": { reader: "read" } });
  assert.deepEqual(calls, [
    { path: "/solr/admin/info/system", method: "GET", query: null },
    { path: "/solr/admin/metrics", method: "GET", query: "jvm" },
    { path: "/solr/admin/authentication", method: "GET", query: null },
    { path: "/solr/admin/authorization", method: "POST", query: null }
  ]);
});

test("Streaming Expressions delegate to the advanced API module", async () => {
  let url = "";
  const client = createSolrClient({
    collection: "catalog",
    fetch: async input => {
      url = String(input);
      return new Response(JSON.stringify({ "result-set": { docs: [] } }));
    }
  });
  const result = await client.stream<{ "result-set": { docs: unknown[] } }>("search(catalog, q=*:*)");
  assert.deepEqual(result, { "result-set": { docs: [] } });
  const parsed = new URL(url);
  assert.equal(parsed.pathname, "/solr/catalog/stream");
  assert.equal(parsed.searchParams.get("expr"), "search(catalog, q=*:*)");
  assert.equal(parsed.searchParams.get("wt"), "json");
});

test("Security authentication request secrets are not copied into client HTTP error metadata", async () => {
  const password = "auth-secret-that-must-not-leak";
  const client = createSolrClient({
    baseUrl: "http://localhost:8983/solr",
    fetch: async (_input, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        "set-user": { alice: password }
      });
      return new Response(JSON.stringify({
        error: { code: 400, msg: "Authentication update rejected" }
      }), {
        status: 400,
        statusText: "Bad Request",
        headers: { "content-type": "application/json" }
      });
    }
  });

  await assert.rejects(
    client.security("authentication", { "set-user": { alice: password } }),
    error => {
      assert.ok(error instanceof SolrHttpError);
      assert.equal(error.message.includes(password), false);
      assert.equal(error.body.includes(password), false);
      assert.equal(JSON.stringify(error.payload).includes(password), false);
      assert.equal(JSON.stringify(error.solrError).includes(password), false);
      return true;
    }
  );
});
