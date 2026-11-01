import type { SolrTransport } from "../transport.js";
import type { CommitOptions, SolrDelete, SolrDocument, UpdateOptions } from "../types.js";

export function add<T>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: UpdateOptions = {}): Promise<T> {
  return client.request<T>(path, {
    method: "POST",
    body: Array.isArray(documents) ? documents : [documents],
    query: { ...options },
    operation: "add"
  });
}

export function update<T>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: UpdateOptions = {}): Promise<T> {
  return add<T>(client, path, documents, options);
}

export function deleteDocuments<T>(client: SolrTransport, path: string, command: SolrDelete): Promise<T> {
  return client.request<T>(path, {
    method: "POST",
    body: { delete: typeof command === "string" ? { id: command } : command },
    operation: "delete"
  });
}

export function commit<T>(client: SolrTransport, path: string, options: CommitOptions = {}): Promise<T> {
  return client.request<T>(path, { method: "POST", body: { commit: options }, operation: "commit" });
}

export function softCommit<T>(client: SolrTransport, path: string): Promise<T> {
  return commit<T>(client, path, { softCommit: true, waitSearcher: false });
}

export function optimize<T>(client: SolrTransport, path: string, maxSegments = 1): Promise<T> {
  return client.request<T>(path, { method: "POST", body: { optimize: { maxSegments } }, operation: "optimize" });
}

export function rollback<T>(client: SolrTransport, path: string): Promise<T> {
  return client.request<T>(path, { method: "POST", body: { rollback: {} }, operation: "rollback" });
}
