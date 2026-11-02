import assert from "node:assert/strict";
import test from "node:test";
import { solrExcludeTags, solrFilter, solrGeoDistance, solrGeofilt, solrBbox } from "../src/index.js";

test("solrFilter builds tagged filters and retains raw query text", () => {
  assert.equal(solrFilter("category:books", { tag: "category" }), "{!tag=category}category:books");
  assert.equal(solrFilter("price:[1 TO 10]", { tag: ["price", "promotion"], cache: false, cost: 25 }),
    "{!tag=price,promotion cache=false cost=25}price:[1 TO 10]");
});

test("solrFilter supports additional local parameters", () => {
  assert.equal(solrFilter("name:foo bar", { localParams: { type: "lucene", df: "name", cache: false } }),
    '{!type=lucene df=name cache=false}name:foo bar');
});

test("solrExcludeTags joins tags for parser or request parameters", () => {
  assert.equal(solrExcludeTags("category", "availability"), "category,availability");
});


test("spatial helpers build Solr geofilt, bbox and geodist syntax", () => {
  assert.equal(solrGeofilt({ field: "store", point: "45.15,-93.85", distance: 5 }),
    "{!geofilt sfield=store pt=45.15,-93.85 d=5}");
  assert.equal(solrBbox({ field: "store", point: "45.15,-93.85", distance: 5, cache: false }),
    "{!bbox sfield=store cache=false pt=45.15,-93.85 d=5}");
  assert.equal(solrGeoDistance(), "geodist()");
  assert.equal(solrGeoDistance("store"), "geodist(store)");
  assert.equal(solrGeoDistance("store", 45.15, -93.85), "geodist(store,45.15,-93.85)");
});

test("spatial helpers reject invalid required values", () => {
  assert.throws(() => solrGeofilt({ field: "", point: "0,0", distance: 5 }), /non-empty/);
  assert.throws(() => solrBbox({ field: "store", point: "0,0", distance: -1 }), /non-negative/);
  assert.throws(() => solrGeoDistance("store", 100, 0), /latitude/);
  assert.throws(() => solrGeoDistance("store", 0), /together/);
});
