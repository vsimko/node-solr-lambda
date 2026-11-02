import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("v3-to-v4 migration path supports client health, CRUD, and typed queries", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  await client.ping();

  const id = createId("migration_v4");
  const field = "migration_label_s";
  await addDocuments([{ id, [field]: "created-by-v4" }]);
  await commit();

  const created = await client.query<{
    response?: { docs?: Array<{ id: string; migration_label_s?: string }> };
  }>({
    query: `id:${id}`,
    fields: ["id", field],
    limit: 1
  });
  assert.deepEqual(created.response?.docs, [{ id, migration_label_s: "created-by-v4" }]);

  await client.update({ id, [field]: "updated-by-v4" });
  await commit();

  const updated = await client.query<{
    response?: { docs?: Array<{ id: string; migration_label_s?: string }> };
  }>({
    query: `id:${id}`,
    fields: ["id", field],
    limit: 1
  });
  assert.deepEqual(updated.response?.docs, [{ id, migration_label_s: "updated-by-v4" }]);

  await client.delete(id);
  await commit();

  const deleted = await client.query<{ response?: { numFound?: number } }>({
    query: `id:${id}`,
    fields: ["id"],
    limit: 1
  });
  assert.equal(deleted.response?.numFound, 0);
});
