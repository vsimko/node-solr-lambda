import { SolrClient } from "../src/client.js";
import type {
  SolrGetMultipleRequest,
  SolrGetMultipleResponse,
  SolrGetRequest,
  SolrGetSingleRequest,
  SolrGetSingleResponse
} from "../src/index.js";

interface Product {
  id: string;
  title: string;
  price: number;
}

export async function compileRealTimeGetExamples(client: SolrClient): Promise<void> {
  const singleRequest: SolrGetSingleRequest = {
    id: "book-1",
    fields: ["id", "title", "price"],
    filter: "status:published",
    params: { wt: "json" }
  };
  const single: SolrGetSingleResponse<Product> = await client.get<Product>(singleRequest);
  const document: Product | null | undefined = single.doc;

  const multipleRequest: SolrGetMultipleRequest = {
    ids: ["book-1", "book-2"],
    fields: ["id", "title"]
  };
  const multiple: SolrGetMultipleResponse<Product> = await client.get<Product>(multipleRequest);
  const documents: Product[] | undefined = multiple.response?.docs;

  // @ts-expect-error Single and multiple ID forms are mutually exclusive.
  const ambiguous: SolrGetRequest = { id: "book-1", ids: ["book-2", "book-3"] };
  // @ts-expect-error Multi-ID requests require at least two IDs.
  const tooFewIds: SolrGetMultipleRequest = { ids: ["book-1"] };
  // @ts-expect-error A single-ID request requires id.
  const missingId: SolrGetSingleRequest = { fields: ["id"] };
  void [document, documents, ambiguous, tooFewIds, missingId];
}
