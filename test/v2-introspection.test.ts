import { createSolrClient } from "../src/index.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchV2Introspection } from "./helpers/v2-introspection.js";

test("V2 introspection helper appends the introspection suffix without generating types", async () => {
  let requested = "";
  const payload = { methods: ["GET", "POST"], documentation: "fixture-only" };
  const client = createSolrClient({
    fetch: async input => {
      requested = String(input);
      return new Response(JSON.stringify(payload));
    }
  });

  const result = await fetchV2Introspection(client, "/api/collections/");
  assert.equal(new URL(requested).pathname, "/solr/api/collections/_introspect");
  assert.deepEqual(result, payload);
});

test("V2 introspection helper rejects the API root", async () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  await assert.rejects(
    fetchV2Introspection(client, "/api/" as `/api/${string}`),
    /resource path below \/api/
  );
});
