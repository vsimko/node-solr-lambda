import assert from "node:assert/strict";
import test from "node:test";
import { SolrClient } from "../src/index.js";
import type { SolrJsonQueryRequest, SolrQuery, SolrResponse } from "../src/index.js";

const createClient = (capture: (url: URL) => void) => new SolrClient({
  baseUrl: "http://localhost:8983/solr",
  core: "testcore",
  fetch: async (input) => {
    capture(new URL(String(input)));
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  }
});

test("query serializes Lucene parser options", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "title:solr",
    defType: "lucene",
    parserOptions: { type: "lucene", df: "title", sow: true, uf: "* -internal" }
  });

  assert.equal(requestedUrl?.searchParams.get("q"), "title:solr");
  assert.equal(requestedUrl?.searchParams.get("defType"), "lucene");
  assert.equal(requestedUrl?.searchParams.get("df"), "title");
  assert.equal(requestedUrl?.searchParams.get("sow"), "true");
  assert.equal(requestedUrl?.searchParams.get("uf"), "* -internal");
  assert.equal(requestedUrl?.searchParams.has("type"), false);
});

test("query serializes DisMax parser options and repeated values", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "solr client",
    defType: "dismax",
    parserOptions: { type: "dismax", qf: "title^2 body", mm: "2", tie: 0.1, bq: ["type:book", "type:article"] }
  });

  assert.equal(requestedUrl?.searchParams.get("qf"), "title^2 body");
  assert.equal(requestedUrl?.searchParams.get("mm"), "2");
  assert.equal(requestedUrl?.searchParams.get("tie"), "0.1");
  assert.deepEqual(requestedUrl?.searchParams.getAll("bq"), ["type:book", "type:article"]);
  assert.equal(requestedUrl?.searchParams.has("type"), false);
});

test("query serializes eDisMax parser options including dotted parameters", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "solr client",
    defType: "edismax",
    parserOptions: {
      type: "edismax",
      qf: "title^10 description",
      pf2: "title description",
      mm: "2<75%",
      "mm.autoRelax": true,
      lowercaseOperators: true
    }
  });

  assert.equal(requestedUrl?.searchParams.get("qf"), "title^10 description");
  assert.equal(requestedUrl?.searchParams.get("pf2"), "title description");
  assert.equal(requestedUrl?.searchParams.get("mm"), "2<75%");
  assert.equal(requestedUrl?.searchParams.get("mm.autoRelax"), "true");
  assert.equal(requestedUrl?.searchParams.get("lowercaseOperators"), "true");
  assert.equal(requestedUrl?.searchParams.has("type"), false);
});

test("query serializes multiple raw and tagged filters as repeated fq parameters", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "*:*",
    filter: [
      "category:books AND title:\"The Solr Guide\"",
      { query: "inStock:true", tag: "availability" },
      { query: "price:[10 TO 50]", tag: ["price", "promotion"], cache: false, cost: 25 }
    ]
  });

  assert.deepEqual(requestedUrl?.searchParams.getAll("fq"), [
    'category:books AND title:"The Solr Guide"',
    "{!tag=availability}inStock:true",
    "{!tag=price,promotion cache=false cost=25}price:[10 TO 50]"
  ]);
});

test("query serializes a single structured filter and preserves local parameter values", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    filter: { query: "name:foo bar", localParams: { type: "lucene", df: "name", cache: false } }
  });

  assert.equal(requestedUrl?.searchParams.get("fq"), '{!type=lucene df=name cache=false}name:foo bar');
  assert.equal(requestedUrl?.searchParams.getAll("fq").length, 1);
});


test("cursor pagination serializes cursorMark and returns the next mark across pages", async () => {
  const requestedUrls: URL[] = [];
  const pages = [
    { response: { docs: [{ id: "1" }, { id: "2" }] }, nextCursorMark: "mark-2" },
    { response: { docs: [{ id: "3" }] }, nextCursorMark: "mark-2" }
  ];
  const client = new SolrClient({
    baseUrl: "http://localhost:8983/solr",
    core: "testcore",
    fetch: async input => {
      requestedUrls.push(new URL(String(input)));
      const page = pages.shift();
      return new Response(JSON.stringify(page), { status: 200, headers: { "content-type": "application/json" } });
    }
  });

  const query = { query: "*:*", sort: "updatedAt asc,id asc", limit: 2 };
  const first = await client.query<SolrResponse<{ id: string }>>({ ...query, cursorMark: "*" });
  const second = await client.query<SolrResponse<{ id: string }>>({ ...query, cursorMark: first.nextCursorMark! });
  const ids = [...(first.response?.docs ?? []), ...(second.response?.docs ?? [])].map(doc => doc.id);
  const firstUrl = requestedUrls[0];
  const secondUrl = requestedUrls[1];
  assert.ok(firstUrl);
  assert.ok(secondUrl);

  assert.equal(firstUrl.searchParams.get("cursorMark"), "*");
  assert.equal(secondUrl.searchParams.get("cursorMark"), "mark-2");
  assert.equal(firstUrl.searchParams.get("sort"), "updatedAt asc,id asc");
  assert.deepEqual(ids, ["1", "2", "3"]);
  assert.equal(new Set(ids).size, ids.length);
});

