import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("Solr JSON update supports single documents, document arrays, and command objects", async ({
  client,
  createId
}) => {
  const singleId = createId("json-single");
  const arrayId1 = createId("json-array");
  const arrayId2 = createId("json-array");
  const commandId = createId("json-command");

  await client.add({ id: singleId, name_s: "single" });
  await client.add([
    { id: arrayId1, name_s: "array-one" },
    { id: arrayId2, name_s: "array-two" }
  ]);
  await client.updateCommands({
    add: { doc: { id: commandId, name_s: "command" }, overwrite: true },
    commit: {}
  });

  for (const [id, name] of [[singleId, "single"], [arrayId1, "array-one"], [arrayId2, "array-two"], [commandId, "command"]] as const) {
    const result = await client.query<{ response?: { numFound?: number; docs?: Array<{ id: string; name_s: string }> } }>({
      query: `id:${id}`,
      fields: ["id", "name_s"],
      limit: 1
    });
    assert.equal(result.response?.numFound, 1);
    assert.deepEqual(result.response?.docs, [{ id, name_s: name }]);
  }
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
