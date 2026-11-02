import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions, SolrConfigCommand } from "../types.js";

/** Execute a typed Config API command. */
export function config<T>(client: SolrTransport, path: string, command: SolrConfigCommand, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: command, operation: "config" });
}
