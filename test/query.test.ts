import assert from "node:assert/strict";
import test from "node:test";
import { SolrClient } from "../src/index.js";
import type { SolrJsonQueryRequest, SolrQuery, SolrResponse, SolrQueryResponse, SolrSpellcheckTermResult } from "../src/index.js";

const createClient = (capture: (url: URL) => void) => new SolrClient({
  baseUrl: "http://localhost:8983/solr",
  core: "testcore",
  fetch: async (input) => {
    capture(new URL(String(input)));
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  }
});

test("query serializes debug components, structured explanations, and explainOther", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "title:solr",
    debug: {
      components: ["query", "results"],
      explainStructured: true,
      explainOther: "id:other"
    }
  });

  assert.deepEqual(requestedUrl?.searchParams.getAll("debug"), ["query", "results"]);
  assert.equal(requestedUrl?.searchParams.get("debug.explain.structured"), "true");
  assert.equal(requestedUrl?.searchParams.get("explainOther"), "id:other");
  assert.equal(requestedUrl?.searchParams.has("components"), false);
  assert.equal(requestedUrl?.searchParams.has("explainStructured"), false);
});

test("query defaults debug options to all sections and can disable debug", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({ query: "*:*", debug: {} });
  assert.equal(requestedUrl?.searchParams.get("debug"), "true");

  await client.query({ query: "*:*", debug: { enabled: false, explainStructured: true, explainOther: "id:other" } });
  assert.equal(requestedUrl?.searchParams.get("debug"), "false");
  assert.equal(requestedUrl?.searchParams.has("debug.explain.structured"), false);
  assert.equal(requestedUrl?.searchParams.has("explainOther"), false);
});

test("debug explainOther rejects blank queries", () => {
  const client = createClient(() => { throw new Error("fetch must not run"); });
  assert.throws(() => client.query({ debug: { explainOther: "  " } }), /explainOther must be a non-empty query/);
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


test("query serializes spatial filters with existing filters and spatial parameters", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });
  await client.query({
    query: "*:*",
    filter: ["category:shop"],
    spatial: { parser: "geofilt", field: "store_location", point: "45.15,-93.85", distance: 5 }
  });
  assert.deepEqual(requestedUrl?.searchParams.getAll("fq"), ["category:shop", "{!geofilt sfield=store_location}"]);
  assert.equal(requestedUrl?.searchParams.get("pt"), "45.15,-93.85");
  assert.equal(requestedUrl?.searchParams.get("d"), "5");
});

