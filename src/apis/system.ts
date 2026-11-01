import type { SolrTransport } from "../transport.js";

export function systemInfo<T>(client: SolrTransport): Promise<T> {
  return client.request<T>("/solr/admin/info/system", { operation: "systemInfo" });
}
