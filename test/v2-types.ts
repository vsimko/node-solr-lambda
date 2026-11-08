import { createSolrClient, SolrV2Client } from "../src/index.js";
import type { RequestOptions } from "../src/index.js";

const client = createSolrClient();
const namespace: SolrV2Client = client.v2;
const requestOptions: RequestOptions = { method: "POST", body: { create: { name: "books" } } };
const response: Promise<{ responseHeader?: { status?: number } }> =
  namespace.request("/api/cores", requestOptions);
const rawResponse: Promise<Response> = namespace.requestRaw("/api/cores", { method: "GET" });
void [response, rawResponse];

// @ts-expect-error V2 routes must use the explicit /api/ prefix.
void namespace.request("/solr/admin/cores");
// @ts-expect-error Query parameters belong in RequestOptions.query, not in the path.
void namespace.request("/api/cores?wt=json");
// @ts-expect-error Only the HTTP methods supported by the shared transport are accepted.
void namespace.request("/api/cores", { method: "PATCH" });
