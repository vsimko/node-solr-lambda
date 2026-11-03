import type { SolrClient, SolrClientConfig, SolrQuery, SolrUpdateOptions } from "../src/index.js";
import { createSolrClient, SolrHttpError, solrFilter, solrSort } from "../src/index.js";

const config: SolrClientConfig = { baseUrl: "http://localhost:8983", collection: "catalog" };
const client: SolrClient = createSolrClient(config);
const query: SolrQuery = { query: "*:*", limit: 10 };
const options: SolrUpdateOptions = { commitWithin: 1_000 };
void [client.query(query), client.add({ id: "book-1" }, options), SolrHttpError, solrFilter("status:active"), solrSort("id asc")];

// @ts-expect-error Transport internals are not exported from the package root.
import type { SolrTransport } from "../src/index.js";
// @ts-expect-error Client configuration, including credentials, is not public mutable/readable state.
const exposedConfig = client.clientConfig;
void exposedConfig;
