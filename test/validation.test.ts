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
