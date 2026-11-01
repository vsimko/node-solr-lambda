import type { SolrTransport } from "../transport.js";
import type { SolrAdminParams } from "../types.js";

export function stream<T>(client: SolrTransport, path: string, expression: string): Promise<T> {
  return client.request<T>(path, { query: { expr: expression, wt: "json" }, operation: "stream" });
}

export function exportResults(client: SolrTransport, path: string, params: SolrAdminParams): Promise<Response> {
  return client.requestRaw(path, { query: params, operation: "export" });
}