test("cursor pagination rejects a missing sort or a non-zero offset at runtime", async () => {
  const client = createClient(() => undefined);
  const missingSort = { query: "*:*", cursorMark: "*" } as unknown as SolrQuery;
  const withOffset = { query: "*:*", sort: "id asc", cursorMark: "*", offset: 10 } as unknown as SolrQuery;

  assert.throws(() => client.query(missingSort), /cursorMark requires a non-empty sort expression/);
  assert.throws(() => client.query(withOffset), /cursorMark cannot be combined with a non-zero offset/);
});

test("query serializes typed classic field, query, date, and range facets", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "*:*",
    facets: {
      fields: [
        {
          field: "category",
          limit: 5,
          offset: 2,
          sort: "count",
          minCount: 1,
          missing: true,
          prefix: "bo",
          method: "fc"
        },
        "author"
      ],
      queries: ["price:[10 TO 20]", "inStock:true"],
      ranges: [
        {
          field: "created_at",
          start: "2025-01-01T00:00:00Z",
          end: "2025-01-03T00:00:00Z",
          gap: "+1DAY",
          hardEnd: true,
          other: ["before", "after"],
          include: ["lower", "upper"],
          method: "filter"
        },
        {
          field: "price",
          start: 0,
          end: 100,
          gap: 10,
          hardEnd: true,
          other: "between",
          include: "edge"
        }
      ],
      rangeMethod: "dv",
      limit: 10,
      offset: 0,
      sort: "index",
      minCount: 1,
      missing: false,
      prefix: "A",
      method: "fc"
    }
  });

  assert.equal(requestedUrl?.searchParams.get("facet"), "true");
  assert.deepEqual(requestedUrl?.searchParams.getAll("facet.field"), ["category", "author"]);
  assert.deepEqual(requestedUrl?.searchParams.getAll("facet.query"), ["price:[10 TO 20]", "inStock:true"]);
  assert.deepEqual(requestedUrl?.searchParams.getAll("facet.range"), ["created_at", "price"]);
  assert.equal(requestedUrl?.searchParams.get("facet.range.method"), "dv");
  assert.equal(requestedUrl?.searchParams.get("facet.limit"), "10");
  assert.equal(requestedUrl?.searchParams.get("facet.offset"), "0");
  assert.equal(requestedUrl?.searchParams.get("facet.sort"), "index");
  assert.equal(requestedUrl?.searchParams.get("facet.mincount"), "1");
  assert.equal(requestedUrl?.searchParams.get("facet.missing"), "false");
  assert.equal(requestedUrl?.searchParams.get("facet.prefix"), "A");
  assert.equal(requestedUrl?.searchParams.get("facet.method"), "fc");
  assert.equal(requestedUrl?.searchParams.get("f.category.facet.limit"), "5");
  assert.equal(requestedUrl?.searchParams.get("f.category.facet.offset"), "2");
  assert.equal(requestedUrl?.searchParams.get("f.category.facet.sort"), "count");
  assert.equal(requestedUrl?.searchParams.get("f.category.facet.mincount"), "1");
  assert.equal(requestedUrl?.searchParams.get("f.category.facet.missing"), "true");
  assert.equal(requestedUrl?.searchParams.get("f.category.facet.prefix"), "bo");
  assert.equal(requestedUrl?.searchParams.get("f.category.facet.method"), "fc");
  assert.equal(requestedUrl?.searchParams.get("f.created_at.facet.range.start"), "2025-01-01T00:00:00Z");
  assert.equal(requestedUrl?.searchParams.get("f.created_at.facet.range.end"), "2025-01-03T00:00:00Z");
  assert.equal(requestedUrl?.searchParams.get("f.created_at.facet.range.gap"), "+1DAY");
  assert.equal(requestedUrl?.searchParams.get("f.created_at.facet.range.hardend"), "true");
  assert.deepEqual(requestedUrl?.searchParams.getAll("f.created_at.facet.range.other"), ["before", "after"]);
  assert.deepEqual(requestedUrl?.searchParams.getAll("f.created_at.facet.range.include"), ["lower", "upper"]);
  assert.equal(requestedUrl?.searchParams.get("f.created_at.facet.range.method"), "filter");
  assert.equal(requestedUrl?.searchParams.get("f.price.facet.range.start"), "0");
  assert.equal(requestedUrl?.searchParams.get("f.price.facet.range.end"), "100");
  assert.equal(requestedUrl?.searchParams.get("f.price.facet.range.gap"), "10");
  assert.equal(requestedUrl?.searchParams.get("f.price.facet.range.hardend"), "true");
  assert.equal(requestedUrl?.searchParams.get("f.price.facet.range.other"), "between");
  assert.equal(requestedUrl?.searchParams.get("f.price.facet.range.include"), "edge");
});

test("query preserves raw range facet field names", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });
  await client.query({ query: "*:*", facets: { ranges: "created_at" } });
  assert.equal(requestedUrl?.searchParams.get("facet"), "true");
  assert.equal(requestedUrl?.searchParams.get("facet.range"), "created_at");
  assert.equal(requestedUrl?.searchParams.has("f.created_at.facet.range.start"), false);
});

