import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions } from "../types.js";

export function systemInfo<T>(client: SolrTransport, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>("/solr/admin/info/system", { ...requestOptions, operation: "systemInfo" });
}
