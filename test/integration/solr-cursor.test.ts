import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { SolrClient } from "../../src/index.js";
import type { SolrResponse } from "../../src/index.js";

const baseUrl = process.env.SOLR_BASE_URL;
const core = process.env.SOLR_CORE;

test("Solr cursorMark retrieves all matching documents across pages", {
  skip: !baseUrl || !core
}, async () => {
  const client = new SolrClient({ baseUrl: baseUrl!, core: core!, timeoutMs: 30_000 });
  const prefix = `cursor_${randomUUID().replaceAll("-", "")}`;
  const ids = [`${prefix}_a`, `${prefix}_b`, `${prefix}_c`];
  const query = ids.map(id => `id:${id}`).join(" OR ");
  const collected: string[] = [];
  let cursorMark = "*";
  let done = false;

  try {
    await client.add(ids.map(id => ({ id })));
    await client.commit({ waitSearcher: true });

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
  } finally {
    for (const id of ids) await client.delete({ id });
    await client.commit({ waitSearcher: true });
  }
});
