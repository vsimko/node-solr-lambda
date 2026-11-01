import assert from "node:assert/strict";
import type { SolrQueryResponse } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

interface FacetDocument {
  id: string;
  category_s: string;
  price_d: number;
  created_dt: string;
}

integrationTest("Solr classic field, query, and numeric/date range facets return typed counts", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const ids = [createId("facet"), createId("facet"), createId("facet")];
  await addDocuments([
    { id: ids[0]!, category_s: "books", price_d: 15, created_dt: "2025-01-01T12:00:00Z" },
    { id: ids[1]!, category_s: "books", price_d: 35, created_dt: "2025-01-02T12:00:00Z" },
    { id: ids[2]!, category_s: "music", price_d: 75, created_dt: "2025-01-02T12:00:00Z" }
  ]);
  await commit();

  const result = await client.query<SolrQueryResponse<FacetDocument>>({
    query: `id:(${ids.join(" OR ")})`,
    limit: 0,
    facets: {
      fields: [{ field: "category_s", limit: 10, sort: "count", minCount: 1 }],
      queries: ["price_d:[10 TO 20]"],
      ranges: [
        { field: "price_d", start: 0, end: 100, gap: 10, hardEnd: true, other: "between" },
        {
          field: "created_dt",
          start: "2025-01-01T00:00:00Z",
          end: "2025-01-03T00:00:00Z",
          gap: "+1DAY",
          hardEnd: true
        }
      ]
    }
  });

  const categoryCounts = result.facet_counts?.facet_fields?.category_s;
  assert.ok(categoryCounts);
  assert.equal(categoryCounts[0], "books");
  assert.equal(categoryCounts[1], 2);
  assert.equal(categoryCounts[2], "music");
  assert.equal(categoryCounts[3], 1);
  assert.equal(result.facet_counts?.facet_queries?.["price_d:[10 TO 20]"], 1);

  const priceRanges = result.facet_counts?.facet_ranges?.price_d;
  assert.ok(priceRanges?.counts);
  assert.ok(priceRanges.counts.length > 0);
  assert.equal(priceRanges.between, 3);

  const dateRanges = result.facet_counts?.facet_ranges?.created_dt;
  assert.ok(dateRanges?.counts);
  assert.ok(dateRanges.counts.length > 0);
});
