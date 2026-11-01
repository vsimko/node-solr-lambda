import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions, SolrAdminParams } from "../types.js";

export function metrics<T>(client: SolrTransport, params: SolrAdminParams = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>("/solr/admin/metrics", { ...requestOptions, query: params, operation: "metrics" });
}
