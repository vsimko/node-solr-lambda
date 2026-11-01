import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

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
