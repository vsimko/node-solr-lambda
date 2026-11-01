import type { SolrTransport } from "../transport.js";
import type { SolrAdminParams } from "../types.js";

export function metrics<T>(client: SolrTransport, params: SolrAdminParams = {}): Promise<T> {
  return client.request<T>("/solr/admin/metrics", { query: params, operation: "metrics" });
}
