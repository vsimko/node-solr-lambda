import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions, SolrExportParams } from "../types.js";

export function stream<T>(client: SolrTransport, path: string, expression: string, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, query: { expr: expression, wt: "json" }, operation: "stream" });
}

function serializeExportSort(sort: SolrExportParams["sort"]): string {
  const clauses = Array.isArray(sort) ? sort : [sort];
  if (clauses.length === 0 || clauses.some(clause =>
    typeof clause === "string" ? !clause.trim() : !clause.field.trim()
  )) {
    throw new TypeError("Export sort must contain non-empty criteria");
  }
  return clauses.map(clause => typeof clause === "string"
    ? clause
    : `${clause.field} ${clause.direction}`).join(", ");
}

function serializeExportParams(params: SolrExportParams): URLSearchParams {
  if (typeof params.fl === "string" ? !params.fl.trim() : params.fl.length === 0 || params.fl.some(field => !field.trim())) {
    throw new TypeError("Export fl must contain at least one non-empty field");
  }
  const sort = serializeExportSort(params.sort);
  if (!sort.trim() || (Array.isArray(params.sort) && params.sort.length === 0)) {
    throw new TypeError("Export sort must contain at least one non-empty criterion");
  }
  if (params.batchSize !== undefined && (!Number.isInteger(params.batchSize) || params.batchSize <= 0)) {
    throw new RangeError("Export batchSize must be a positive integer");
  }
  const reserved = new Set(["q", "fq", "fl", "sort", "batchSize", "includeStoredFields", "expr", "wt"]);
  for (const key of Object.keys(params.customParams ?? {})) {
    if (reserved.has(key)) throw new TypeError(`Export customParams cannot override "${key}"`);
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params.customParams ?? {})) query.append(key, String(value));
  if (params.q !== undefined) query.set("q", params.q);
  for (const filter of (typeof params.fq === "string" ? [params.fq] : params.fq ?? [])) query.append("fq", filter);
  query.set("fl", typeof params.fl === "string" ? params.fl : params.fl.join(","));
  query.set("sort", sort);
  if (params.batchSize !== undefined) query.set("batchSize", String(params.batchSize));
  if (params.includeStoredFields !== undefined) query.set("includeStoredFields", String(params.includeStoredFields));
  if (params.expr !== undefined) query.set("expr", params.expr);
  if (params.wt !== undefined) query.set("wt", params.wt);
  return query;
}

export function exportResults(client: SolrTransport, path: string, params: SolrExportParams, requestOptions: RequestControlOptions = {}): Promise<Response> {
  return client.requestRaw(path, { ...requestOptions, query: serializeExportParams(params), operation: "export" });
}
