import type { SolrTransport } from "../transport.js";
import type { CollectionAdminAction, CollectionAdminParams, RequestControlOptions, SolrQueryParamValue } from "../types.js";

export function collections<T, A extends CollectionAdminAction = CollectionAdminAction>(
  client: SolrTransport,
  action: A,
  params: CollectionAdminParams<A> = {} as CollectionAdminParams<A>,
  requestOptions: RequestControlOptions = {}
): Promise<T> {
  const query: Record<string, SolrQueryParamValue> = { action };
  for (const [key, value] of Object.entries(params)) {
    if (key === "customParams" && value && typeof value === "object") {
      for (const [customKey, customValue] of Object.entries(value)) {
        if (typeof customValue === "string" || typeof customValue === "number" || typeof customValue === "boolean") {
          query[customKey] = customValue;
        }
      }
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value)) {
      // Collections API list-valued parameters use comma-separated values.
      query[key] = Array.isArray(value) ? value.join(",") : value;
    }
  }
  return client.request<T>("/solr/admin/collections", { ...requestOptions, query, operation: "collections" });
}
