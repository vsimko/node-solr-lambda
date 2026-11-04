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

integrationTest("Solr 10.1 Export includes stored-only fields when requested", async ({
  client,
  createId,
  addDocuments,
  addSchemaField,
  commit
}) => {
  // includeStoredFields is a Solr 10.1 feature; do not infer support on Solr 8/9.
  if (process.env.SOLR_VERSION !== "10.1.0") return;

  const id = createId("export_stored");
  const storedField = createId("export_stored_field");
  const sortField = createId("export_stored_sort");
  const storedValue = createId("stored_value");

  await addSchemaField(storedField, "string", false);
  await addSchemaField(sortField, "pint", true);
  await addDocuments([{ id, [storedField]: storedValue, [sortField]: 1 }]);
  await commit();

  const response = await client.export({
    q: `id:${id}`,
    fl: [storedField, sortField],
    sort: `${sortField} asc`,
    includeStoredFields: true,
    wt: "json"
  });

  assert.equal(response.ok, true);
  const body = await response.text();
  assert.ok(body.includes(storedValue), "includeStoredFields should return the stored-only field value");
});
