import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("Streaming Expressions search returns matching documents", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const id = createId("streaming");
  await addDocuments([{ id, title_s: "streaming-expression" }]);
  await commit();

  const result = await client.stream<{
    "result-set"?: { docs?: Array<{ id?: string }> };
  }>(`search(integration, q="id:${id}", fl="id", sort="id asc")`);

  const ids = result["result-set"]?.docs
    ?.map(document => document.id)
    .filter((value): value is string => typeof value === "string");
  assert.ok(ids?.includes(id), "streaming result should contain the matching document");
});