test("query rejects invalid spatial parameters before making a request", () => {
  const client = createClient(() => { throw new Error("fetch must not run"); });
  assert.throws(() => client.query({ spatial: { parser: "geofilt", field: "", point: "0,0", distance: 5 } }), /spatial field/);
  assert.throws(() => client.query({ spatial: { parser: "bbox", field: "location", point: "0,0", distance: -1 } }), /spatial distance/);
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

test("query serializes grouping and expansion parameters", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "*:*",
    sort: "score desc",
    grouping: {
      fields: ["category_s", "brand_s"],
      functions: ["sum(price_d)"],
      queries: ["price_d:[0 TO 20]", "price_d:[20 TO *]"],
      limit: 3,
      offset: 1,
      sort: "price_d desc",
      groupSort: "price_d asc",
      format: "grouped",
      main: false,
      numGroups: true,
      truncate: true,
      facet: true,
      facetLimit: 10,
      cachePercent: 25
    },
    expand: {
      field: "category_s",
      sort: "price_d desc",
      rows: 5,
      query: "inStock_b:true",
      filter: ["status_s:active", "tenant_s:acme"],
      nullGroup: true
    }
  });

  assert.equal(requestedUrl?.searchParams.get("group"), "true");
  assert.deepEqual(requestedUrl?.searchParams.getAll("group.field"), ["category_s", "brand_s"]);
  assert.deepEqual(requestedUrl?.searchParams.getAll("group.func"), ["sum(price_d)"]);
  assert.deepEqual(requestedUrl?.searchParams.getAll("group.query"), ["price_d:[0 TO 20]", "price_d:[20 TO *]"]);
  assert.equal(requestedUrl?.searchParams.get("group.limit"), "3");
  assert.equal(requestedUrl?.searchParams.get("group.offset"), "1");
  assert.equal(requestedUrl?.searchParams.get("sort"), "price_d desc");
  assert.equal(requestedUrl?.searchParams.get("group.sort"), "price_d asc");
  assert.equal(requestedUrl?.searchParams.get("group.format"), "grouped");
  assert.equal(requestedUrl?.searchParams.get("group.main"), "false");
  assert.equal(requestedUrl?.searchParams.get("group.ngroups"), "true");
  assert.equal(requestedUrl?.searchParams.get("group.truncate"), "true");
  assert.equal(requestedUrl?.searchParams.get("group.facet"), "true");
  assert.equal(requestedUrl?.searchParams.get("group.facet.limit"), "10");
  assert.equal(requestedUrl?.searchParams.get("group.cache.percent"), "25");
  assert.equal(requestedUrl?.searchParams.get("expand"), "true");
  assert.equal(requestedUrl?.searchParams.get("expand.field"), "category_s");
  assert.equal(requestedUrl?.searchParams.get("expand.sort"), "price_d desc");
  assert.equal(requestedUrl?.searchParams.get("expand.rows"), "5");
  assert.equal(requestedUrl?.searchParams.get("expand.q"), "inStock_b:true");
  assert.deepEqual(requestedUrl?.searchParams.getAll("expand.fq"), ["status_s:active", "tenant_s:acme"]);
  assert.equal(requestedUrl?.searchParams.get("expand.nullGroup"), "true");
});

test("query serializes collapse as an additional filter query", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });
  await client.query({
    query: "*:*",
    filter: "status_s:active",
    collapse: {
      field: "product_id_s",
      max: "sum(cscore(),price_d)",
      nullPolicy: "collapse",
      hint: "top_fc",
      size: 100,
      cost: 200
    }
  });

  const filters = requestedUrl?.searchParams.getAll("fq");
  assert.equal(filters?.[0], "status_s:active");
  assert.equal(filters?.[1], "{!collapse field='product_id_s' max='sum(cscore(),price_d)' nullPolicy=collapse hint=top_fc size=100 cost=200}");
});

test("collapse rejects conflicting selectors and invalid numeric options", async () => {
  const client = createClient(() => undefined);
  assert.throws(
    () => client.query({ query: "*:*", collapse: { field: "product_id_s", min: "price_d", max: "price_d" } }),
    /only one of min, max, or sort/
  );
  assert.throws(
    () => client.query({ query: "*:*", collapse: { field: "product_id_s", size: -1 } }),
    /size must be a non-negative integer/
  );
});

test("query serializes typed Stats Component fields, facets, and local options", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "*:*",
    stats: {
      fields: [
        "price_d",
        {
          field: "price_d",
          key: "price_stats",
          tag: ["pivot", "sales"],
          excludeTags: "stock",
          min: true,
          max: true,
          mean: true,
          distinctValues: false,
          countDistinct: false,
          percentiles: [50, 90],
          cardinality: 0.5,
          tdigestCompression: 150
        }
      ],
      facets: ["category_s", "brand_s"],
      calcDistinct: true
    }
  });

  assert.equal(requestedUrl?.searchParams.get("stats"), "true");
  assert.deepEqual(requestedUrl?.searchParams.getAll("stats.field"), [
    "price_d",
    "{!key='price_stats' tag='pivot,sales' ex='stock' min=true max=true mean=true distinctValues=false countDistinct=false percentiles='50,90' cardinality=0.5 tdigestCompression=150}price_d"
  ]);
  assert.deepEqual(requestedUrl?.searchParams.getAll("stats.facet"), ["category_s", "brand_s"]);
  assert.equal(requestedUrl?.searchParams.get("stats.calcdistinct"), "true");
});

test("query can explicitly disable the Stats Component", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });
  await client.query({ query: "*:*", stats: { enabled: false, fields: ["price_d"] } });
  assert.equal(requestedUrl?.searchParams.get("stats"), "false");
  assert.equal(requestedUrl?.searchParams.has("stats.field"), false);
});

