import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("soft commit makes pending updates searchable", async ({
  client,
  createId,
  addDocuments
}) => {
  const id = createId("soft_commit");
  await addDocuments([{ id, label_s: "visible-after-soft-commit" }]);
  await client.softCommit();

  const result = await client.query<{ response?: { docs?: Array<{ id: string }> } }>({
    query: `id:${id}`,
    fields: ["id"],
    limit: 1
  });
  assert.deepEqual(result.response?.docs?.map(document => document.id), [id]);
});

integrationTest("rollback discards an update that has not been committed", async ({
  client,
  createId,
  commit
}) => {
  const id = createId("rollback");
  await client.add({ id, label_s: "must-be-rolled-back" });
  await client.rollback();
  await commit();

  const result = await client.query<{ response?: { numFound?: number } }>({
    query: `id:${id}`,
    fields: ["id"],
    limit: 1
  });
  assert.equal(result.response?.numFound, 0);
});
