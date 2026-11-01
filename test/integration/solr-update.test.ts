import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("Solr update replaces an existing document on the pinned server", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const id = createId("update");

  await addDocuments([{ id, name_s: "before" }]);
  await commit();

  await client.update({ id, name_s: "after" });
  await commit();

  const result = await client.query<{
    response?: { numFound?: number; docs?: Array<{ id: string; name_s: string }> };
  }>({
    query: `id:${id}`,
    fields: ["id", "name_s"],
    limit: 10
  });

  assert.equal(result.response?.numFound, 1);
  assert.deepEqual(result.response?.docs, [{ id, name_s: "after" }]);
});