test("stats local options reject invalid percentile and cardinality values", () => {
  const client = createClient(() => undefined);
  assert.throws(
    () => client.query({ query: "*:*", stats: { fields: [{ field: "price_d", percentiles: [101] }] } }),
    /percentiles must be between 0 and 100/
  );
  assert.throws(
    () => client.query({ query: "*:*", stats: { fields: [{ field: "price_d", cardinality: 1.5 }] } }),
    /cardinality accuracy must be between 0 and 1/
  );
});


test("query serializes typed MoreLikeThis component parameters", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });
  await client.query({
    query: "category:books",
    moreLikeThis: {
      fields: ["title_txt", "description_txt"],
      count: 8,
      minTermFrequency: 1,
      minDocumentFrequency: 2,
      maxDocumentFrequency: 500,
      maxDocumentFrequencyPercent: 80,
      minWordLength: 3,
      maxWordLength: 30,
      maxQueryTerms: 15,
      maxParsedTokens: 4000,
      boost: true,
      queryFields: "title_txt^2 description_txt",
      interestingTerms: "details"
    }
  });
  assert.equal(requestedUrl?.searchParams.get("mlt"), "true");
  assert.deepEqual(requestedUrl?.searchParams.getAll("mlt.fl"), ["title_txt", "description_txt"]);
  assert.equal(requestedUrl?.searchParams.get("mlt.count"), "8");
  assert.equal(requestedUrl?.searchParams.get("mlt.mintf"), "1");
  assert.equal(requestedUrl?.searchParams.get("mlt.mindf"), "2");
  assert.equal(requestedUrl?.searchParams.get("mlt.maxdf"), "500");
  assert.equal(requestedUrl?.searchParams.get("mlt.maxdfpct"), "80");
  assert.equal(requestedUrl?.searchParams.get("mlt.minwl"), "3");
  assert.equal(requestedUrl?.searchParams.get("mlt.maxwl"), "30");
  assert.equal(requestedUrl?.searchParams.get("mlt.maxqt"), "15");
  assert.equal(requestedUrl?.searchParams.get("mlt.maxntp"), "4000");
  assert.equal(requestedUrl?.searchParams.get("mlt.boost"), "true");
  assert.equal(requestedUrl?.searchParams.get("mlt.qf"), "title_txt^2 description_txt");
  assert.equal(requestedUrl?.searchParams.get("mlt.interestingTerms"), "details");
});

test("query can explicitly disable MoreLikeThis", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });
  await client.query({ query: "*:*", moreLikeThis: { enabled: false, fields: ["title_txt"] } });
  assert.equal(requestedUrl?.searchParams.get("mlt"), "false");
  assert.equal(requestedUrl?.searchParams.has("mlt.fl"), false);
});

test("MoreLikeThis rejects invalid numeric thresholds", () => {
  const client = createClient(() => undefined);
  assert.throws(
    () => client.query({ query: "*:*", moreLikeThis: { maxDocumentFrequencyPercent: 101 } }),
    /maxDocumentFrequencyPercent must be an integer between 0 and 100/
  );
  assert.throws(
    () => client.query({ query: "*:*", moreLikeThis: { count: -1 } }),
    /count must be a non-negative integer/
  );
});


