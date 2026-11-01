import assert from "node:assert/strict";
import test from "node:test";
import { solrExcludeTags, solrFilter } from "../src/index.js";

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
