import { SolrHttpError } from "./errors.js";
import type { SolrTransport } from "./transport.js";
import type { RequestControlOptions, RequestOptions, SolrV2ClusterStatusResponse, SolrV2CollectionListResponse, SolrV2CollectionStatusOptions, SolrV2CollectionStatusResponse, SolrV2CollectionCreateParams, SolrV2CollectionDeleteOptions, SolrV2CollectionOperationResponse, SolrV2AliasListResponse, SolrV2AliasStatusResponse, SolrV2CoreOperationResponse, SolrV2CoreRenameParams, SolrV2CoreStatusOptions, SolrV2CoreStatusResponse, SolrV2CoreUnloadParams } from "./types.js";

/**
 * Explicit Solr V2 API namespace sharing the configured V1 transport.
 *
 * Exposes a generic JSON/raw request escape hatch and operation-specific typed
 * typed Core Admin, Collections, and cluster discovery methods. V1 methods never fall back to V2 routes.
 */
export class SolrV2Client {
  private readonly apiBaseUrl: string;

  /** Typed Core Admin V2 operations. These target standalone/user-managed cores, not SolrCloud collections. */
  readonly coreAdmin: SolrV2CoreAdminClient;

  /** Read-only SolrCloud Collections V2 operations. */
  readonly collections: SolrV2CollectionsClient;

  /** Read-only cluster-level V2 discovery operations. */
  readonly cluster: SolrV2ClusterClient;

  /** Read-only SolrCloud alias discovery operations (Solr 9.3+). */
  readonly aliases: SolrV2AliasesClient;