test("query serializes typed SpellCheck options and collate parameters", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "*:*",
    spellcheck: {
      enabled: true,
      query: "solr clent",
      queryAnalyzerFieldType: "text_general",
      count: 5,
      onlyMorePopular: true,
      extendedResults: true,
      collate: true,
      maxCollations: 2,
      maxCollationTries: 4,
      maxCollationEvaluations: 100,
      collateExtendedResults: true,
      collateMaxCollectDocs: 25,
      maxResultsForSuggest: 5,
      alternativeTermCount: 3,
      accuracy: 0.5,
      dictionary: ["default", "wordbreak"],
      collateParams: { "q.op": "AND", mm: "100%" }
    },
    params: { "spellcheck.build": false }
  });

  assert.equal(requestedUrl?.searchParams.get("spellcheck"), "true");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.q"), "solr clent");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.queryAnalyzerFieldType"), "text_general");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.count"), "5");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.onlyMorePopular"), "true");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.extendedResults"), "true");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.collate"), "true");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.maxCollations"), "2");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.maxCollationTries"), "4");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.maxCollationEvaluations"), "100");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.collateExtendedResults"), "true");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.collateMaxCollectDocs"), "25");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.maxResultsForSuggest"), "5");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.alternativeTermCount"), "3");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.accuracy"), "0.5");
  assert.deepEqual(requestedUrl?.searchParams.getAll("spellcheck.dictionary"), ["default", "wordbreak"]);
  assert.equal(requestedUrl?.searchParams.get("spellcheck.collateParam.q.op"), "AND");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.collateParam.mm"), "100%");
  assert.equal(requestedUrl?.searchParams.get("spellcheck.build"), "false");
});

test("query can disable SpellCheck without serializing dependent options", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "*:*",
    spellcheck: { enabled: false, query: "solr clent", count: 5, collate: true }
  });

  assert.equal(requestedUrl?.searchParams.get("spellcheck"), "false");
  assert.equal(requestedUrl?.searchParams.has("spellcheck.q"), false);
  assert.equal(requestedUrl?.searchParams.has("spellcheck.count"), false);
  assert.equal(requestedUrl?.searchParams.has("spellcheck.collate"), false);
});

test("SpellCheck rejects invalid stable option values before making a request", () => {
  const client = createClient(() => { throw new Error("fetch must not run"); });
  assert.throws(() => client.query({ spellcheck: { query: " " } }), /query must be a non-empty string/);
  assert.throws(() => client.query({ spellcheck: { count: 0 } }), /count must be a positive integer/);
  assert.throws(() => client.query({ spellcheck: { maxCollations: -1 } }), /maxCollations must be a non-negative integer/);
  assert.throws(() => client.query({ spellcheck: { accuracy: 1.1 } }), /accuracy must be between 0 and 1/);
  assert.throws(() => client.query({ spellcheck: { dictionary: [] } }), /dictionary must not be empty/);
  assert.throws(() => client.query({ spellcheck: { dictionary: [""] } }), /dictionary names must be non-empty strings/);
  assert.throws(() => client.query({ spellcheck: { collateParams: { " ": "AND" } } }), /collateParams requires non-empty names/);
});

test("query parses the typed SpellCheck suggestions and collation response envelope", async () => {
  const payload = {
    spellcheck: {
      suggestions: {
        clent: {
          numFound: 1,
          startOffset: 5,
          endOffset: 10,
          origFreq: 0,
          suggestion: [["client", 3], { word: "customer", freq: 1 }]
        }
      },
      correctlySpelled: false,
      collations: {
        collation: { collationQuery: "solr client", hits: 3, misspellingsAndCorrections: { clent: "client" } }
      }
    }
  };
  const client = new SolrClient({
    baseUrl: "http://localhost:8983/solr",
    core: "testcore",
    fetch: async () => new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  });
  const response = await client.query<SolrQueryResponse<{ id: string }>>({
    query: "*:*",
    spellcheck: { enabled: true, extendedResults: true, collate: true, collateExtendedResults: true }
  });

  assert.equal(response.spellcheck?.correctlySpelled, false);
  const suggestions = response.spellcheck?.suggestions;
  assert.ok(suggestions && !Array.isArray(suggestions));
  const termValue = (suggestions as Readonly<Record<string, unknown>>)["clent"];
  assert.ok(termValue && typeof termValue === "object" && "suggestion" in termValue);
  const term = termValue as SolrSpellcheckTermResult;
  assert.equal(term.origFreq, 0);
  const firstAlternative = term.suggestion?.[0];
  const firstWord = typeof firstAlternative === "string"
    ? firstAlternative
    : Array.isArray(firstAlternative)
      ? firstAlternative[0]
      : (firstAlternative as { word: string } | undefined)?.word;
  assert.equal(firstWord, "client");
  assert.deepEqual(firstAlternative, ["client", 3]);
  const secondAlternative = term.suggestion?.[1];
  assert.equal(typeof secondAlternative === "object" && !Array.isArray(secondAlternative)
    ? (secondAlternative as { word: string }).word
    : undefined, "customer");
  const collations = response.spellcheck?.collations;
  assert.ok(collations && !Array.isArray(collations));
  const collationValue = (collations as Readonly<Record<string, unknown>>)["collation"];
  assert.equal(typeof collationValue === "object" && collationValue !== null && "collationQuery" in collationValue ? collationValue.collationQuery : undefined, "solr client");
});


