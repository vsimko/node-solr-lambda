import type { SolrTransport } from "./transport.js";
import type { RequestOptions } from "./types.js";

/**
 * Explicit Solr V2 API namespace.
 *
 * This foundation intentionally exposes only the shared-transport escape hatch.
 * Operation-specific methods and their version guarantees are added separately.
 */
export class SolrV2Client {
  constructor(private readonly transport: SolrTransport) {}

  /**
   * Send a request to a Solr V2 API path. Query parameters belong in options.query.
   * No V1 fallback or route rewriting is performed.
   */
  request<T = unknown>(path: `/api/${string}`, options: RequestOptions = {}): Promise<T> {
    this.validatePath(path);
    return this.transport.request<T>(`/solr${path}`, { ...options, operation: options.operation ?? "v2" });
  }

  /** Send a raw V2 request and retain the Response body for streaming or custom writers. */
  requestRaw(path: `/api/${string}`, options: RequestOptions = {}): Promise<Response> {
    this.validatePath(path);
    return this.transport.requestRaw(`/solr${path}`, { ...options, operation: options.operation ?? "v2" });
  }

  private validatePath(path: string): void {
    if (!path.startsWith("/api/") || path.includes("?") || path.includes("#") || path.includes("\\") || path.includes("://")) {
      throw new TypeError("Solr V2 path must be a relative /api/ path without a query or fragment");
    }
  }
}
