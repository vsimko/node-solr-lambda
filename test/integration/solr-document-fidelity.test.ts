import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("Solr JSON update preserves nested parent, child, and grandchild documents", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const parentId = createId("nested-parent");
  const childId = createId("nested-child");
  const grandchildId = createId("nested-grandchild");

  await addDocuments([{
    id: parentId,
    type_s: "parent",
    name_s: "parent document",
    children: [{
      id: childId,
      type_s: "child",
      name_s: "child document",
      grandchildren: [{
        id: grandchildId,
        type_s: "grandchild",
        name_s: "grandchild document"
      }]
    }]
  }]);
  await commit();

  const descendants = await client.query<{
    response?: {
      numFound?: number;
      docs?: Array<{ id: string; type_s: string }>;
    };
  }>({
    query: `_root_:${parentId}`,
    fields: ["id", "type_s"],
    sort: "id asc",
    limit: 10
  });

  assert.equal(descendants.response?.numFound, 3);
  assert.deepEqual(
    descendants.response?.docs?.map(document => document.id).sort(),
    [parentId, childId, grandchildId].sort()
  );
  assert.deepEqual(
    descendants.response?.docs?.map(document => document.type_s).sort(),
    ["child", "grandchild", "parent"]
  );
});

integrationTest("Solr JSON update preserves Unicode strings and multi-valued fields on read-back", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const id = createId("unicode");
  const title = "München – Žilina – 東京 – café ☕ 🚀";
  const description = "Zażółć gęślą jaźń; Ελληνικά; हिन्दी; 中文; العربية; 😀";
  const tags = ["český", "slovenský", "日本語", "emoji-🌍"];

  await addDocuments([{
    id,
    title_s: title,
    description_s: description,
    tags_ss: tags,
    enabled_b: true,
    rank_i: 42
  }]);
  await commit();

  const result = await client.query<{
    response?: {
      numFound?: number;
      docs?: Array<{
        id: string;
        title_s: string;
        description_s: string;
        tags_ss: string[];
        enabled_b: boolean;
        rank_i: number;
      }>;
    };
  }>({
    query: `id:${id}`,
    fields: ["id", "title_s", "description_s", "tags_ss", "enabled_b", "rank_i"],
    limit: 1
  });

  assert.equal(result.response?.numFound, 1);
  assert.deepEqual(result.response?.docs, [{
    id,
    title_s: title,
    description_s: description,
    tags_ss: tags,
    enabled_b: true,
    rank_i: 42
  }]);
});
