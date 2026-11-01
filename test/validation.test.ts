import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createSolrClient, SolrValidationError } from "../src/index.js";

test("input validation can transform query parameters", async () => {
  let requestedUrl = "";
  const client = createSolrClient({
    core: "catalog",
    validation: { inputs: { query: z.object({ q: z.string().transform((value) => value.toUpperCase()) }) } },
    fetch: async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ response: { numFound: 0 } }));
    }
  });
  await client.query({ query: "book" });
  assert.equal(new URL(requestedUrl).searchParams.get("q"), "BOOK");
});

test("input validation rejects invalid data before sending a request", async () => {
  let fetchCalls = 0;
  const client = createSolrClient({
    core: "catalog",
    validation: { inputs: { query: z.object({ q: z.string().min(1) }) } },
    fetch: async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ response: { numFound: 0 } }));
    }
  });

  await assert.rejects(client.query({ query: "" }), (error: unknown) => {
    assert.ok(error instanceof SolrValidationError);
    assert.equal(error.operation, "query");
    assert.equal(error.issues.length, 1);
    return true;
  });
  assert.equal(fetchCalls, 0);
});

test("async schema refinements are awaited before the request", async () => {
  let requestedQuery = "";
  const client = createSolrClient({
    core: "catalog",
    validation: {
      inputs: {
        query: z.object({ q: z.string().refine(async value => value === "ASYNC") })
      }
    },
    fetch: async input => {
      requestedQuery = new URL(String(input)).searchParams.get("q") ?? "";
      return new Response(JSON.stringify({ response: { numFound: 0 } }));
    }
  });

  await client.query({ query: "ASYNC" });
  assert.equal(requestedQuery, "ASYNC");
});

test("a throwing schema is wrapped with its original cause", async () => {
  const cause = new Error("schema implementation failed");
  const throwingSchema = {
    safeParseAsync: async () => { throw cause; }
  };
  const client = createSolrClient({
    core: "catalog",
    validation: { inputs: { query: throwingSchema } },
    fetch: async () => new Response(JSON.stringify({ response: { numFound: 0 } }))
  });

  await assert.rejects(client.query({ query: "*:*" }), (error: unknown) => {
    assert.ok(error instanceof SolrValidationError);
    assert.equal(error.operation, "query");
    assert.deepEqual(error.issues, []);
    assert.equal(error.cause, cause);
    return true;
  });
});

test("onError ignore returns original data after a schema rejection", async () => {
  let requestedQuery = "";
  const client = createSolrClient({
    core: "catalog",
    validation: {
      inputs: { query: z.object({ q: z.string().min(5) }) },
      onError: "ignore"
    },
    fetch: async input => {
      requestedQuery = new URL(String(input)).searchParams.get("q") ?? "";
      return new Response(JSON.stringify({ response: { numFound: 0 } }));
    }
  });

  await client.query({ query: "abc" });
  assert.equal(requestedQuery, "abc");
});

test("output validation rejects an invalid response", async () => {
  const client = createSolrClient({
    core: "catalog",
    validation: { outputs: { ping: z.object({ status: z.literal("ok") }) } },
    fetch: async () => new Response(JSON.stringify({ status: "not-ok" }))
  });
  await assert.rejects(client.ping(), SolrValidationError);
});

test("validation is disabled when no schema is configured", async () => {
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({ arbitrary: true }))
  });
  assert.deepEqual(await client.ping(), { arbitrary: true });
});

test("validation does not call schemas when no operation schema is configured", async () => {
  let parseCalls = 0;
  const unusedSchema = {
    safeParseAsync: async (value: unknown) => {
      parseCalls += 1;
      return { success: true as const, data: value };
    }
  };
  const client = createSolrClient({
    core: "catalog",
    validation: { inputs: { unused: unusedSchema }, outputs: { unused: unusedSchema } },
    fetch: async () => new Response(JSON.stringify({ status: "ok" }))
  });

  await client.ping();
  assert.equal(parseCalls, 0);
});