test("query serializes typed Suggester options and repeatable dictionary parameters", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "*:*",
    suggest: {
      enabled: true,
      dictionary: ["products", "brands"],
      query: "lap",
      count: 5,
      contextFilterQuery: "category:electronics",
      build: true,
      reload: false,
      buildAll: false,
      reloadAll: true
    }
  });

  assert.equal(requestedUrl?.searchParams.get("suggest"), "true");
  assert.deepEqual(requestedUrl?.searchParams.getAll("suggest.dictionary"), ["products", "brands"]);
  assert.equal(requestedUrl?.searchParams.get("suggest.q"), "lap");
  assert.equal(requestedUrl?.searchParams.get("suggest.count"), "5");
  assert.equal(requestedUrl?.searchParams.get("suggest.cfq"), "category:electronics");
  assert.equal(requestedUrl?.searchParams.get("suggest.build"), "true");
  assert.equal(requestedUrl?.searchParams.get("suggest.reload"), "false");
  assert.equal(requestedUrl?.searchParams.get("suggest.buildAll"), "false");
  assert.equal(requestedUrl?.searchParams.get("suggest.reloadAll"), "true");
});

test("query can disable Suggester without serializing dependent options", async () => {
  let requestedUrl: URL | undefined;
  const client = createClient(url => { requestedUrl = url; });

  await client.query({
    query: "*:*",
    suggest: { enabled: false, dictionary: "products", query: "lap", count: 5, build: true }
  });

  assert.equal(requestedUrl?.searchParams.get("suggest"), "false");
  assert.equal(requestedUrl?.searchParams.has("suggest.dictionary"), false);
  assert.equal(requestedUrl?.searchParams.has("suggest.q"), false);
  assert.equal(requestedUrl?.searchParams.has("suggest.count"), false);
  assert.equal(requestedUrl?.searchParams.has("suggest.build"), false);
});

test("Suggester rejects invalid stable option values before making a request", () => {
  const client = createClient(() => { throw new Error("fetch must not run"); });
  assert.throws(() => client.query({ suggest: { query: " " } }), /suggest query must be a non-empty string/);
  assert.throws(() => client.query({ suggest: { count: 0 } }), /suggest count must be a positive integer/);
  assert.throws(() => client.query({ suggest: { dictionary: [] } }), /suggest dictionary must not be empty/);
  assert.throws(() => client.query({ suggest: { dictionary: [""] } }), /suggest dictionary names must be non-empty strings/);
  assert.throws(() => client.query({ suggest: { contextFilterQuery: " " } }), /suggest contextFilterQuery must be a non-empty string/);
});

test("query parses the typed Suggester response keyed by dictionary and lookup text", async () => {
  const payload = {
    suggest: {
      products: {
        lap: {
          numFound: 2,
          suggestions: [
            { term: "laptop", weight: 12, payload: "electronics" },
            { term: "laptop stand", weight: 7 }
          ]
        }
      }
    }
  };
  const client = new SolrClient({
    baseUrl: "http://localhost:8983/solr",
    core: "testcore",
    fetch: async () => new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  });
  const response = await client.query<SolrQueryResponse<{ id: string }>>({
    query: "*:*",
    suggest: { dictionary: "products", query: "lap", count: 5 }
  });

  const result = response.suggest?.products?.lap;
  assert.equal(result?.numFound, 2);
  assert.equal(result?.suggestions?.[0]?.term, "laptop");
  assert.equal(result?.suggestions?.[0]?.weight, 12);
  assert.equal(result?.suggestions?.[0]?.payload, "electronics");
});
