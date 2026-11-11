import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions } from "../types.js";

/** Flatten plugin-specific permission options into Solr's native permission object. */
function serializeAuthorizationCommand(command: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const [name, value] = Object.entries(command)[0] ?? [];
  if (
    (name !== "set-permission" && name !== "update-permission") ||
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("customOptions" in value)
  ) {
    return command;
  }
  const { customOptions, ...options } = value as {
    customOptions?: Readonly<Record<string, unknown>>;
    [key: string]: unknown;
  };
  return { [name]: { ...customOptions, ...options } };
}

export function security<T>(client: SolrTransport, area: "authentication" | "authorization", command?: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
  const body = area === "authorization" && command !== undefined
    ? serializeAuthorizationCommand(command)
    : command;
  return client.request<T>(`/solr/admin/${area}`, {
    ...requestOptions,
    method: body === undefined ? "GET" : "POST",
    ...(body === undefined ? {} : { body }),
    operation: "security"
  });
}
