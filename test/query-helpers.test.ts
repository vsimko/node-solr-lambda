import assert from "node:assert/strict";
import test from "node:test";
import { solrFieldAlias, solrFields, solrFunction, solrLocalParams, solrSort } from "../src/index.js";

test("solrSort builds structured multi-field sorts and preserves raw syntax", () => {
  assert.equal(solrSort(
    { expression: "price", direction: "asc" },
    { expression: "score", direction: "desc" }
  ), "price asc, score desc");
  assert.equal(solrSort("div(popularity,price) desc", "id asc"), "div(popularity,price) desc, id asc");
});

test("field-list helpers support aliases, functions, transformers, and raw syntax", () => {
  assert.equal(solrFieldAlias("sales_price", "price"), "sales_price:price");
  assert.equal(solrFields("id", { alias: "sales_price", expression: "price" }, "sum(price, tax)", "[explain]"),
    "id,sales_price:price,sum(price, tax),[explain]");
});

test("solrFunction builds nested function expressions", () => {
  assert.equal(solrFunction("sum", "price", 10), "sum(price,10)");
  assert.equal(solrFunction("div", solrFunction("sum", "price", 10), "quantity"), "div(sum(price,10),quantity)");
  assert.equal(solrFunction("now"), "now()");
});

test("solrLocalParams formats values and appends the query value", () => {
  assert.equal(solrLocalParams({ type: "lucene", df: "title" }, "solr rocks"), "{!type=lucene df=title}solr rocks");
  assert.equal(solrLocalParams({ type: "edismax", qf: "title body", cache: false }), '{!type=edismax qf="title body" cache=false}');
  assert.equal(solrLocalParams({ v: 'a "quoted" value' }), '{!v="a \\"quoted\\" value"}');
  assert.throws(() => solrLocalParams({}), TypeError);
});
