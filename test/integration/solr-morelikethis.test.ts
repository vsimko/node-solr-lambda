import assert from "node:assert/strict";
import type { SolrQueryResponse } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

interface MoreLikeThisDocument {
  id: string;
  title_txt: string;
}

integrationTest("Solr MoreLikeThis component returns similar documents for each result", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const ids = [createId("mlt"), createId("mlt"), createId("mlt")];
  await addDocuments([
    { id: ids[0]!, title_txt: "distributed search engine architecture" },
    { id: ids[1]!, title_txt: "distributed search engine indexing" },
    { id: ids[2]!, title_txt: "distributed search engine query processing" }
  ]);
  await commit();

  const result = await client.query<SolrQueryResponse<MoreLikeThisDocument>>({
    query: `id:${ids[0]}`,
    fields: ["id", "title_txt"],
    moreLikeThis: {
      fields: ["title_txt"],
      count: 5,
      minTermFrequency: 0,
      minDocumentFrequency: 0
    }
  });

  assert.ok(result.response?.docs?.some(document => document.id === ids[0]));
  const similar = result.moreLikeThis?.[ids[0]!]?.docs;
  assert.ok(similar);
  assert.ok(similar.some(document => document.id === ids[1] || document.id === ids[2]));
});
