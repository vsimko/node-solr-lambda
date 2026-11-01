import assert from "node:assert/strict";
import type { SolrResponse } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

integrationTest("Solr cursorMark retrieves all matching documents across pages", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const ids = ["a", "b", "c"].map(suffix => createId(`cursor_${suffix}`));
  const query = ids.map(id => `id:${id}`).join(" OR ");
  const collected: string[] = [];
  let cursorMark = "*";
  let done = false;

  await addDocuments(ids.map(id => ({ id })));
  await commit();

  for (let pageNumber = 0; pageNumber < 10 && !done; pageNumber += 1) {
    const page = await client.query<SolrResponse<{ id: string }>>({
      query,
      cursorMark,
      sort: "id asc",
      fields: ["id"],
      limit: 2
    });

    assert.equal(page.responseHeader?.partialResults, undefined);
    assert.equal(typeof page.nextCursorMark, "string");
    collected.push(...(page.response?.docs ?? []).map(document => document.id));

    const nextCursorMark = page.nextCursorMark!;
    done = nextCursorMark === cursorMark;
    cursorMark = nextCursorMark;
  }

  assert.equal(done, true, "cursor should reach a stable terminal mark");
  assert.deepEqual(collected, [...ids].sort());
  assert.equal(new Set(collected).size, ids.length, "cursor pages must not contain duplicates");
});
