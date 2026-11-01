import assert from "node:assert/strict";
import type { SolrJsonQueryResponse } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

interface FacetDocument {
  id: string;
  category_s: string;
  price_d: number;
  inStock_b: boolean;
}

interface ProductFacetResponse {
  count: number;
  categories: {
    buckets: { val: string; count: number; averagePrice: number }[];
  };
  expensive: { count: number; maxPrice: number };
  priceRanges: { buckets: { val: number; count: number }[] };
}

integrationTest("JSON Facet API supports nested terms, query, range, metrics, and domain changes", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const ids = [createId("json_facet"), createId("json_facet"), createId("json_facet")];
  await addDocuments([
    { id: ids[0]!, category_s: "books", price_d: 15, inStock_b: true },
    { id: ids[1]!, category_s: "books", price_d: 35, inStock_b: false },
    { id: ids[2]!, category_s: "music", price_d: 75, inStock_b: true }
  ]);
  await commit();

  const result = await client.queryJson<SolrJsonQueryResponse<FacetDocument, ProductFacetResponse>>({
    query: "*:*",
    filter: "{!tag=stock}inStock_b:true",
    limit: 0,
    facet: {
      categories: {
        type: "terms",
        field: "category_s",
        limit: 10,
        sort: "count desc",
        domain: { excludeTags: "stock" },
        facet: { averagePrice: "avg(price_d)" }
      },
      expensive: {
        type: "query",
        q: "price_d:[50 TO *]",
        facet: { maxPrice: "max(price_d)" }
      },
      priceRanges: {
        type: "range",
        field: "price_d",
        start: 0,
        end: 100,
        gap: 10,
        facet: { averagePrice: "avg(price_d)" }
      }
    }
  });

  const categoryBuckets = result.facets?.categories.buckets;
  assert.ok(categoryBuckets);
  assert.deepEqual(categoryBuckets.map(bucket => [bucket.val, bucket.count]), [["books", 2], ["music", 1]]);
  assert.equal(categoryBuckets.find(bucket => bucket.val === "books")?.averagePrice, 25);
  assert.equal(result.facets?.expensive.count, 1);
  assert.equal(result.facets?.expensive.maxPrice, 75);
  assert.ok(result.facets?.priceRanges.buckets.some(bucket => bucket.val === 10 && bucket.count === 1));
  assert.ok(result.facets?.priceRanges.buckets.some(bucket => bucket.val === 70 && bucket.count === 1));
});
