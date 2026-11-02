import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions, SolrSchemaCommand } from "../types.js";

/** Execute a typed Schema API command. */
export function schema<T>(client: SolrTransport, path: string, command: SolrSchemaCommand, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: command, operation: "schema" });
}
