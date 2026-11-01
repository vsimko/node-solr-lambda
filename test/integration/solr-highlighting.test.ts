import assert from "node:assert/strict";
import type { SolrQueryResponse } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

integrationTest("Solr returns highlighted snippets with configured tags and phrase settings", async ({
  client,
  createId,
  addDocuments,
  addSchemaField,
  commit
}) => {
  const id = createId("highlight");
  const field = `highlight_text_${createId("field")}`;
  await addSchemaField(field, "text_general");
  await addDocuments([{ id, [field]: "The quick brown fox jumps over the lazy dog" }]);
  await commit();

  const result = await client.query<SolrQueryResponse<{ id: string }>>({
    query: `${field}:quick`,
    fields: ["id"],
    highlighting: {
      fields: [field],
      method: "unified",
      snippets: 2,
      fragmentSize: 100,
      usePhraseHighlighter: true,
      highlightMultiTerm: true,
      encoder: "html",
      tagPre: "<mark>",
      tagPost: "</mark>"
    }
  });

  assert.deepEqual(result.response?.docs?.map(document => document.id), [id]);
  const snippets = result.highlighting?.[id]?.[field];
  assert.ok(snippets?.some(snippet => snippet.includes("<mark>quick</mark>")));
});
