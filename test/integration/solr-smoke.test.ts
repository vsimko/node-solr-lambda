import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";
import { fetchV2Introspection } from "../helpers/v2-introspection.js";

integrationTest("Solr supports basic add, commit, query, and delete operations", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const id = createId("integration");

  await addDocuments([{ id }]);
  await commit();

  const result = await client.query<{ response?: { docs?: Array<{ id: string }> } }>({
    query: `id:${id}`,
    fields: ["id"],
    limit: 10
  });

  assert.deepEqual(result.response?.docs?.map(document => document.id), [id]);
});

integrationTest("V2 query introspection and GET query work on the pinned Solr version", async ({ client }) => {
  const introspection = await fetchV2Introspection(client, "/api/c/integration/select");
  assert.equal(typeof introspection, "object");
  assert.notEqual(introspection, null);
  assert.ok(Object.keys(introspection).length > 0, "Solr must return a non-empty V2 introspection document");

  // Keep the exact server response available to capture immutable, version-labelled fixtures.
  console.log(`SOLR_V2_INTROSPECTION_FIXTURE ${process.env.SOLR_VERSION ?? "unknown"} ${JSON.stringify(introspection)}`);

  const response = await client.v2.request<{ response?: { numFound?: number } }>(
    "/api/c/integration/select",
    { method: "GET", query: { q: "*:*", rows: 0 } }
  );
  assert.equal(typeof response.response?.numFound, "number");
});
