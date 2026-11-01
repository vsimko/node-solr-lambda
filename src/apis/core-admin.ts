import type { SolrTransport } from "../transport.js";
import type { CoreAdminAction, RequestControlOptions, SolrAdminParams } from "../types.js";

export function coreAdmin<T>(client: SolrTransport, action: CoreAdminAction, params: SolrAdminParams = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>("/solr/admin/cores", { ...requestOptions, query: { action, ...params }, operation: "coreAdmin" });
}
