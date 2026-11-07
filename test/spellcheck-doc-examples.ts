import type { SolrQuery, SolrQueryResponse, SolrSpellcheckTermResult } from "../src/index.js";
import type { SolrClient } from "../src/client.js";

interface Product {
  id: string;
  title: string;
}

export async function compileSpellcheckExamples(client: SolrClient): Promise<void> {
  const query: SolrQuery = {
    query: "title:solr",
    spellcheck: {
      enabled: true,
      query: "solr clent",
      count: 5,
      dictionary: ["default", "wordbreak"],
      extendedResults: true,
      collate: true,
      collateExtendedResults: true,
      collateParams: { "q.op": "AND", mm: "100%" }
    }
  };
  const result = await client.query<SolrQueryResponse<Product>>(query);
  const suggestions = result.spellcheck?.suggestions;
  if (suggestions && !Array.isArray(suggestions)) {
    const termValue = (suggestions as Readonly<Record<string, unknown>>)["clent"];
    const term: SolrSpellcheckTermResult | undefined =
      termValue && typeof termValue === "object" && "suggestion" in termValue
        ? termValue as SolrSpellcheckTermResult
        : undefined;
    const firstSuggestion = term?.suggestion?.[0];
    if (firstSuggestion) {
      const word: string = typeof firstSuggestion === "string"
        ? firstSuggestion
        : Array.isArray(firstSuggestion)
          ? firstSuggestion[0]
          : (firstSuggestion as { word: string }).word;
      void word;
    }
  }
  const collations = result.spellcheck?.collations;
  if (collations && !Array.isArray(collations)) {
    const collation = (collations as Readonly<Record<string, unknown>>)["collation"];
    if (collation && typeof collation === "object") {
      const queryText: string = (collation as { collationQuery: string }).collationQuery;
      void queryText;
    }
  }

  // @ts-expect-error Dictionary-building is a server operation, not a query option.
  const invalidBuild: SolrQuery = { spellcheck: { build: true } };
  // @ts-expect-error Plugin-specific settings belong in the custom params boundary.
  const invalidPlugin: SolrQuery = { spellcheck: { customPluginMode: "on" } };
  void invalidBuild;
  void invalidPlugin;
}
