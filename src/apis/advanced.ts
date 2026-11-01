import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions, SolrAdminParams } from "../types.js";

export function stream<T>(client: SolrTransport, path: string, expression: string, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, query: { expr: expression, wt: "json" }, operation: "stream" });
}

export function exportResults(client: SolrTransport, path: string, params: SolrAdminParams, requestOptions: RequestControlOptions = {}): Promise<Response> {
  return client.requestRaw(path, { ...requestOptions, query: params, operation: "export" });
}
