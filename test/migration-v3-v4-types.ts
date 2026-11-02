/**
 * Compile-only checks for the v3-to-v4 migration guide.
 * Included in npm run test:types via test/tsconfig.json.
 */
import { createSolrClient } from "../src/index.js";
import type { SolrClientConfig, SolrQueryResponse } from "../src/index.js";

const config: SolrClientConfig = {
  baseUrl: "http://localhost:8983",
  core: "books"
};
const solr = createSolrClient(config);

interface Book {
  id: string;
  title: string;
}

const query: Promise<SolrQueryResponse<Book>> = solr.query<SolrQueryResponse<Book>>({
  query: "title:solr",
  fields: ["id", "title"],
  limit: 10
});
void query;

// @ts-expect-error v3 hostname/port/protocol configuration is replaced by baseUrl in v4.
const legacyConfig: SolrClientConfig = { hostname: "localhost", port: 8983, protocol: "http", core: "books" };
void legacyConfig;