test("queryJson preserves nested JSON Facet API definitions in the request body", async () => {
  let requestBody: unknown;
  const client = new SolrClient({
    baseUrl: "http://localhost:8983/solr",
    collection: "catalog",
    fetch: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  const request: SolrJsonQueryRequest = {
    query: { lucene: "*:*" },
    filter: ["inStock:true"],
    facet: {
      categories: {
        type: "terms",
        field: "category_s",
        limit: 10,
        sort: "count desc",
        domain: { filter: ["inStock:true"], excludeTags: ["stock"] },
        facet: {
          averagePrice: "avg(price_d)",
          nestedRange: {
            type: "range",
            field: "price_d",
            start: 0,
            end: 100,
            gap: 10,
            facet: { count: "count()" }
          }
        }
      },
      expensiveProducts: {
        type: "query",
        q: "price_d:[50 TO *]",
        facet: { total: "count()" }
      }
    }
  };

  await client.queryJson(request);
  assert.deepEqual(requestBody, request);
});

test("query serializes typed highlighting and per-field overrides", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "quick",
    highlighting: {
      fields: ["title_txt", "description_txt"],
      method: "unified",
      snippets: 3,
      fragmentSize: 120,
      mergeContiguous: true,
      requireFieldMatch: true,
      maxAnalyzedChars: 10_000,
      alternateField: "summary_txt",
      maxAlternateFieldLength: 200,
      formatter: "simple",
      tagPre: "<mark>",
      tagPost: "</mark>",
      simplePre: "<strong>",
      simplePost: "</strong>",
      encoder: "html",
      highlightMultiTerm: true,
      usePhraseHighlighter: true,
      payloads: false,
      offsetSource: "POSTINGS",
      fragAlignRatio: 0.25,
      perField: {
        title_txt: {
          method: "original",
          snippets: 2,
          fragmentSize: 80,
          requireFieldMatch: false,
          alternateField: "summary_txt",
          maxAlternateFieldLength: 40
        }
      }
    }
  });

  assert.equal(requestedUrl?.searchParams.get("hl"), "true");
  assert.deepEqual(requestedUrl?.searchParams.getAll("hl.fl"), ["title_txt", "description_txt"]);
  assert.equal(requestedUrl?.searchParams.get("hl.method"), "unified");
  assert.equal(requestedUrl?.searchParams.get("hl.snippets"), "3");
  assert.equal(requestedUrl?.searchParams.get("hl.fragsize"), "120");
  assert.equal(requestedUrl?.searchParams.get("hl.mergeContiguous"), "true");
  assert.equal(requestedUrl?.searchParams.get("hl.requireFieldMatch"), "true");
  assert.equal(requestedUrl?.searchParams.get("hl.maxAnalyzedChars"), "10000");
  assert.equal(requestedUrl?.searchParams.get("hl.alternateField"), "summary_txt");
  assert.equal(requestedUrl?.searchParams.get("hl.maxAlternateFieldLength"), "200");
  assert.equal(requestedUrl?.searchParams.get("hl.formatter"), "simple");
  assert.equal(requestedUrl?.searchParams.get("hl.tag.pre"), "<mark>");
  assert.equal(requestedUrl?.searchParams.get("hl.tag.post"), "</mark>");
  assert.equal(requestedUrl?.searchParams.get("hl.simple.pre"), "<strong>");
  assert.equal(requestedUrl?.searchParams.get("hl.simple.post"), "</strong>");
  assert.equal(requestedUrl?.searchParams.get("hl.encoder"), "html");
  assert.equal(requestedUrl?.searchParams.get("hl.highlightMultiTerm"), "true");
  assert.equal(requestedUrl?.searchParams.get("hl.usePhraseHighlighter"), "true");
  assert.equal(requestedUrl?.searchParams.get("hl.payloads"), "false");
  assert.equal(requestedUrl?.searchParams.get("hl.offsetSource"), "POSTINGS");
  assert.equal(requestedUrl?.searchParams.get("hl.fragAlignRatio"), "0.25");
  assert.equal(requestedUrl?.searchParams.get("f.title_txt.hl.method"), "original");
  assert.equal(requestedUrl?.searchParams.get("f.title_txt.hl.snippets"), "2");
  assert.equal(requestedUrl?.searchParams.get("f.title_txt.hl.fragsize"), "80");
  assert.equal(requestedUrl?.searchParams.get("f.title_txt.hl.requireFieldMatch"), "false");
  assert.equal(requestedUrl?.searchParams.get("f.title_txt.hl.alternateField"), "summary_txt");
  assert.equal(requestedUrl?.searchParams.get("f.title_txt.hl.maxAlternateFieldLength"), "40");
});

test("query can explicitly disable highlighting", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });
  await client.query({ query: "*:*", highlighting: { enabled: false, fields: ["title_txt"] } });
  assert.equal(requestedUrl?.searchParams.get("hl"), "false");
  assert.equal(requestedUrl?.searchParams.has("hl.fl"), false);
});
