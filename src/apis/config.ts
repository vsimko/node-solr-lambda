import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions, SolrConfigCommand, SolrConfigValue } from "../types.js";

/** Flatten the explicit customOptions escape hatch into the native Solr component object. */
function serializeConfigCommand(command: SolrConfigCommand): Readonly<Record<string, unknown>> {
  const [name, value] = Object.entries(command)[0] ?? [];
  if (!name || !value || typeof value !== "object" || Array.isArray(value) || !("customOptions" in value)) {
    return command;
  }
  const { customOptions, ...options } = value as { customOptions?: Readonly<Record<string, SolrConfigValue>>; [key: string]: unknown };
  return { [name]: { ...options, ...customOptions } };
}

/** Execute a typed Config API command. */
export function config<T>(client: SolrTransport, path: string, command: SolrConfigCommand, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: serializeConfigCommand(command), operation: "config" });
}
