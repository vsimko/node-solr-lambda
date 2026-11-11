import type { SolrTransport } from "./transport.js";
import type { RequestControlOptions, RequestOptions, SolrV2CoreOperationResponse, SolrV2CoreRenameParams, SolrV2CoreStatusOptions, SolrV2CoreStatusResponse, SolrV2CoreUnloadParams } from "./types.js";

/**
 * Explicit Solr V2 API namespace sharing the configured V1 transport.
 *
 * Exposes a generic JSON/raw request escape hatch and operation-specific typed
 * Core Admin methods. V1 methods never fall back to V2 routes.
 */
export class SolrV2Client {
  private readonly apiBaseUrl: string;

  /** Typed Core Admin V2 operations. These target standalone/user-managed cores, not SolrCloud collections. */
  readonly coreAdmin: SolrV2CoreAdminClient;

  constructor(private readonly transport: SolrTransport, baseUrl = "http://localhost:8983/") {
    const configuredBase = new URL(baseUrl);
    const segments = configuredBase.pathname.split("/").filter(Boolean);
    // The standard Solr V1 webapp context is /solr, but V2 is mounted at /api.
    // Preserve any reverse-proxy prefix while removing only a terminal /solr.
    if (segments.at(-1) === "solr") segments.pop();
    const proxyPrefix = segments.length ? `/${segments.join("/")}` : "";
    this.apiBaseUrl = `${configuredBase.origin}${proxyPrefix}/api`;
    this.coreAdmin = new SolrV2CoreAdminClient(this);
  }

  /**
   * Send a request to a Solr V2 API path. Query parameters belong in options.query.
   * No V1 fallback or route rewriting is performed.
   */
  request<T = unknown>(path: `/api/${string}`, options: RequestOptions = {}): Promise<T> {
    this.validatePath(path);
    return this.transport.request<T>(`${this.apiBaseUrl}${path.slice("/api".length)}`, { ...options, operation: options.operation ?? "v2" });
  }

  /** Send a raw V2 request and retain the Response body for streaming or custom writers. */
  requestRaw(path: `/api/${string}`, options: RequestOptions = {}): Promise<Response> {
    this.validatePath(path);
    return this.transport.requestRaw(`${this.apiBaseUrl}${path.slice("/api".length)}`, { ...options, operation: options.operation ?? "v2" });
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
 * List/status are integration-tested on pinned Solr 8.11.4, 9.11.0, and
 * 10.1.0. The reload/rename/unload subroutes are tested on 9.11.0 and 10.1.0
 * only: Solr 8.11.4 exposes those lifecycle commands on POST /api/cores/{core},
 * not the post-9.3 subroutes implemented here.
 *
 * CoreAdmin is intended for standalone/user-managed cores; SolrCloud users
 * should use the Collections V2 API instead.
 * Compatibility claims are operation- and version-specific; see docs/compatibility.md.
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
