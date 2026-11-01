import type { SolrTransport } from "../transport.js";
import type { CollectionAdminAction, RequestControlOptions, SolrAdminParams } from "../types.js";

export function collections<T>(client: SolrTransport, action: CollectionAdminAction, params: SolrAdminParams = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>("/solr/admin/collections", { ...requestOptions, query: { action, ...params }, operation: "collections" });
}
