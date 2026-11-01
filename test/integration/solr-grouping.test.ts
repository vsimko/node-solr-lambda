import assert from "node:assert/strict";
import type { SolrQueryResponse } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

interface GroupedProduct {
  id: string;
  category_s: string;
  product_id_s: string;
  price_f: number;
}

integrationTest("Solr result grouping returns typed groups and collapse/expand selects group heads", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const ids = [createId("group"), createId("group"), createId("group"), createId("group")];
  await addDocuments([
    { id: ids[0]!, category_s: "books", product_id_s: "p1", price_f: 15 },
    { id: ids[1]!, category_s: "books", product_id_s: "p1", price_f: 35 },
    { id: ids[2]!, category_s: "music", product_id_s: "p2", price_f: 75 },
    { id: ids[3]!, category_s: "music", product_id_s: "p2", price_f: 50 }
  ]);
  await commit();

  const grouped = await client.query<SolrQueryResponse<GroupedProduct>>({
    query: `id:(${ids.join(" OR ")})`,
    grouping: {
      fields: "category_s",
      limit: 2,
      groupSort: "price_f desc",
      numGroups: true
    }
  });

  const fieldGroups = grouped.grouped?.category_s;
  assert.ok(fieldGroups?.groups);
  assert.equal(fieldGroups.ngroups, 2);
  assert.deepEqual(new Set(fieldGroups.groups.map(group => group.groupValue)), new Set(["books", "music"]));
  assert.equal(fieldGroups.groups.find(group => group.groupValue === "books")?.doclist?.docs?.[0]?.price_f, 35);
  assert.equal(fieldGroups.groups.find(group => group.groupValue === "music")?.doclist?.docs?.[0]?.price_f, 75);

  const collapsed = await client.query<SolrQueryResponse<GroupedProduct>>({
    query: `id:(${ids.join(" OR ")})`,
    fields: ["id", "category_s", "product_id_s", "price_f"],
    collapse: { field: "product_id_s", max: "price_f", nullPolicy: "collapse" },
    expand: { field: "product_id_s", rows: 2, sort: "price_f desc" }
  });

  const heads = collapsed.response?.docs ?? [];
  assert.equal(heads.length, 2);
  const headIds = heads.map(document => document.id);
  assert.ok(headIds.includes(ids[1]!));
  assert.ok(headIds.includes(ids[2]!));
  assert.equal(collapsed.expanded?.[ids[1]!]?.docs?.length, 2);
  assert.equal(collapsed.expanded?.[ids[2]!]?.docs?.length, 2);
});
