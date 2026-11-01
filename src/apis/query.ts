import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions, SolrQuery, SolrQueryParamValue } from "../types.js";

export function query<T>(client: SolrTransport, path: string, query: SolrQuery, requestOptions: RequestControlOptions = {}): Promise<T> {
  const params: Record<string, unknown> = { ...(query.params ?? {}), ...query };
  if (query.query !== undefined) params.q = query.query;
  if (query.filter !== undefined) params.fq = query.filter;
  if (query.fields !== undefined) params.fl = query.fields;
  if (query.limit !== undefined) params.rows = query.limit;
  if (query.offset !== undefined) params.start = query.offset;
  if (query.parserOptions !== undefined) {
    const { type: _parserType, ...parserOptions } = query.parserOptions;
    Object.assign(params, parserOptions);
  }
  delete params.query;
  delete params.params;
  delete params.filter;
  delete params.fields;
  delete params.limit;
  delete params.offset;
  delete params.parserOptions;
  const flat: Record<string, SolrQueryParamValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" ||
      (Array.isArray(value) && value.every(item => typeof item === "string" || typeof item === "number"))) {
      flat[key] = value as SolrQueryParamValue;
    }
  }
  return client.request<T>(path, { ...requestOptions, method: "GET", query: flat, operation: "query" });
}

export function queryJson<T>(client: SolrTransport, path: string, request: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: request, operation: "queryJson" });
}
