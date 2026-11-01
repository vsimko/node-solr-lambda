import assert from "node:assert/strict";
import { cloudIntegrationTest } from "./fixtures.js";

cloudIntegrationTest("Streaming Expressions search returns matching SolrCloud documents", async ({
  createCollection,
  clientForCollection
}) => {
  const collection = await createCollection("streaming");
  const client = clientForCollection(collection);
  const id = `streaming_${Date.now()}`;
  await client.add([{ id, title_s: "streaming-expression" }]);
  await client.commit({ waitSearcher: true });

  const result = await client.stream<{
    "result-set"?: { docs?: Array<{ id?: string }> };
  }>(`search(${collection}, q="id:${id}", fl="id", sort="id asc")`);

  const ids = result["result-set"]?.docs
    ?.map(document => document.id)
    .filter((value): value is string => typeof value === "string");
  assert.ok(ids?.includes(id), `streaming result should contain the matching document: ${JSON.stringify(result)}`);
});
