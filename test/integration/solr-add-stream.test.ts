import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("addStream ingests a large async iterable without buffering the document array", async ({
  client,
  createId
}) => {
  const prefix = createId("stream-ingest");
  const total = 250;

  async function* documents() {
    for (let index = 0; index < total; index++) {
      yield {
        id: `${prefix}-${index}`,
        name_s: `streamed document ${index}`,
        sequence_i: index
      };
    }
  }

  const update = await client.addStream(documents());
  assert.equal(update.responseHeader?.status, 0);
  await client.commit();

  const result = await client.query<{ response: { numFound: number; docs: Array<{ id: string; sequence_i: number }> } }>({
    query: `id:${prefix}*`,
    limit: total,
    fields: ["id", "sequence_i"],
    sort: "sequence_i asc"
  });

  assert.equal(result.response.numFound, total);
  assert.equal(result.response.docs.length, total);
  assert.equal(result.response.docs[0]?.sequence_i, 0);
  assert.equal(result.response.docs.at(-1)?.sequence_i, total - 1);
}, 60_000);
