import assert from "node:assert/strict";
import { SolrClient, type SolrQueryResponse } from "../../src/index.js";
import { query as executeQuery } from "../../src/apis/query.js";
import { integrationTest } from "./fixtures.js";

integrationTest("Suggester returns deterministic indexed terms from a configured request handler", async ({
  createCore,
  createId
}) => {
  const core = await createCore("suggester");
  const baseUrl = process.env.SOLR_BASE_URL!;
  const username = process.env.SOLR_USERNAME;
  const password = process.env.SOLR_PASSWORD;
  const client = new SolrClient({
    baseUrl,
    core,
    timeoutMs: 30_000,
    ...(username && password ? { auth: { type: "basic" as const, username, password } } : {})
  });
  const handlerPath = "/suggest";

  try {
    await client.config({
      "add-searchcomponent": {
        name: "suggest",
        class: "solr.SuggestComponent",
        suggester: [{
          name: "products",
          lookupImpl: "FSTLookupFactory",
          dictionaryImpl: "DocumentDictionaryFactory",
          field: "name_s"
        }]
      }
    });
    await client.config({
      "add-requesthandler": {
        name: handlerPath,
        class: "solr.SearchHandler",
        startup: "lazy",
        defaults: { suggest: true, "suggest.count": 5 },
        components: ["suggest"]
      }
    });

    await client.add([
      { id: createId("suggester"), name_s: "laptop" },
      { id: createId("suggester"), name_s: "laptop stand" },
      { id: createId("suggester"), name_s: "desktop computer" }
    ]);
    await client.commit({ waitSearcher: true });

    const path = `${baseUrl.replace(/\\/+$/, "")}/${core}${handlerPath}`;
    const response = await executeQuery<SolrQueryResponse<{ id: string }>>(client, path, {
      query: "*:*",
      suggest: {
        enabled: true,
        dictionary: "products",
        query: "lap",
        count: 5,
        build: true
      },
      params: { "json.nl": "map" }
    });

    const suggestions = response.suggest?.products?.lap?.suggestions ?? [];
    assert.ok(suggestions.some(item => item.term === "laptop"));
    assert.ok(suggestions.some(item => item.term === "laptop stand"));
    assert.ok(suggestions.every(item => Number.isFinite(item.weight ?? 0)));
  } finally {
    await Promise.allSettled([
      client.config({ "delete-requesthandler": handlerPath }),
      client.config({ "delete-searchcomponent": "suggest" })
    ]);
  }
}, 60_000);
