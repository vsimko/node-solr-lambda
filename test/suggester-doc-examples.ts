import type { SolrQueryResponse, SolrSuggesterOptions, SolrSuggesterResponse } from "../src/index.js";

interface Product {
  id: string;
  title: string;
}

const suggesterOptions = {
  dictionary: ["products", "brands"],
  query: "lap",
  count: 5,
  contextFilterQuery: "category:electronics"
} satisfies SolrSuggesterOptions;

declare const response: SolrQueryResponse<Product>;
const suggestion = response.suggest?.products?.lap?.suggestions?.[0];
const term: string | undefined = suggestion?.term;
const weight: number | undefined = suggestion?.weight;
const payload: string | undefined = suggestion?.payload;

declare const responseShape: SolrSuggesterResponse;
const resultCount: number | undefined = responseShape.products?.lap?.numFound;

void suggesterOptions;
void term;
void weight;
void payload;
void resultCount;
