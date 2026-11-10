import assert from "node:assert/strict";
import type { SolrQueryResponse } from "../../src/types.js";
import { integrationTest } from "./fixtures.js";

integrationTest("RealTime Get reads uncommitted documents by one ID and multiple IDs", async ({
  client,
  createId,
  addDocuments
}) => {
  const singleId = createId("realtime-get-single");
  const multiId1 = createId("realtime-get-multi");
  const multiId2 = createId("realtime-get-multi");

  await addDocuments([
    { id: singleId, name_s: "single" },
    { id: multiId1, name_s: "multi-one" },
    { id: multiId2, name_s: "multi-two" }
  ]);

  const searcherView = await client.query<SolrQueryResponse<{ id: string; name_s: string }>>({
    query: `id:${singleId}`,
    limit: 1
  });
  assert.equal(searcherView.response?.numFound, 0);

  const single = await client.get<{ id: string; name_s: string }>({
    id: singleId,
    fields: ["id", "name_s"]
  });
  assert.equal(single.doc?.id, singleId);
  assert.equal(single.doc?.name_s, "single");

  const multiple = await client.get<{ id: string; name_s: string }>({
    ids: [multiId1, multiId2],
    fields: ["id", "name_s"]
  });
  assert.equal(multiple.response?.numFound, 2);
  assert.deepEqual(
    multiple.response?.docs?.map(document => document.id).sort(),
    [multiId1, multiId2].sort()
  );
});
