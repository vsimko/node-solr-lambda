import type { SolrClient, SolrDocument } from "../src/index.js";

interface Product {
  [key: string]: unknown;
  id: string;
  title_s: string;
  price_d: number;
}

declare const solr: SolrClient;
declare const products: AsyncIterable<Product>;

const result = solr.addStream(products, {
  commitWithin: 2_000,
  route: "catalog-shard"
}, {
  timeoutMs: 60_000
});

async function* generateDocuments(): AsyncGenerator<SolrDocument> {
  yield { id: "product-1", title_s: "Keyboard", price_d: 99.5 };
  yield { id: "product-2", title_s: "Mouse", price_d: 49.5 };
}

const generated = solr.addStream(generateDocuments());
void result;
void generated;
