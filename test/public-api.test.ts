import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient, SolrClient } from "../src/index.js";

test("SolrClient does not expose transport configuration or credentials as public instance properties", () => {
  const client = createSolrClient({
    collection: "catalog",
    auth: { type: "bearer", token: "secret-token" }
  });

  assert.equal("clientConfig" in client, false);
  assert.equal(Object.keys(client).includes("clientConfig"), false);
  assert.ok(client instanceof SolrClient);
  assert.equal(typeof client.request, "function");
  assert.equal(typeof client.requestRaw, "function");
});
