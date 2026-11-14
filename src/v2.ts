import { SolrHttpError } from "./errors.js";
import type { SolrTransport } from "./transport.js";
import type { RequestControlOptions, RequestOptions, SolrV2ClusterStatusResponse, SolrV2CollectionListResponse, SolrV2CollectionStatusOptions, SolrV2CollectionStatusResponse, SolrV2CollectionCreateParams, SolrV2CollectionDeleteOptions, SolrV2CollectionOperationResponse, SolrV2AliasListResponse, SolrV2AliasStatusResponse, SolrV2AliasCreateParams, SolrV2AliasMutationOptions, SolrV2AliasPropertyValue, SolrV2AliasOperationResponse, SolrV2AliasPropertiesResponse, SolrV2AliasPropertyResponse, SolrV2AddReplicaParams, SolrV2ReplicaMutationOptions, SolrV2DeleteReplicaOptions, SolrV2ReplicaOperationResponse, SolrV2CollectionBackupParams, SolrV2BackupListOptions, SolrV2BackupDeleteOptions, SolrV2BackupRestoreParams, SolrV2BackupOperationResponse, SolrV2BackupListResponse, SolrV2BackupDeleteResponse, SolrV2CoreOperationResponse, SolrV2CoreRenameParams, SolrV2CoreStatusOptions, SolrV2CoreStatusResponse, SolrV2CoreUnloadParams } from "./types.js";

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

  /** SolrCloud collection backup and restore operations (Solr 9.3+). */
  readonly backups: SolrV2BackupsClient;

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
    this.backups = new SolrV2BackupsClient(this);
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

  /**
   * Add replicas to a shard. This creates new SolrCloud topology and can consume
   * disk/CPU resources; callers should use an isolated or explicitly managed cluster.
   * The redesigned REST route is documented in Solr 9.x and 10.x.
   */
  addReplica(
    collection: string,
    params: SolrV2AddReplicaParams,
    options: SolrV2ReplicaMutationOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2ReplicaOperationResponse> {
    const collectionPath = this.collectionPath(collection);
    const shard = params?.shard;
    const route = params?.route;
    if ((typeof shard !== "string" || shard.trim().length === 0) &&
      (typeof route !== "string" || route.trim().length === 0)) {
      throw new TypeError("Solr V2 addReplica requires a non-empty shard or route");
    }
    if (shard !== undefined && route !== undefined) {
      throw new TypeError("Solr V2 addReplica accepts shard or route, not both");
    }
    if (shard !== undefined) this.validatePathSegment(shard, "shard");
    if (route !== undefined && route.trim().length === 0) {
      throw new TypeError("Solr V2 addReplica route must be non-empty");
    }
    if (params.type !== undefined && !["nrt", "tlog", "pull"].includes(params.type)) {
      throw new TypeError("Solr V2 addReplica type must be nrt, tlog, or pull");
    }
    if (params.node !== undefined && (typeof params.node !== "string" || params.node.trim().length === 0)) {
      throw new TypeError("Solr V2 addReplica node must be non-empty");
    }
    if (params.nodeSet !== undefined &&
      (!Array.isArray(params.nodeSet) || params.nodeSet.length === 0 ||
        params.nodeSet.some(node => typeof node !== "string" || node.trim().length === 0))) {
      throw new TypeError("Solr V2 addReplica nodeSet must contain non-empty node names");
    }
    if (params.node !== undefined && params.nodeSet !== undefined) {
      throw new TypeError("Solr V2 addReplica accepts node or nodeSet, not both");
    }
    for (const [name, count] of Object.entries({
      nrtReplicas: params.nrtReplicas,
      tlogReplicas: params.tlogReplicas,
      pullReplicas: params.pullReplicas
    })) {
      if (count !== undefined && (!Number.isInteger(count) || count < 0)) {
        throw new TypeError(`Solr V2 addReplica ${name} must be a non-negative integer`);
      }
    }
    const body: Record<string, unknown> = {};
    if (route !== undefined) body.route = route;
    for (const key of ["node", "nodeSet", "instanceDir", "dataDir", "type", "nrtReplicas",
      "tlogReplicas", "pullReplicas", "waitForFinalState"] as const) {
      if (params[key] !== undefined) body[key] = params[key];
    }
    const shardPath = shard === undefined ? "" : `/shards/${encodeURIComponent(shard)}`;
    return this.v2.request<SolrV2ReplicaOperationResponse>(
      `${collectionPath}${shardPath}/replicas`,
      {
        ...requestOptions,
        method: "POST",
        body,
        ...(options.async === undefined ? {} : { query: this.asyncQuery(options.async) })
      }
    );
  }

  /**
   * Delete exactly one named replica. To avoid implicit data loss, this client
   * defaults deleteInstanceDir/deleteDataDir/deleteIndex to false; callers
   * must explicitly opt in to each directory/index deletion.
   */
  deleteReplica(
    collection: string,
    shard: string,
    replica: string,
    options: SolrV2DeleteReplicaOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2ReplicaOperationResponse> {
    const path = `${this.collectionPath(collection)}/shards/${this.validatePathSegment(shard, "shard")}/replicas/${this.validatePathSegment(replica, "replica")}`;
    const query: Record<string, string | boolean> = {
      deleteInstanceDir: options.deleteInstanceDir ?? false,
      deleteDataDir: options.deleteDataDir ?? false,
      deleteIndex: options.deleteIndex ?? false
    };
    for (const key of ["onlyIfDown", "followAliases"] as const) {
      if (options[key] !== undefined) query[key] = options[key]!;
    }
    if (options.async !== undefined) query.async = this.asyncId(options.async);
    return this.v2.request<SolrV2ReplicaOperationResponse>(path, {
      ...requestOptions,
      method: "DELETE",
      query
    });
  }

  private validatePathSegment(value: string, label: string): string {
    if (typeof value !== "string" || value.trim().length === 0 || value === "." || value === ".." ||
      value.includes("/") || value.includes("\\")) {
      throw new TypeError(`Solr V2 replica operation requires a non-empty ${label} name without path separators`);
    }
    return encodeURIComponent(value);
  }

  private asyncQuery(asyncId: string): Record<string, string> {
    return { async: this.asyncId(asyncId) };
  }

  private asyncId(asyncId: string): string {
    if (typeof asyncId !== "string" || asyncId.trim().length === 0) {
      throw new TypeError("Solr V2 replica async request id must be a non-empty string");
    }
    return asyncId;
  }

  /**
   * Create an incremental backup of one collection (Solr 9.3+).
   * The location must be accessible at the same path by all SolrCloud nodes.
   */
  backup(
    collection: string,
    backupName: string,
    params: SolrV2CollectionBackupParams,
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2BackupOperationResponse> {
    const path = `${this.collectionPath(collection)}/backups/${this.validatePathSegment(backupName, "backup")}/versions`;
    if (typeof params.location !== "string" || params.location.trim().length === 0) {
      throw new TypeError("Solr V2 collection backup requires a non-empty location");
    }
    if (params.repository !== undefined && params.repository.trim().length === 0) {
      throw new TypeError("Solr V2 collection backup repository must be non-empty");
    }
    if (params.async !== undefined) this.asyncId(params.async);
    if (params.maxNumBackupPoints !== undefined &&
      (!Number.isInteger(params.maxNumBackupPoints) || params.maxNumBackupPoints < 1)) {
      throw new TypeError("Solr V2 maxNumBackupPoints must be a positive integer");
    }
    const { async: asyncId, ...body } = params;
    return this.v2.request<SolrV2BackupOperationResponse>(path, {
      ...requestOptions,
      method: "POST",
      body,
      ...(asyncId === undefined ? {} : { query: { async: this.asyncId(asyncId) } })
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
    if (typeof collection !== "string" || collection.trim().length === 0 || collection === "." || collection === ".." ||
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
 * SolrCloud collection backup operations using the REST-style V2 routes.
 * The routes were redesigned in Solr 9.3; no legacy Solr 8 command-envelope
 * translation or V1 fallback is performed.
 */
export class SolrV2BackupsClient {
  constructor(private readonly v2: SolrV2Client) {}

  /** List incremental backup points stored at a repository location. */
  list(
    backupName: string,
    options: SolrV2BackupListOptions,
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2BackupListResponse> {
    const query = this.locationQuery(options);
    return this.v2.request<SolrV2BackupListResponse>(
      `/api/backups/${this.pathSegment(backupName, "backup")}/versions`,
      { ...requestOptions, method: "GET", query }
    );
  }

  /** Delete one backup point by ID. This permanently removes backup metadata/files. */
  delete(
    backupName: string,
    backupId: number,
    options: SolrV2BackupDeleteOptions,
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2BackupDeleteResponse> {
    if (!Number.isSafeInteger(backupId) || backupId < 0) {
      throw new TypeError("Solr V2 backupId must be a non-negative safe integer");
    }
    const query = this.locationQuery(options);
    return this.v2.request<SolrV2BackupDeleteResponse>(
      `/api/backups/${this.pathSegment(backupName, "backup")}/versions/${backupId}`,
      { ...requestOptions, method: "DELETE", query }
    );
  }

  /**
   * Restore a backup point into an existing or new collection. Restore replaces
   * the target collection's index contents; use a disposable target when testing.
   */
  restore(
    backupName: string,
    params: SolrV2BackupRestoreParams,
    options: { async?: string } = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2BackupOperationResponse> {
    this.pathSegment(params.collection, "collection");
    if (params.location !== undefined && params.location.trim().length === 0) {
      throw new TypeError("Solr V2 backup restore location must be non-empty");
    }
    if (params.repository !== undefined && params.repository.trim().length === 0) {
      throw new TypeError("Solr V2 backup restore repository must be non-empty");
    }
    if (params.backupId !== undefined && (!Number.isSafeInteger(params.backupId) || params.backupId < 0)) {
      throw new TypeError("Solr V2 backupId must be a non-negative safe integer");
    }
    const { backupId, ...body } = params;
    const query: Record<string, string | number> = {};
    if (backupId !== undefined) query.backupId = backupId;
    if (options.async !== undefined) query.async = this.asyncId(options.async);
    return this.v2.request<SolrV2BackupOperationResponse>(
      `/api/backups/${this.pathSegment(backupName, "backup")}/restore`,
      { ...requestOptions, method: "POST", body, ...(Object.keys(query).length ? { query } : {}) }
    );
  }

  private locationQuery(options: SolrV2BackupListOptions): Record<string, string> {
    if (typeof options.location !== "string" || options.location.trim().length === 0) {
      throw new TypeError("Solr V2 backup operation requires a non-empty location");
    }
    const query: Record<string, string> = { location: options.location };
    if (options.repository !== undefined) {
      if (options.repository.trim().length === 0) {
        throw new TypeError("Solr V2 backup repository must be non-empty");
      }
      query.repository = options.repository;
    }
    if (options.async !== undefined) query.async = this.asyncId(options.async);
    return query;
  }

  private pathSegment(value: string, label: string): string {
    if (typeof value !== "string" || value.trim().length === 0 || value === "." || value === ".." ||
      value.includes("/") || value.includes("\\")) {
      throw new TypeError(`Solr V2 backup operation requires a non-empty ${label} name without path separators`);
    }
    return encodeURIComponent(value);
  }

  private asyncId(value: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError("Solr V2 backup async request id must be non-empty");
    }
    return value;
  }
}

/**
 * Read-only SolrCloud alias discovery operations.
 * GET /api/aliases and GET /api/aliases/{alias} are documented in the Solr 9.2+ reference guides.
 * The Solr 8.11 line is intentionally not claimed.
 */
/**
 * SolrCloud alias operations using the redesigned V2 routes (Solr 9.3+).
 *
 * Standard alias create/delete and alias property endpoints are kept distinct
 * from the legacy V2 /api/collections command envelope used by Solr 8.11.
 * Routed-alias creation is intentionally not modelled by this standard-alias
 * create method; use the generic V2 request escape hatch for advanced routers.
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
    const path = this.aliasPath(alias);
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

  /** Create or replace a standard alias pointing to one or more existing collections. */
  create(
    params: SolrV2AliasCreateParams,
    options: SolrV2AliasMutationOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2AliasOperationResponse> {
    this.validateAliasName(params?.name);
    if (!Array.isArray(params.collections) || params.collections.length === 0 ||
      params.collections.some(collection => typeof collection !== "string" || collection.trim().length === 0)) {
      throw new TypeError("Solr V2 Aliases create requires at least one non-empty collection name");
    }
    return this.v2.request<SolrV2AliasOperationResponse>("/api/aliases", {
      ...requestOptions,
      method: "POST",
      body: { name: params.name, collections: params.collections },
      ...(options.async === undefined ? {} : { query: this.asyncQuery(options.async) })
    });
  }

  /** Delete an alias. The underlying collections are not deleted. */
  delete(
    alias: string,
    options: SolrV2AliasMutationOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2AliasOperationResponse> {
    return this.v2.request<SolrV2AliasOperationResponse>(this.aliasPath(alias), {
      ...requestOptions,
      method: "DELETE",
      ...(options.async === undefined ? {} : { query: this.asyncQuery(options.async) })
    });
  }

  /** Read all metadata properties on an alias. */
  getProperties(
    alias: string,
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2AliasPropertiesResponse> {
    return this.v2.request<SolrV2AliasPropertiesResponse>(`${this.aliasPath(alias)}/properties`, {
      ...requestOptions,
      method: "GET"
    });
  }

  /** Read one metadata property on an alias. */
  getProperty(
    alias: string,
    property: string,
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2AliasPropertyResponse> {
    return this.v2.request<SolrV2AliasPropertyResponse>(this.propertyPath(alias, property), {
      ...requestOptions,
      method: "GET"
    });
  }

  /** Set one or more alias metadata properties without replacing other properties. */
  setProperties(
    alias: string,
    properties: Readonly<Record<string, SolrV2AliasPropertyValue>>,
    options: SolrV2AliasMutationOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2AliasOperationResponse> {
    this.validateProperties(properties);
    return this.v2.request<SolrV2AliasOperationResponse>(`${this.aliasPath(alias)}/properties`, {
      ...requestOptions,
      method: "PUT",
      body: { properties },
      ...(options.async === undefined ? {} : { query: this.asyncQuery(options.async) })
    });
  }

  /** Set one alias metadata property. */
  setProperty(
    alias: string,
    property: string,
    value: SolrV2AliasPropertyValue,
    options: SolrV2AliasMutationOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2AliasOperationResponse> {
    this.validatePropertyValue(value);
    return this.v2.request<SolrV2AliasOperationResponse>(this.propertyPath(alias, property), {
      ...requestOptions,
      method: "PUT",
      body: { value },
      ...(options.async === undefined ? {} : { query: this.asyncQuery(options.async) })
    });
  }

  /** Delete one alias metadata property. */
  deleteProperty(
    alias: string,
    property: string,
    options: SolrV2AliasMutationOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrV2AliasOperationResponse> {
    return this.v2.request<SolrV2AliasOperationResponse>(this.propertyPath(alias, property), {
      ...requestOptions,
      method: "DELETE",
      ...(options.async === undefined ? {} : { query: this.asyncQuery(options.async) })
    });
  }

  private aliasPath(alias: string): `/api/aliases/${string}` {
    this.validateAliasName(alias);
    return `/api/aliases/${encodeURIComponent(alias)}`;
  }

  private propertyPath(alias: string, property: string): `/api/aliases/${string}/properties/${string}` {
    if (typeof property !== "string" || property.trim().length === 0 ||
      property === "." || property === ".." || property.includes("/") || property.includes(String.fromCharCode(92))) {
      throw new TypeError("Solr V2 Aliases requires a non-empty property name without path separators");
    }
    return `${this.aliasPath(alias)}/properties/${encodeURIComponent(property)}`;
  }

  private validateAliasName(alias: string): void {
    if (typeof alias !== "string" || alias.trim().length === 0 ||
      alias === "." || alias === ".." || alias.includes("/") || alias.includes(String.fromCharCode(92))) {
      throw new TypeError("Solr V2 Aliases requires a non-empty alias name without path separators");
    }
  }

  private validateProperties(properties: Readonly<Record<string, SolrV2AliasPropertyValue>>): void {
    if (properties === null || typeof properties !== "object" || Array.isArray(properties) ||
      Object.keys(properties).length === 0) {
      throw new TypeError("Solr V2 Aliases setProperties requires at least one property");
    }
    for (const [name, value] of Object.entries(properties)) {
      if (name.trim().length === 0 || name !== name.trim() || name === "." || name === ".." ||
        name.includes("/") || name.includes(String.fromCharCode(92))) {
        throw new TypeError("Solr V2 Aliases requires non-empty property names without path separators");
      }
      this.validatePropertyValue(value);
    }
  }

  private validatePropertyValue(value: SolrV2AliasPropertyValue): void {
    if (typeof value !== "string") {
      throw new TypeError("Solr V2 Aliases property values must be strings");
    }
    if (value === "") {
      throw new TypeError("Solr V2 Aliases property values must not be empty; use deleteProperty() to remove a property");
    }
  }

  private asyncQuery(asyncId: string): Record<string, string> {
    if (typeof asyncId !== "string" || asyncId.trim().length === 0) {
      throw new TypeError("Solr V2 Aliases async request id must be a non-empty string");
    }
    return { async: asyncId };
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
