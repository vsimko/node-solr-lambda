import type { RequestControlOptions, SolrClient, SolrDocument, SolrUpdateResponse } from "../src/index.js";

interface Product {
  [key: string]: unknown;
  id: string;
  title_s: string;
  price_d: number;
}

declare const solr: SolrClient;
declare const products: AsyncIterable<Product>;
declare const synchronousProducts: Iterable<Product>;
declare const controls: RequestControlOptions;

const result = solr.addStream(products, {
  commitWithin: 2_000,
  route: "catalog-shard"
}, {
  timeoutMs: 60_000,
  signal: controls.signal
});

async function* generateDocuments(): AsyncGenerator<SolrDocument> {
  yield { id: "product-1", title_s: "Keyboard", price_d: 99.5 };
  yield { id: "product-2", title_s: "Mouse", price_d: 49.5 };
}

const generated = solr.addStream(generateDocuments());
const defaultResponse: Promise<SolrUpdateResponse> = solr.addStream(products);
interface CustomUpdateResponse { accepted: number; }
const customResponse: Promise<CustomUpdateResponse> = solr.addStream<CustomUpdateResponse>(products);

// @ts-expect-error addStream requires an AsyncIterable, not a synchronous Iterable.
void solr.addStream(synchronousProducts);
// @ts-expect-error commitWithin is a number, not a string.
void solr.addStream(products, { commitWithin: "2000" });
// @ts-expect-error request timeoutMs is a number, not a string.
void solr.addStream(products, {}, { timeoutMs: "60000" });

void result;
void generated;
void defaultResponse;
void customResponse;
