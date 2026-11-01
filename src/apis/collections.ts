import type { SolrTransport } from "../transport.js";
import type { CollectionAdminAction, CollectionAdminParams, RequestControlOptions } from "../types.js";

export function collections<T, A extends CollectionAdminAction>(client: SolrTransport, action: A, params: CollectionAdminParams<A> = {} as CollectionAdminParams<A>, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>("/solr/admin/collections", { ...requestOptions, query: { action, ...params }, operation: "collections" });
}