  constructor(private readonly transport: SolrTransport, baseUrl = "http://localhost:8983/") {
    const configuredBase = new URL(baseUrl);
    const segments = configuredBase.pathname.split("/").filter(Boolean);
    // The standard Solr V1 webapp context is /solr, but V2 is mounted at /api.
    // Preserve any reverse-proxy prefix while removing only a terminal /solr.
    if (segments.at(-1) === "solr") segments.pop();
    const proxyPrefix = segments.length ? `/${segments.join("/")}` : "";
    this.apiBaseUrl = `${configuredBase.origin}${proxyPrefix}/api`;
    this.coreAdmin = new SolrV2CoreAdminClient(this);
    this.collections = new SolrV2CollectionsClient(this);
    this.cluster = new SolrV2ClusterClient(this);
    this.aliases = new SolrV2AliasesClient(this);
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
 * Read-only SolrCloud Collections V2 discovery operations.
 *
 * Collection listing and per-collection status are documented by the official
 * Solr V2 Collections API. The status response is intentionally open because
 * its index and shard details vary by Solr version and requested flags.
 */
export class SolrV2CollectionsClient {
  constructor(private readonly v2: SolrV2Client) {}

  /** List collection names in the connected SolrCloud cluster. */
  list(requestOptions: RequestControlOptions = {}): Promise<SolrV2CollectionListResponse> {
    return this.v2.request<SolrV2CollectionListResponse>("/api/collections", {
      ...requestOptions,
      method: "GET"
    });
  }

  /**
   * Create a collection using the post-Solr-9.3 V2 request shape.
   * The older Solr 8.11 V2 command envelope is intentionally not emulated.
   */
  create(
    params: SolrV2CollectionCreateParams,
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2CollectionOperationResponse> {
    if (typeof params.name !== "string" || params.name.trim().length === 0 ||
      typeof params.config !== "string" || params.config.trim().length === 0) {
      throw new TypeError("Solr V2 Collections create requires non-empty name and config");
    }
    return this.v2.request<SolrV2CollectionOperationResponse>("/api/collections", {
      ...requestOptions,
      method: "POST",
      body: params
    });
  }

  /**
   * Delete one collection. This is destructive; callers must explicitly opt in
   * to deleting its instance, data, or index directories.
   */
  delete(
    collection: string,
    options: SolrV2CollectionDeleteOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2CollectionOperationResponse> {
    const path = this.collectionPath(collection);
    const query: Record<string, boolean> = {};
    if (options.deleteInstanceDir !== undefined) query.deleteInstanceDir = options.deleteInstanceDir;
    if (options.deleteDataDir !== undefined) query.deleteDataDir = options.deleteDataDir;
    if (options.deleteIndex !== undefined) query.deleteIndex = options.deleteIndex;
    return this.v2.request<SolrV2CollectionOperationResponse>(path, {
      ...requestOptions,
      method: "DELETE",
      ...(Object.keys(query).length > 0 ? { query } : {})
    });
  }

  /** Reload a collection using the REST-style V2 route (Solr 9.3+). */
  reload(
    collection: string,
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2CollectionOperationResponse> {
    return this.v2.request<SolrV2CollectionOperationResponse>(`${this.collectionPath(collection)}/reload`, {
      ...requestOptions,
      method: "POST"
    });
  }

  private collectionPath(collection: string): `/api/collections/${string}` {
    if (typeof collection !== "string" || collection.trim().length === 0 ||
      collection.includes("/") || collection.includes("\\")) {
      throw new TypeError("Solr V2 Collections requires a non-empty collection name without path separators");
    }
    return `/api/collections/${encodeURIComponent(collection)}`;
  }

  /** Read status for one collection. */
  status(
    collection: string,
    options: SolrV2CollectionStatusOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2CollectionStatusResponse> {
    const path = this.collectionPath(collection);
    const query: Record<string, boolean> = {};
    if (options.coreInfo !== undefined) query.coreInfo = options.coreInfo;
    if (options.segments !== undefined) query.segments = options.segments;
    if (options.fieldInfo !== undefined) query.fieldInfo = options.fieldInfo;
    if (options.sizeInfo !== undefined) query.sizeInfo = options.sizeInfo;
    return this.v2.request<SolrV2CollectionStatusResponse>(
      path,
      {
        ...requestOptions,
        method: "GET",
        ...(Object.keys(query).length > 0 ? { query } : {})
      }
    );
  }
}

/**
 * Read-only SolrCloud alias discovery operations.
 * GET /api/aliases and GET /api/aliases/{alias} are documented in the Solr 9.2+ reference guides.
 * The Solr 8.11 line is intentionally not claimed.
 */
export class SolrV2AliasesClient {
  constructor(private readonly v2: SolrV2Client) {}

  /** List aliases and their collection mappings. */
  list(requestOptions: RequestControlOptions = {}): Promise<SolrV2AliasListResponse> {
    return this.v2.request<SolrV2AliasListResponse>("/api/aliases", {
      ...requestOptions,
      method: "GET"
    });
  }

  /** Read one alias, including its collection targets and properties. */
  status(alias: string, requestOptions: RequestControlOptions = {}): Promise<SolrV2AliasStatusResponse> {
    if (typeof alias !== "string" || alias.trim().length === 0 || alias === "." || alias === ".." || alias.includes("/") || alias.includes(String.fromCharCode(92))) {
      throw new TypeError("Solr V2 Aliases requires a non-empty alias name without path separators");
    }
    const path = `/api/aliases/${encodeURIComponent(alias)}` as `/api/${string}`;
    return this.v2.request<SolrV2AliasStatusResponse>(path, {
      ...requestOptions,
      method: "GET"
    }).catch(async error => {
      // Some Solr 10.1.0 runtimes expose DELETE but not the documented detail GET.
      // The V2 list response contains the same mapping and properties, so use it
      // only for this specific 405 compatibility case.
      if (!(error instanceof SolrHttpError) || error.status !== 405) throw error;
      const listed = await this.list(requestOptions);
      const mapping = listed.aliases?.[alias];
      if (mapping === undefined) {
        throw new SolrHttpError(404, "Not Found", error.endpoint, "", undefined);
      }
      return {
        alias,
        collections: mapping.split(",").map(collection => collection.trim()).filter(Boolean),
        ...(listed.properties?.[alias] === undefined ? {} : { properties: listed.properties[alias] })
      };
    });
  }
}

export class SolrV2ClusterClient {
  constructor(private readonly v2: SolrV2Client) {}

  /**
   * Read cluster status. GET /api/cluster is documented for Solr 9.11 and 10.1;
   * the Solr 8.11 V2 guide documents cluster command routes, not this GET operation.
   */
  status(requestOptions: RequestControlOptions = {}): Promise<SolrV2ClusterStatusResponse> {
    return this.v2.request<SolrV2ClusterStatusResponse>("/api/cluster", {
      ...requestOptions,
      method: "GET"
    });
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
