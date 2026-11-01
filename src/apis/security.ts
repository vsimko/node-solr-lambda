import type { SolrTransport } from "../transport.js";

export function security<T>(client: SolrTransport, area: "authentication" | "authorization", command?: Readonly<Record<string, unknown>>): Promise<T> {
  return client.request<T>(`/solr/admin/${area}`, {
    method: command === undefined ? "GET" : "POST",
    ...(command === undefined ? {} : { body: command }),
    operation: "security"
  });
}
