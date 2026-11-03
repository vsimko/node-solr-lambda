import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("JSON update commands delete documents by ID and query", async ({
  client,
  createId
}) => {
  const id = createId("json-delete-id");
  const group = createId("json-delete-group");
  const queryId = createId("json-delete-query");

  try {
    const insertedById = await client.updateCommands({
      add: { doc: { id, group_s: group } },
      commit: { waitSearcher: true, openSearcher: true }
    });
    assert.equal(insertedById.responseHeader?.status, 0);

    const deletedById = await client.updateCommands({
      delete: { id },
      commit: { waitSearcher: true }
    });
    assert.equal(deletedById.responseHeader?.status, 0);
    const byIdResult = await client.query<{ response?: { numFound?: number } }>({
      query: `id:${id}`,
      limit: 1
    });
    assert.equal(byIdResult.response?.numFound, 0);

    const insertedByQuery = await client.updateCommands({
      add: { doc: { id: queryId, group_s: group } },
      commit: { waitSearcher: true }
    });
    assert.equal(insertedByQuery.responseHeader?.status, 0);

    const deletedByQuery = await client.updateCommands({
      delete: { query: `group_s:"${group}"` },
      commit: { waitSearcher: true }
    });
    assert.equal(deletedByQuery.responseHeader?.status, 0);
    const byQueryResult = await client.query<{ response?: { numFound?: number } }>({
      query: `id:${queryId}`,
      limit: 1
    });
    assert.equal(byQueryResult.response?.numFound, 0);
  } finally {
    await client.delete([id, queryId]);
    await client.commit({ waitSearcher: true });
  }
});

integrationTest("JSON update optimize command preserves committed documents", async ({
  client,
  createId
}) => {
  const id = createId("json-optimize");

  try {
    const inserted = await client.updateCommands({
      add: { doc: { id, title_s: "optimize-command" } },
      commit: { waitSearcher: true }
    });
    assert.equal(inserted.responseHeader?.status, 0);

    const optimized = await client.updateCommands({
      optimize: { maxSegments: 1, waitSearcher: true }
    });
    assert.equal(optimized.responseHeader?.status, 0);

    const result = await client.query<{ response?: { docs?: Array<{ id: string }> } }>({
      query: `id:${id}`,
      fields: ["id"],
      limit: 1
    });
    assert.deepEqual(result.response?.docs, [{ id }]);
  } finally {
    await client.delete(id);
    await client.commit({ waitSearcher: true });
  }
});

integrationTest("JSON update rollback command discards pending documents", async ({
  client,
  createId
}) => {
  const id = createId("json-rollback");

  try {
    const inserted = await client.updateCommands({
      add: { doc: { id, title_s: "must-be-rolled-back" } }
    });
    assert.equal(inserted.responseHeader?.status, 0);

    const rolledBack = await client.updateCommands({ rollback: {} });
    assert.equal(rolledBack.responseHeader?.status, 0);

    // A subsequent hard commit makes an unrolled-back pending add observable.
    await client.commit({ waitSearcher: true });
    const result = await client.query<{ response?: { numFound?: number } }>({
      query: `id:${id}`,
      limit: 1
    });
    assert.equal(result.response?.numFound, 0);
  } finally {
    await client.delete(id);
    await client.commit({ waitSearcher: true });
  }
});
