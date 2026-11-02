import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("Solr atomic updates modify only the selected fields on the pinned server", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  interface AtomicDocument {
    id: string;
    name_s: string;
    rank_i: number;
    tags_ss: string[];
  }
  const id = createId("atomic");
  await addDocuments([{ id, name_s: "before", rank_i: 5, tags_ss: ["existing"] }]);
  await commit();

  await client.atomicUpdate<AtomicDocument>({
    id,
    name_s: { set: "after" },
    rank_i: { inc: 2 },
    tags_ss: { "add-distinct": "new" }
  });
  await commit();

  const result = await client.query<{
    response?: { numFound?: number; docs?: Array<{ id: string; name_s: string; rank_i: number; tags_ss: string[] }> };
  }>({
    query: `id:${id}`,
    fields: ["id", "name_s", "rank_i", "tags_ss"],
    limit: 10
  });

  assert.equal(result.response?.numFound, 1);
  assert.deepEqual(result.response?.docs, [{ id, name_s: "after", rank_i: 7, tags_ss: ["existing", "new"] }]);
});

integrationTest("Solr atomic updates modify only the selected fields on the pinned server", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  interface AtomicDocument {
    id: string;
    name_s: string;
    rank_i: number;
    tags_ss: string[];
  }
  const id = createId("atomic");
  await addDocuments([{ id, name_s: "before", rank_i: 5, tags_ss: ["existing"] }]);
  await commit();

  await client.atomicUpdate<AtomicDocument>({
    id,
    name_s: { set: "after" },
    rank_i: { inc: 2 },
    tags_ss: { "add-distinct": "new" }
  });
  await commit();

  const result = await client.query<{
    response?: { numFound?: number; docs?: Array<{ id: string; name_s: string; rank_i: number; tags_ss: string[] }> };
  }>({
    query: `id:${id}`,
    fields: ["id", "name_s", "rank_i", "tags_ss"],
    limit: 10
  });

  assert.equal(result.response?.numFound, 1);
  assert.deepEqual(result.response?.docs, [{ id, name_s: "after", rank_i: 7, tags_ss: ["existing", "new"] }]);
});

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
