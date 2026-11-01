import type { SolrTransport } from "../transport.js";
import type { CoreAdminAction, SolrAdminParams } from "../types.js";

export function coreAdmin<T>(client: SolrTransport, action: CoreAdminAction, params: SolrAdminParams = {}): Promise<T> {
  return client.request<T>("/solr/admin/cores", { query: { action, ...params }, operation: "coreAdmin" });
}
