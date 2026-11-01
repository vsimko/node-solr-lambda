import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("Export endpoint returns a raw response for a docValues field", async ({
  client,
  createId,
  addDocuments,
  addSchemaField,
  commit
}) => {
  const id = createId("export");
  const field = createId("export_sort");
  await addSchemaField(field, "pint", true);
  await addDocuments([{ id, [field]: 777 }]);
  await commit();

  const response = await client.export({
    q: `id:${id}`,
    fl: field,
    sort: `${field} asc`,
    wt: "json"
  });

  assert.equal(response.ok, true);
  const body = await response.text();
  assert.ok(body.includes("777"), "export stream should contain the docValues value");
});
