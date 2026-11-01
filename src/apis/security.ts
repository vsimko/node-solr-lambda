import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions } from "../types.js";

export function security<T>(client: SolrTransport, area: "authentication" | "authorization", command?: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(`/solr/admin/${area}`, {
    ...requestOptions,
    method: command === undefined ? "GET" : "POST",
    ...(command === undefined ? {} : { body: command }),
    operation: "security"
  });
}
