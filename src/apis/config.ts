import type { SolrTransport } from "../transport.js";

export function config<T>(client: SolrTransport, path: string, command: Readonly<Record<string, unknown>>): Promise<T> {
  return client.request<T>(path, { method: "POST", body: command, operation: "config" });
}
