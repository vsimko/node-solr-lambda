import type { SolrTransport } from "../transport.js";
import type { SolrQuery } from "../types.js";

export function query<T>(client: SolrTransport, path: string, query: SolrQuery): Promise<T> {
  const params: Record<string, unknown> = { ...(query.params ?? {}), ...query };
  if (query.query !== undefined) params.q = query.query;
  if (query.filter !== undefined) params.fq = query.filter;
  if (query.fields !== undefined) params.fl = query.fields;
  if (query.limit !== undefined) params.rows = query.limit;
  if (query.offset !== undefined) params.start = query.offset;
  delete params.query;
  delete params.params;
  delete params.filter;
  delete params.fields;
  delete params.limit;
  delete params.offset;
  const flat: Record<string, string | number | boolean | readonly (string | number)[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" ||
      (Array.isArray(value) && value.every(item => typeof item === "string" || typeof item === "number"))) {
      flat[key] = value as string | number | boolean | readonly (string | number)[];
    }
  }
  return client.request<T>(path, { method: "GET", query: flat, operation: "query" });
}

export function queryJson<T>(client: SolrTransport, path: string, request: Readonly<Record<string, unknown>>): Promise<T> {
  return client.request<T>(path, { method: "POST", body: request, operation: "queryJson" });
}
