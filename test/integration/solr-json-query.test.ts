import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("JSON Request API returns matching documents", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const id = createId("json_query");
  await addDocuments([{ id, title_s: "json-request-api" }]);
  await commit();

  const result = await client.queryJson<{
    response?: { numFound?: number; docs?: Array<{ id: string }> };
  }>({
    query: `id:${id}`,
    limit: 1,
    fields: ["id"]
  });

  assert.equal(result.response?.numFound, 1);
  assert.deepEqual(result.response?.docs?.map(document => document.id), [id]);
});
