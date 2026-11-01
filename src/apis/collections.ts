import type { SolrTransport } from "../transport.js";
import type { CollectionAdminAction, SolrAdminParams } from "../types.js";

export function collections<T>(client: SolrTransport, action: CollectionAdminAction, params: SolrAdminParams = {}): Promise<T> {
  return client.request<T>("/solr/admin/collections", { query: { action, ...params }, operation: "collections" });
}
