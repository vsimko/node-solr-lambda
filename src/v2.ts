import type { SolrTransport } from "./transport.js";
import type { RequestControlOptions, RequestOptions, SolrV2CoreOperationResponse, SolrV2CoreRenameParams, SolrV2CoreStatusOptions, SolrV2CoreStatusResponse, SolrV2CoreUnloadParams } from "./types.js";

/**
 * Explicit Solr V2 API namespace.
 *
 * This foundation intentionally exposes only the shared-transport escape hatch.
 * Operation-specific methods and their version guarantees are added separately.
 */
export class SolrV2Client {
  /** Typed Core Admin V2 operations. These target standalone/user-managed cores, not SolrCloud collections. */
  readonly coreAdmin: SolrV2CoreAdminClient;

  constructor(private readonly transport: SolrTransport) {
    this.coreAdmin = new SolrV2CoreAdminClient(this);
  }

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
    // URL normalizes dot segments (including percent-encoded forms). Reject them
    // before passing the path to the transport so a V2 path cannot escape /api/.
    for (const segment of path.split("/")) {
      let decoded: string;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        throw new TypeError("Solr V2 path must contain valid percent-encoding");
      }
      if (decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\")) {
        throw new TypeError("Solr V2 path must not contain dot segments or encoded path separators");
      }
    }
  }
}


/**
 * Typed Core Admin operations for the Solr V2 API.
 *
 * Runtime evidence is pinned to Solr 9.11.0 and 10.1.0. Solr 8.11.4 documents
 * only the V1 CoreAdmin surface, so these methods do not claim Solr 8 support.
 * CoreAdmin is intended for standalone/user-managed cores; SolrCloud users
 * should use the Collections V2 API instead.
 */
export class SolrV2CoreAdminClient {
  constructor(private readonly v2: SolrV2Client) {}

  /** List status for all cores on this Solr node. */
  list(
    options: SolrV2CoreStatusOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2CoreStatusResponse> {
    return this.v2.request<SolrV2CoreStatusResponse>("/api/cores/", {
      ...requestOptions,
      method: "GET",
      ...(options.indexInfo === undefined ? {} : { query: { indexInfo: options.indexInfo } })
    });
  }

  /** Read status for one named core. */
  status(
    core: string,
    options: SolrV2CoreStatusOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2CoreStatusResponse> {
    const path = this.corePath(core);
    return this.v2.request<SolrV2CoreStatusResponse>(`${path}`, {
      ...requestOptions,
      method: "GET",
      ...(options.indexInfo === undefined ? {} : { query: { indexInfo: options.indexInfo } })
    });
  }

  /** Reload a core from its on-disk configuration. */
  reload(core: string, requestOptions: RequestControlOptions = {}): Promise<SolrV2CoreOperationResponse> {
    return this.v2.request<SolrV2CoreOperationResponse>(`${this.corePath(core)}/reload`, {
      ...requestOptions,
      method: "POST"
    });
  }

  /** Rename a core. The new name is supplied in the V2 JSON body as { to }. */
  rename(
    core: string,
    params: SolrV2CoreRenameParams,
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2CoreOperationResponse> {
    return this.v2.request<SolrV2CoreOperationResponse>(`${this.corePath(core)}/rename`, {
      ...requestOptions,
      method: "POST",
      body: params
    });
  }

  /** Unload a core. Deleting its data directories is opt-in via explicit flags. */
  unload(
    core: string,
    params: SolrV2CoreUnloadParams = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2CoreOperationResponse> {
    return this.v2.request<SolrV2CoreOperationResponse>(`${this.corePath(core)}/unload`, {
      ...requestOptions,
      method: "POST",
      body: params
    });
  }

  private corePath(core: string): `/api/cores/${string}` {
    if (typeof core !== "string" || core.trim().length === 0 || core.includes("/") || core.includes("\\")) {
      throw new TypeError("Solr V2 Core Admin requires a non-empty core name without path separators");
    }
    return `/api/cores/${encodeURIComponent(core)}`;
  }
}
