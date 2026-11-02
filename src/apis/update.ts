import type { SolrTransport } from "../transport.js";
import type { CommitOptions, RequestControlOptions, SolrDelete, SolrDeleteOptions, SolrDocument, SolrOptimizeOptions, SolrUpdateOptions } from "../types.js";

function updateParams(options: SolrUpdateOptions): Record<string, string | number | boolean> {
  const { route, ...params } = options;
  if (options.commitWithin !== undefined && (!Number.isFinite(options.commitWithin) || options.commitWithin < 0)) {
    throw new RangeError("commitWithin must be a finite non-negative number");
  }
  if (route !== undefined && route.trim() === "") throw new TypeError("route must be a non-empty string");
  return { ...params, ...(route === undefined ? {} : { _route_: route }) };
}

function deleteParams(options: SolrDeleteOptions): Record<string, string | number | boolean> {
  const { route, commitWithin } = options;
  if (commitWithin !== undefined && (!Number.isFinite(commitWithin) || commitWithin < 0)) {
    throw new RangeError("commitWithin must be a finite non-negative number");
  }
  if (route !== undefined && route.trim() === "") throw new TypeError("route must be a non-empty string");
  return {
    ...(route === undefined ? {} : { _route_: route }),
    ...(commitWithin === undefined ? {} : { commitWithin })
  };
}

export function add<T>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, {
    ...requestOptions,
    method: "POST",
    body: Array.isArray(documents) ? documents : [documents],
    query: updateParams(options),
    operation: "add"
  });
}

export function update<T>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return add<T>(client, path, documents, options, requestOptions);
}

export function deleteDocuments<T>(client: SolrTransport, path: string, command: SolrDelete, options: SolrDeleteOptions = {}): Promise<T> {
  const { route: _route, commitWithin: _commitWithin, ...requestOptions } = options;
  return client.request<T>(path, {
    ...requestOptions,
    method: "POST",
    body: { delete: typeof command === "string" ? { id: command } : command },
    query: deleteParams(options),
    operation: "delete"
  });
}

export function commit<T>(client: SolrTransport, path: string, options: CommitOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: { commit: options }, operation: "commit" });
}

export function softCommit<T>(client: SolrTransport, path: string, requestOptions: RequestControlOptions = {}): Promise<T> {
  return commit<T>(client, path, { softCommit: true, waitSearcher: false }, requestOptions);
}

export function optimize<T>(client: SolrTransport, path: string, options: SolrOptimizeOptions | number = 1, requestOptions: RequestControlOptions = {}): Promise<T> {
  const normalized = typeof options === "number" ? { maxSegments: options } : options;
  if (normalized.maxSegments !== undefined && (!Number.isInteger(normalized.maxSegments) || normalized.maxSegments < 1)) {
    throw new RangeError("maxSegments must be a positive integer");
  }
  return client.request<T>(path, { ...requestOptions, method: "POST", body: { optimize: normalized }, operation: "optimize" });
}

export function rollback<T>(client: SolrTransport, path: string, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: { rollback: {} }, operation: "rollback" });
}
