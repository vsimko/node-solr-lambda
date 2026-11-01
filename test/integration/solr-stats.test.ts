import assert from "node:assert/strict";
import type { SolrQueryResponse } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";

interface StatsDocument {
  id: string;
  category_s: string;
  price_d: number;
}

integrationTest("Solr Stats Component returns numeric statistics and facet breakdowns", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const ids = [createId("stats"), createId("stats"), createId("stats")];
  await addDocuments([
    { id: ids[0]!, category_s: "books", price_d: 15 },
    { id: ids[1]!, category_s: "books", price_d: 35 },
    { id: ids[2]!, category_s: "music", price_d: 75 }
  ]);
  await commit();

  const result = await client.query<SolrQueryResponse<StatsDocument>>({
    query: `id:(${ids.join(" OR ")})`,
    limit: 0,
    stats: {
      fields: [{ field: "price_d", percentiles: [50, 90], cardinality: 0.5, distinctValues: true, countDistinct: true }],
      facets: "category_s",
      calcDistinct: true
    }
  });

  const priceStats = result.stats?.stats_fields?.price_d;
  assert.ok(priceStats);
  assert.equal(priceStats.count, 3);
  assert.equal(priceStats.missing, 0);
  assert.equal(priceStats.min, 15);
  assert.equal(priceStats.max, 75);
  assert.equal(priceStats.sum, 125);
  assert.ok(Math.abs((priceStats.mean ?? 0) - 125 / 3) < 0.0001);
  assert.equal(priceStats.countDistinct, 3);
  assert.deepEqual(new Set(priceStats.distinctValues), new Set([15, 35, 75]));
  assert.ok(typeof priceStats.cardinality === "number");

  const booksStats = priceStats.facets?.category_s?.books;
  const musicStats = priceStats.facets?.category_s?.music;
  assert.equal(booksStats?.count, 2);
  assert.equal(booksStats?.mean, 25);
  assert.equal(musicStats?.count, 1);
  assert.equal(musicStats?.mean, 75);
});
