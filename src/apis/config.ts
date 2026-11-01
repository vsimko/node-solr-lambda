import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions } from "../types.js";

export function config<T>(client: SolrTransport, path: string, command: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: command, operation: "config" });
}
