import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("optimize compacts the index without losing committed documents", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const id = createId("optimize");
  await addDocuments([{ id, title_s: "optimize-integration" }]);
  await commit();

  await client.optimize(1);

  const result = await client.query<{ response?: { docs?: Array<{ id: string }> } }>({
    query: `id:${id}`,
    fields: ["id"],
    limit: 1
  });
  assert.deepEqual(result.response?.docs?.map(document => document.id), [id]);
});
