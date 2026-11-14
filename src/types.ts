export type SolrVersion = "8" | "9" | "10";
export type SolrHttpMethod = "GET" | "POST" | "PUT" | "DELETE";
export type CoreAdminAction = "STATUS" | "CREATE" | "RELOAD" | "UNLOAD" | "RENAME" | "SWAP" | "MERGEINDEXES" | "SPLIT" | "REQUESTSTATUS" | "REQUESTRECOVERY";
export type CollectionAdminAction = "LIST" | "CREATE" | "DELETE" | "RELOAD" | "MODIFYCOLLECTION" | "MIGRATE" | "CREATEALIAS" | "DELETEALIAS" | "LISTALIASES" | "CLUSTERSTATUS" | "ADDREPLICA" | "DELETEREPLICA" | "MOVEREPLICA" | "BALANCESHARDUNIQUE" | "REBALANCELEADERS" | "ADDREPLICAPROP" | "DELETEREPLICAPROP" | "CREATESHARD" | "DELETESHARD" | "SPLITSHARD" | "FORCELEADER" | "ADDROLE" | "REMOVEROLE" | "BACKUP" | "RESTORE" | "LISTBACKUP" | "DELETEBACKUP" | "REQUESTSTATUS" | "DELETESTATUS";
/** Field types supported by the Solr Export Handler field list. */
export type SolrExportFieldType = "int" | "long" | "float" | "double" | "string" | "date" | "boolean";
/** One field-based Export sort criterion. Sort fields must be single-valued and have docValues. */
export interface SolrExportSortClause { field: string; direction: "asc" | "desc"; }
/** Raw Solr sort syntax or one or more structured field sort clauses. */
export type SolrExportSort = string | SolrExportSortClause | readonly (string | SolrExportSortClause)[];
/** Typed request parameters for the streaming /export handler. */
export interface SolrExportParams {
  q?: string;
  fq?: string | readonly string[];
  fl: string | readonly string[];
  sort: SolrExportSort;
  batchSize?: number;
  /** Solr 10.1 option for including stored-only fields in fl. */
  includeStoredFields?: boolean;
  expr?: string;
  wt?: "json" | "javabin" | "xsort";
  customParams?: Readonly<Record<string, string | number | boolean>>;
}

export type SolrAdminParams = Readonly<Record<string, string | number | boolean>>;

/** Query parameters supported by the Solr Metrics API. Unknown future groups and registries remain valid strings. */
export interface SolrMetricsParams {
  group?: string | readonly string[];
  registry?: string | readonly string[];
  prefix?: string;
  regex?: string;
  compact?: boolean;
  wt?: "json" | "prometheus";
  customParams?: SolrAdminParams;
}

/** Metric values vary by registry and Solr plugin; preserve unknown server values. */
export type SolrMetricValue = string | number | boolean | null | readonly unknown[] | Readonly<Record<string, unknown>>;

/** One named Metrics API registry, keyed by metric name. */
export type SolrMetricsRegistry = Readonly<Record<string, SolrMetricValue>>;

/** JSON Metrics API response. The registry names and metric names are server/plugin-defined. */
export interface SolrMetricsJsonResponse {
  responseHeader?: SolrResponseHeader;
  metrics?: Readonly<Record<string, SolrMetricsRegistry>>;
  [key: string]: unknown;
}

/** Solr may return JSON registries or Prometheus exposition text depending on writer/version. */
export type SolrMetricsResponse = SolrMetricsJsonResponse | string;

/** An extensible tuple emitted by a Streaming Expression. Expression operators define their own fields. */
export interface SolrStreamingExpressionTuple {
  /** Present on the terminal tuple in common Streaming Expressions responses. */
  EOF?: boolean;
  /** Optional execution-time metadata emitted by some expressions. */
  RESPONSE_TIME?: number;
  [key: string]: unknown;
}

/** A server-side expression failure represented as a tuple in an otherwise successful HTTP response. */
export interface SolrStreamingExpressionErrorTuple extends SolrStreamingExpressionTuple {
  EXCEPTION: string;
}

/** The result-set envelope returned by the JSON Streaming Expressions writer. */
export interface SolrStreamingExpressionResultSet<TTuple extends SolrStreamingExpressionTuple = SolrStreamingExpressionTuple | SolrStreamingExpressionErrorTuple> {
  docs?: readonly TTuple[];
  EOF?: boolean;
  RESPONSE_TIME?: number;
  [key: string]: unknown;
}

/** JSON response envelope for /stream. Unknown envelope and tuple fields remain available. */
export interface SolrStreamingExpressionResponse<TTuple extends SolrStreamingExpressionTuple = SolrStreamingExpressionTuple | SolrStreamingExpressionErrorTuple> {
  "result-set"?: SolrStreamingExpressionResultSet<TTuple>;
  [key: string]: unknown;
}

/** A single role or the set of roles assigned to a user. */
export type SolrAuthorizationRole = string | readonly string[];
/** Request-parameter constraints supported by the built-in RuleBasedAuthorizationPlugin. */
export type SolrAuthorizationParameterValues = string | number | boolean | null | readonly (string | number | boolean | null)[];
/** Stable built-in permission fields; plugin-specific fields belong in customOptions. */
export interface SolrAuthorizationPermission {
  name?: string;
  role?: SolrAuthorizationRole;
  collection?: string | readonly string[] | null;
  path?: string | readonly string[];
  method?: string | readonly string[];
  params?: Readonly<Record<string, SolrAuthorizationParameterValues>>;
  before?: number;
  index?: number;
  /** Explicit escape hatch for RuleBasedAuthorizationPlugin extensions and custom plugins. */
  customOptions?: Readonly<Record<string, unknown>>;
}
export interface SolrAuthorizationSetPermission extends SolrAuthorizationPermission { role: SolrAuthorizationRole; }
export interface SolrAuthorizationUpdatePermission extends SolrAuthorizationPermission { index: number; }
/** Commands supported by Solr's built-in RuleBasedAuthorizationPlugin. */
export type SolrAuthorizationCommand =
  | { "set-user-role": Readonly<Record<string, SolrAuthorizationRole | null>> }
  | { "set-permission": SolrAuthorizationSetPermission }
  | { "update-permission": SolrAuthorizationUpdatePermission }
  | { "delete-permission": number };
/** Read model for a permission returned by Solr; preserve plugin-defined response fields. */
export interface SolrAuthorizationPermissionResponse extends SolrAuthorizationPermission {
  [key: string]: unknown;
}
export interface SolrAuthorizationConfig {
  class?: string;
  "user-role"?: Readonly<Record<string, SolrAuthorizationRole>>;
  permissions?: readonly SolrAuthorizationPermissionResponse[];
  /** Solr/plugin-specific authorization configuration fields remain readable. */
  [key: string]: unknown;
}
export interface SolrAuthorizationResponse {
  authorization?: SolrAuthorizationConfig;
  responseHeader?: SolrResponseHeader;
  [key: string]: unknown;
}
/** Basic Authentication plugin properties documented by Solr. Unknown plugin properties remain extensible. */
export interface SolrBasicAuthProperties {
  blockUnknown?: boolean;
  realm?: string;
  forwardCredentials?: boolean;
  [key: string]: unknown;
}

/** set-user accepts a user-to-password map; MultiAuthPlugin may nest maps under a scheme key. */
export type SolrAuthenticationSetUserMap = Readonly<Record<string, string | Readonly<Record<string, string>>>>;

/** Typed commands for the BasicAuthPlugin and the documented MultiAuthPlugin Basic scheme wrapper. */
export type SolrAuthenticationCommand =
  | { "set-user": SolrAuthenticationSetUserMap }
  | { "delete-user": readonly string[] }
  | { "set-property": SolrBasicAuthProperties | Readonly<Record<string, SolrBasicAuthProperties>> };

/** BasicAuthPlugin security.json configuration. Credential values returned by Solr are hashed strings, not plaintext passwords. */
export interface SolrBasicAuthConfig extends SolrBasicAuthProperties {
  class?: string;
  credentials?: Readonly<Record<string, string>>;
}

/** Typed authentication section returned by GET /admin/authentication. */
export interface SolrAuthenticationResponse {
  authentication?: SolrBasicAuthConfig;
  responseHeader?: SolrResponseHeader;
  [key: string]: unknown;
}

export type SolrReplicationCommand =
  | "enablereplication"
  | "disablereplication"
  | "indexversion"
  | "fetchindex"
  | "abortfetch"
  | "snappull"
  | "abort"
  | "enablepoll"
  | "disablepoll"
  | "details"
  | "filelist"
  | "backup"
  | "restore"
  | "restorestatus"
  | "deletebackup";

export interface SolrReplicationBaseParams {
  customParams?: Readonly<Record<string, string | number | boolean>>;
}
export interface SolrReplicationFetchIndexParams extends SolrReplicationBaseParams {
  leaderUrl?: string;
  compression?: "internal" | "external";
  httpConnTimeout?: number;
  httpReadTimeout?: number;
  maxWriteMBPerSec?: number;
}
export interface SolrReplicationBackupParams extends SolrReplicationBaseParams {
  name?: string;
  location?: string;
  repository?: string;
  numberToKeep?: number;
  commitName?: string;
}
export interface SolrReplicationRestoreParams extends SolrReplicationBaseParams {
  name?: string;
  location?: string;
  repository?: string;
}
export interface SolrReplicationDeleteBackupParams extends SolrReplicationBaseParams {
  name: string;
  location?: string;
  repository?: string;
}
export type SolrReplicationFileListParams = SolrReplicationBaseParams & (
  | { generation: number; indexversion?: never }
  | { generation?: never; indexversion: number }
);
export type SolrReplicationParams<A extends SolrReplicationCommand> =
  A extends "fetchindex" | "snappull" ? SolrReplicationFetchIndexParams :
  A extends "filelist" ? SolrReplicationFileListParams :
  A extends "backup" ? SolrReplicationBackupParams :
  A extends "restore" ? SolrReplicationRestoreParams :
  A extends "deletebackup" ? SolrReplicationDeleteBackupParams :
  SolrReplicationBaseParams;

export interface SolrReplicationResponseHeader {
  status: number;
  QTime?: number;
}
export interface SolrReplicationCommandResponse {
  responseHeader?: SolrReplicationResponseHeader;
  status?: string;
  message?: string;
  [key: string]: unknown;
}
export interface SolrReplicationIndexVersionResponse extends SolrReplicationCommandResponse {
  indexversion: number | string;
  generation?: number;
}
export interface SolrReplicationFileMetadata {
  name?: string;
  size?: number;
  lastmodified?: number | string;
  checksum?: string;
  alias?: string;
  [key: string]: unknown;
}
export interface SolrReplicationFileListResponse extends SolrReplicationCommandResponse {
  filelist?: readonly SolrReplicationFileMetadata[];
  confFiles?: readonly SolrReplicationFileMetadata[];
}
export interface SolrReplicationBackupStatus {
  status?: "waiting for commit" | "running" | "success" | "failed" | (string & {});
  startTime?: string;
  endTime?: string;
  snapshotCompletedAt?: string;
  snapshotName?: string;
  directoryName?: string;
  fileCount?: number;
  finishedFileCount?: number;
  indexFileCount?: number;
  exception?: string | Readonly<Record<string, unknown>>;
  snapShootException?: string | Readonly<Record<string, unknown>>;
}
export interface SolrReplicationRestoreStatus {
  status?: "In Progress" | "success" | "failed" | (string & {});
  snapshotName?: string;
  exception?: string | Readonly<Record<string, unknown>>;
}
export interface SolrReplicationDetailsResponse extends SolrReplicationCommandResponse {
  /** Nested details shape returned by current ReplicationHandler implementations. */
  details?: Readonly<Record<string, unknown>> & {
    backup?: SolrReplicationBackupStatus;
  };
  /** Legacy Solr 8 response shape. */
  backup?: SolrReplicationBackupStatus;
}
export interface SolrReplicationRestoreStatusResponse extends SolrReplicationCommandResponse {
  restorestatus?: SolrReplicationRestoreStatus;
}
export type SolrReplicationResponse<A extends SolrReplicationCommand> =
  A extends "indexversion" ? SolrReplicationIndexVersionResponse :
  A extends "filelist" ? SolrReplicationFileListResponse :
  A extends "details" ? SolrReplicationDetailsResponse :
  A extends "restorestatus" ? SolrReplicationRestoreStatusResponse :
  SolrReplicationCommandResponse;

export interface SolrReplicationFileContentParams extends SolrReplicationBaseParams {
  directoryType: "file" | "cf" | "tlogFile";
  filePath: string;
  offset?: number;
  length?: number;
  compression?: boolean;
  checksum?: boolean;
  maxWriteMBPerSec?: number;
  generation?: number;
}


/** Custom key/value parameters for administrative actions not yet modelled by this client. */
export type SolrAdminCustomParams = SolrAdminParams;

/** Values accepted by Config API properties and plugin configuration. */
export type SolrConfigValue = string | number | boolean | null | readonly SolrConfigValue[] | { readonly [key: string]: SolrConfigValue };

/** Open Config API parameter map. Known keys below receive autocomplete and value checking; Solr/plugin extensions remain supported. */
export type SolrConfigParameterMap = Readonly<Record<string, SolrConfigValue>>;

/** Common request-handler defaults/appends/invariants; arbitrary Solr request parameters remain extensible. */
export interface SolrConfigRequestHandlerParams {
  q?: string;
  fq?: string | readonly string[];
  fl?: string | readonly string[];
  sort?: string;
  start?: number;
  rows?: number;
  wt?: string;
  indent?: boolean;
  echoParams?: "none" | "explicit" | "all";
  omitHeader?: boolean;
  timeAllowed?: number;
  cpuAllowed?: number;
  distrib?: boolean;
  shards?: string | readonly string[];
  useParams?: string | readonly string[];
  [key: string]: SolrConfigValue | undefined;
}

/** Events supported by Solr's standard searcher/commit listeners; custom plugin event names remain possible. */
export type SolrConfigListenerEvent = "firstSearcher" | "newSearcher" | "preCommit" | "postCommit" | (string & {});

/** Common Config API property names documented across the pinned Solr 8.11, 9.11, and 10.1 baselines. */
export type SolrConfigPropertyName =
  | "updateHandler.autoCommit.maxDocs"
  | "updateHandler.autoCommit.maxTime"
  | "updateHandler.autoCommit.openSearcher"
  | "updateHandler.autoSoftCommit.maxDocs"
  | "updateHandler.autoSoftCommit.maxTime"
  | "updateHandler.commitWithin.softCommit"
  | "query.filterCache.class"
  | "query.filterCache.size"
  | "query.filterCache.initialSize"
  | "query.filterCache.autowarmCount"
  | "query.filterCache.maxRamMB"
  | "query.filterCache.regenerator"
  | "query.queryResultCache.class"
  | "query.queryResultCache.size"
  | "query.queryResultCache.initialSize"
  | "query.queryResultCache.autowarmCount"
  | "query.queryResultCache.maxRamMB"
  | "query.queryResultCache.regenerator"
  | "query.documentCache.class"
  | "query.documentCache.size"
  | "query.documentCache.initialSize"
  | "query.documentCache.autowarmCount"
  | "query.documentCache.regenerator"
  | "query.fieldValueCache.class"
  | "query.fieldValueCache.size"
  | "query.fieldValueCache.initialSize"
  | "query.fieldValueCache.autowarmCount"
  | "query.fieldValueCache.regenerator"
  | "query.maxBooleanClauses"
  | "query.enableLazyFieldLoading"
  | "query.useFilterForSortedQuery"
  | "query.queryResultWindowSize"
  | "query.queryResultMaxDocCached"
  | "requestDispatcher.requestParsers.multipartUploadLimitInKB"
  | "requestDispatcher.requestParsers.formdataUploadLimitInKB";

/** Values are constrained by the corresponding common Config API property. */
export interface SolrConfigPropertyValueMap {
  "updateHandler.autoCommit.maxDocs"?: number;
  "updateHandler.autoCommit.maxTime"?: number;
  "updateHandler.autoCommit.openSearcher"?: boolean;
  "updateHandler.autoSoftCommit.maxDocs"?: number;
  "updateHandler.autoSoftCommit.maxTime"?: number;
  "updateHandler.commitWithin.softCommit"?: boolean;
  "query.filterCache.class"?: string;
  "query.filterCache.size"?: number;
  "query.filterCache.initialSize"?: number;
  "query.filterCache.autowarmCount"?: number | string;
  "query.filterCache.maxRamMB"?: number;
  "query.filterCache.regenerator"?: string;
  "query.queryResultCache.class"?: string;
  "query.queryResultCache.size"?: number;
  "query.queryResultCache.initialSize"?: number;
  "query.queryResultCache.autowarmCount"?: number | string;
  "query.queryResultCache.maxRamMB"?: number;
  "query.queryResultCache.regenerator"?: string;
  "query.documentCache.class"?: string;
  "query.documentCache.size"?: number;
  "query.documentCache.initialSize"?: number;
  "query.documentCache.autowarmCount"?: number | string;
  "query.documentCache.regenerator"?: string;
  "query.fieldValueCache.class"?: string;
  "query.fieldValueCache.size"?: number;
  "query.fieldValueCache.initialSize"?: number;
  "query.fieldValueCache.autowarmCount"?: number | string;
  "query.fieldValueCache.regenerator"?: string;
  "query.maxBooleanClauses"?: number;
  "query.enableLazyFieldLoading"?: boolean;
  "query.useFilterForSortedQuery"?: boolean;
  "query.queryResultWindowSize"?: number;
  "query.queryResultMaxDocCached"?: number;
  "requestDispatcher.requestParsers.multipartUploadLimitInKB"?: number;
  "requestDispatcher.requestParsers.formdataUploadLimitInKB"?: number;
}
export type SolrConfigPropertyValues = Partial<SolrConfigPropertyValueMap>;

/** Response header returned by Config API mutation commands. */
export interface SolrConfigResponseHeader {
  status: number;
  QTime?: number;
  [key: string]: unknown;
}
export interface SolrConfigCommandResponse {
  responseHeader?: SolrConfigResponseHeader;
  [key: string]: unknown;
}
/** Cache settings exposed in the effective Solr config response. */
export interface SolrConfigCacheSettings {
  class?: string;
  size?: number;
  initialSize?: number;
  autowarmCount?: number | string;
  maxRamMB?: number;
  regenerator?: string;
  [key: string]: unknown;
}
export interface SolrConfigQuerySettings {
  filterCache?: SolrConfigCacheSettings;
  queryResultCache?: SolrConfigCacheSettings;
  documentCache?: SolrConfigCacheSettings;
  fieldValueCache?: SolrConfigCacheSettings;
  maxBooleanClauses?: number;
  enableLazyFieldLoading?: boolean;
  useFilterForSortedQuery?: boolean;
  queryResultWindowSize?: number;
  queryResultMaxDocCached?: number;
  /** Solr-version-specific circuit breaker settings. */
  memEnabled?: boolean;
  memThreshold?: number;
  useCircuitBreakers?: boolean;
  memoryCircuitBreakerThresholdPct?: number;
  [key: string]: unknown;
}
export interface SolrConfigCommitSettings {
  maxDocs?: number;
  maxTime?: number;
  openSearcher?: boolean;
}
export interface SolrConfigUpdateHandlerSettings {
  autoCommit?: SolrConfigCommitSettings;
  autoSoftCommit?: Pick<SolrConfigCommitSettings, "maxDocs" | "maxTime">;
  commitWithin?: { softCommit?: boolean };
  indexWriter?: { closeWaitsForMerges?: boolean };
  [key: string]: unknown;
}
export interface SolrConfigRequestParserSettings {
  enableRemoteStreaming?: boolean;
  enableStreamBody?: boolean;
  multipartUploadLimitInKB?: number;
  formdataUploadLimitInKB?: number;
  addHttpRequestToContext?: boolean;
}
export interface SolrConfigRequestDispatcherSettings {
  handleSelect?: boolean;
  requestParsers?: SolrConfigRequestParserSettings;
}
/** Plugin configuration as returned by GET /config (not the customOptions write helper). */
export interface SolrConfigReadPlugin {
  name?: string;
  class?: string;
  startup?: "lazy" | "eager";
  defaults?: SolrConfigParameterMap | SolrConfigRequestHandlerParams;
  appends?: SolrConfigParameterMap | SolrConfigRequestHandlerParams;
  invariants?: SolrConfigParameterMap | SolrConfigRequestHandlerParams;
  useParams?: string | readonly string[];
  [key: string]: unknown;
}
/** Effective request-handler entry; request defaults retain known parameter types and custom parameters. */
export interface SolrConfigRequestHandlerSettings extends SolrConfigReadPlugin {
  defaults?: SolrConfigRequestHandlerParams;
  appends?: SolrConfigRequestHandlerParams;
  invariants?: SolrConfigRequestHandlerParams;
  components?: string | readonly string[];
}
/** Effective search-component entry. Plugin-specific configuration remains open. */
export interface SolrConfigSearchComponentSettings extends SolrConfigReadPlugin {}
/** Effective response-writer entry with its stable content negotiation fields. */
export interface SolrConfigResponseWriterSettings extends SolrConfigReadPlugin {
  contentType?: string;
  charset?: string;
}
/** Effective listener entry with the standard Solr event names and custom plugin events. */
export interface SolrConfigListenerSettings extends SolrConfigReadPlugin {
  event?: SolrConfigListenerEvent;
}
/** Effective init-params set with its path selectors and open parameter values. */
export interface SolrConfigInitParamsSettings extends SolrConfigReadPlugin {
  path?: string | readonly string[];
}
export type SolrConfigReadPluginCollection = Readonly<Record<string, SolrConfigReadPlugin>> | readonly SolrConfigReadPlugin[];
export type SolrConfigInitParamsCollection = Readonly<Record<string, SolrConfigInitParamsSettings>> | readonly SolrConfigInitParamsSettings[];
export interface SolrConfigSettings {
  query?: SolrConfigQuerySettings;
  updateHandler?: SolrConfigUpdateHandlerSettings;
  requestDispatcher?: SolrConfigRequestDispatcherSettings;
  requestHandler?: Readonly<Record<string, SolrConfigRequestHandlerSettings>>;
  searchComponent?: Readonly<Record<string, SolrConfigSearchComponentSettings>>;
  queryResponseWriter?: Readonly<Record<string, SolrConfigResponseWriterSettings>>;
  initParams?: SolrConfigInitParamsCollection;
  listener?: Readonly<Record<string, SolrConfigListenerSettings>> | readonly SolrConfigListenerSettings[];
  directoryFactory?: SolrConfigReadPlugin;
  indexConfig?: Readonly<Record<string, unknown>>;
  codecFactory?: SolrConfigReadPlugin;
  [key: string]: unknown;
}
/** Effective configuration: merged configoverlay.json plus solrconfig.xml defaults and settings. */
export interface SolrConfigReadResponse {
  config?: SolrConfigSettings;
  responseHeader?: SolrConfigResponseHeader;
}
/** Config overlay response contains only values persisted through Config API commands. */
export interface SolrConfigOverlayResponse {
  overlay?: {
    znodeVersion?: number;
    props?: {
      query?: {
        filterCache?: SolrConfigCacheSettings;
        [key: string]: unknown;
      };
      updateHandler?: {
        autoCommit?: SolrConfigCommitSettings;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    userProps?: Readonly<Record<string, SolrConfigValue>>;
  };
  responseHeader?: SolrConfigResponseHeader;
}

/** Index statistics included by Core Admin STATUS when indexInfo=true. */
export interface SolrCoreIndexStatus {
  numDocs?: number;
  maxDoc?: number;
  deletedDocs?: number;
  version?: number;
  segmentCount?: number;
  numSegments?: number;
  sizeInBytes?: number;
  size?: string;
  [key: string]: unknown;
}

/** Per-core metadata returned in the Core Admin STATUS response. */
export interface SolrCoreStatus {
  name?: string;
  instanceDir?: string;
  dataDir?: string;
  indexDir?: string;
  config?: string;
  schema?: string;
  startTime?: string;
  uptime?: number;
  index?: SolrCoreIndexStatus;
  [key: string]: unknown;
}

/**
 * Core Admin STATUS response. Fields are optional because a core may be
 * unloaded, unavailable, or returned with indexInfo disabled. Unknown
 * server/version-specific metadata remains accessible through index signatures.
 */
export interface CoreAdminStatusResponse {
  responseHeader?: SolrResponseHeader;
  status?: Readonly<Record<string, SolrCoreStatus>>;
  initFailures?: Readonly<Record<string, string | Readonly<Record<string, unknown>>>>;
  [key: string]: unknown;
}

/** Common response envelope for non-STATUS Core Admin actions. */
export interface CoreAdminCommandResponse {
  responseHeader?: SolrResponseHeader;
  [key: string]: unknown;
}

/** Required request ID for polling a previously submitted asynchronous Core Admin action. */
export interface CoreRequestStatusParams {
  requestid: string;
  customParams?: SolrAdminCustomParams;
}

/** Expert-only request to ask a core to recover from its leader. */
export interface CoreRequestRecoveryParams {
  core: string;
  customParams?: SolrAdminCustomParams;
}

/** A typed Core Admin STATUS request. */
export interface CoreStatusParams {
  core?: string;
  indexInfo?: boolean;
  customParams?: SolrAdminCustomParams;
}
export interface CoreCreateParams {
  name: string;
  instanceDir?: string;
  dataDir?: string;
  config?: string;
  schema?: string;
  configSet?: string;
  collection?: string;
  shard?: string;
  numShards?: number;
  replicaType?: CollectionReplicaType;
  async?: string;
  customParams?: SolrAdminCustomParams;
}
export interface CoreReloadParams { core: string; async?: string; customParams?: SolrAdminCustomParams }
export interface CoreUnloadParams {
  core: string;
  deleteIndex?: boolean;
  deleteDataDir?: boolean;
  deleteInstanceDir?: boolean;
  async?: string;
  customParams?: SolrAdminCustomParams;
}
export interface CoreRenameParams { core: string; other: string; async?: string; customParams?: SolrAdminCustomParams }
export interface CoreSwapParams { core: string; other: string; async?: string; customParams?: SolrAdminCustomParams }
export interface CoreMergeIndexesParams {
  core: string;
  indexDir?: string | readonly string[];
  srcCore?: string | readonly string[];
  async?: string;
  customParams?: SolrAdminCustomParams;
}
export interface CoreSplitParams {
  core: string;
  path?: string | readonly string[];
  targetCore?: string | readonly string[];
  ranges?: string;
  splitKey?: string;
  async?: string;
  customParams?: SolrAdminCustomParams;
}
/** Action-specific Core Admin parameters; customParams is the explicit escape hatch. */
export type CoreAdminParams<A extends CoreAdminAction> =
  A extends "STATUS" ? CoreStatusParams :
  A extends "CREATE" ? CoreCreateParams :
  A extends "RELOAD" ? CoreReloadParams :
  A extends "UNLOAD" ? CoreUnloadParams :
  A extends "RENAME" ? CoreRenameParams :
  A extends "SWAP" ? CoreSwapParams :
  A extends "MERGEINDEXES" ? CoreMergeIndexesParams :
  A extends "SPLIT" ? CoreSplitParams :
  A extends "REQUESTSTATUS" ? CoreRequestStatusParams :
  CoreRequestRecoveryParams;

/** Replica types accepted by the SolrCloud Collections API. */
export type CollectionReplicaType = "nrt" | "tlog" | "pull";
export interface CollectionRequestBase { async?: string; customParams?: SolrAdminCustomParams }

export interface CollectionBackupParams extends CollectionRequestBase {
  name: string;
  collection: string;
  location?: string;
  repository?: string;
  maxNumBackupPoints?: number;
  backupConfigset?: boolean;
  incremental?: boolean;
  indexBackup?: "copy-files" | "none";
  commitName?: string;
}
export interface CollectionRestoreParams extends CollectionRequestBase {
  name: string;
  collection: string;
  location?: string;
  repository?: string;
  backupId?: number;
  createNodeSet?: string;
  "createNodeSet.shuffle"?: boolean;
  nrtReplicas?: number;
  tlogReplicas?: number;
  pullReplicas?: number;
  replicationFactor?: number;
  "collection.configName"?: string;
}
export interface CollectionListBackupParams extends CollectionRequestBase {
  name: string;
  location?: string;
  repository?: string;
}
export interface CollectionDeleteBackupBaseParams extends CollectionRequestBase {
  name: string;
  location?: string;
  repository?: string;
}
export type CollectionDeleteBackupParams = CollectionDeleteBackupBaseParams & (
  | { backupId: number; maxNumBackupPoints?: never; purgeUnused?: never }
  | { backupId?: never; maxNumBackupPoints: number; purgeUnused?: never }
  | { backupId?: never; maxNumBackupPoints?: never; purgeUnused: true }
);
export interface CollectionAsyncRequestStatusParams extends CollectionRequestBase { requestid: string }
export type CollectionAsyncRequestDeleteParams = CollectionRequestBase & (
  | { requestid: string; flush?: never }
  | { requestid?: never; flush: true }
);

export interface SolrCollectionBackupMetadata {
  collection?: string;
  numShards?: number;
  backupId?: number;
  indexVersion?: string;
  startTime?: string;
  endTime?: string;
  indexFileCount?: number;
  uploadedIndexFileCount?: number;
  indexSizeMB?: number;
  uploadedIndexFileMB?: number;
  shardBackupIds?: readonly string[] | Readonly<Record<string, string>>;
  [key: string]: unknown;
}
export interface SolrCollectionBackupResponse {
  responseHeader?: SolrReplicationResponseHeader;
  response?: SolrCollectionBackupMetadata;
  requestid?: string;
  [key: string]: unknown;
}
export interface SolrCollectionBackupListResponse {
  responseHeader?: SolrReplicationResponseHeader;
  collection?: string;
  backups?: readonly SolrCollectionBackupMetadata[];
  [key: string]: unknown;
}
export interface SolrCollectionBackupDeleteResponse {
  responseHeader?: SolrReplicationResponseHeader;
  collection?: string;
  deleted?: readonly unknown[];
  [key: string]: unknown;
}
export interface SolrCollectionAsyncRequestStatusResponse {
  responseHeader?: SolrReplicationResponseHeader;
  status?: {
    state?: "running" | "completed" | "failed" | "notfound" | (string & {});
    msg?: string;
    response?: unknown;
    [key: string]: unknown;
  };
  requestid?: string;
  [key: string]: unknown;
}
export interface SolrCollectionAsyncRequestDeleteResponse {
  responseHeader?: SolrReplicationResponseHeader;
  status?: string;
  requestid?: string;
  [key: string]: unknown;
}
export interface ListCollectionsParams extends CollectionRequestBase {}
export interface CreateCollectionParams extends CollectionRequestBase {
  name: string;
  numShards?: number;
  replicationFactor?: number;
  nrtReplicas?: number;
  tlogReplicas?: number;
  pullReplicas?: number;
  maxShardsPerNode?: number;
  createNodeSet?: string | readonly string[];
  /** V1 Collections API switch; only meaningful together with createNodeSet. */
  "createNodeSet.shuffle"?: boolean;
  "router.name"?: "compositeId" | "implicit" | (string & {});
  "router.field"?: string;
  shards?: string | readonly string[];
  "collection.configName"?: string;
  autoAddReplicas?: boolean;
  perReplicaState?: boolean;
  waitForFinalState?: boolean;
  alias?: string;
  /** Solr 8.11 legacy autoscaling placement options; removed in Solr 9+. */
  rule?: string | readonly string[];
  /** Solr 8.11 legacy autoscaling placement options; removed in Solr 9+. */
  snitch?: string | readonly string[];
  /** Solr 8.11 legacy collection policy; removed with autoscaling in Solr 9+. */
  policy?: string;
  /** Solr 8.11 legacy collection colocation; removed with autoscaling in Solr 9+. */
  withCollection?: string;
}
export interface DeleteCollectionParams extends CollectionRequestBase { name: string }
export interface ReloadCollectionParams extends CollectionRequestBase { name: string }
export interface ModifyCollectionParams extends CollectionRequestBase {
  collection: string;
  replicationFactor?: number;
  readOnly?: boolean;
  autoAddReplicas?: boolean;
  maxShardsPerNode?: number;
  rule?: string | readonly string[];
  snitch?: string | readonly string[];
}
export interface CreateAliasParams extends CollectionRequestBase { name: string; collections: string | readonly string[] }
export interface DeleteAliasParams extends CollectionRequestBase { name: string }
export interface ListAliasesParams extends CollectionRequestBase {}
export interface ClusterStatusParams extends CollectionRequestBase { collection?: string; shard?: string; route?: string; coreInfo?: boolean }

/** One replica entry in a SolrCloud CLUSTERSTATUS response. */
export interface SolrClusterReplica {
  core?: string;
  node_name?: string;
  base_url?: string;
  state?: string;
  type?: string;
  replicaType?: string;
  leader?: boolean | string;
  properties?: Readonly<Record<string, string>>;
  [key: string]: unknown;
}
/** One shard entry in a SolrCloud CLUSTERSTATUS response. */
export interface SolrClusterShard {
  state?: string;
  range?: string;
  replicas?: Readonly<Record<string, SolrClusterReplica>>;
  [key: string]: unknown;
}
/** One collection entry in a SolrCloud CLUSTERSTATUS response. */
export interface SolrClusterCollection {
  configName?: string;
  replicationFactor?: number;
  nrtReplicas?: number;
  tlogReplicas?: number;
  pullReplicas?: number;
  shards?: Readonly<Record<string, SolrClusterShard>>;
  [key: string]: unknown;
}
/** Cluster metadata is optional because filtered and version-specific responses vary. */
export interface SolrClusterStatus {
  live_nodes?: readonly string[];
  collections?: Readonly<Record<string, SolrClusterCollection>>;
  aliases?: Readonly<Record<string, string>>;
  roles?: Readonly<Record<string, readonly string[]>>;
  [key: string]: unknown;
}
/** Response to Collections API CLUSTERSTATUS; unknown server fields remain accessible. */
export interface SolrClusterStatusResponse {
  responseHeader?: SolrResponseHeader;
  cluster?: SolrClusterStatus;
  [key: string]: unknown;
}
/** Response to LISTALIASES. Alias values may contain comma-separated collection names. */
export interface SolrCollectionAliasesResponse {
  responseHeader?: SolrResponseHeader;
  aliases?: Readonly<Record<string, string>>;
  [key: string]: unknown;
}
/** Response envelope returned by CREATEALIAS and DELETEALIAS. */
export interface SolrCollectionAliasResponse {
  responseHeader?: SolrResponseHeader;
  [key: string]: unknown;
}

/** Response to Collections API LIST. Collection names are server-defined identifiers. */
export interface SolrCollectionListResponse {
  responseHeader?: SolrResponseHeader;
  collections?: readonly string[];
  [key: string]: unknown;
}
/** Common response envelope for collection lifecycle and policy actions. */
export interface SolrCollectionAdminResponse {
  responseHeader?: SolrResponseHeader;
  success?: boolean | Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}
/** Response envelope for replica lifecycle, movement, balancing, and property actions. */
export interface SolrCollectionReplicaResponse extends SolrCollectionAdminResponse {
  requestid?: string;
}
/** Response envelope for cluster-wide node role assignment actions. */
export interface SolrCollectionRoleResponse {
  responseHeader?: SolrResponseHeader;
  [key: string]: unknown;
}
export interface CreateShardParams extends CollectionRequestBase { collection: string; shard: string; createNodeSet?: string; nrtReplicas?: number; tlogReplicas?: number; pullReplicas?: number; waitForFinalState?: boolean }
export interface DeleteShardParams extends CollectionRequestBase { collection: string; shard: string; deleteInstanceDir?: boolean; deleteDataDir?: boolean; deleteIndex?: boolean }
export type SplitShardParams = CollectionRequestBase & {
  collection: string;
  ranges?: string;
  numSubShards?: number;
  splitMethod?: "rewrite" | "link" | "router";
  waitForFinalState?: boolean;
} & (
  | { shard: string; "split.key"?: string }
  | { shard?: never; "split.key": string }
);
export interface MigrateCollectionParams extends CollectionRequestBase {
  collection: string;
  "split.key": string;
  "target.collection": string;
  "forward.timeout"?: number;
}
/** Response envelope shared by shard lifecycle and MIGRATE actions. */
export interface SolrCollectionShardOperationResponse {
  responseHeader?: SolrResponseHeader;
  requestid?: string;
  success?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}
/** Parameters for the V1 Collections API FORCELEADER action. This expert operation can promote a stale replica and lose acknowledged updates. */
export interface ForceLeaderParams {
  collection: string;
  shard: string;
  customParams?: SolrAdminCustomParams;
}
export interface CollectionRoleParams extends CollectionRequestBase { node: string; role: string }

/** Parameters for Collections API ADDREPLICA. */
export interface AddReplicaParams extends CollectionRequestBase {
  collection: string;
  shard?: string;
  name?: string;
  type?: CollectionReplicaType;
  node?: string;
  createNodeSet?: string;
  waitForFinalState?: boolean;
}
/** Parameters for Collections API DELETEREPLICA. */
export interface DeleteReplicaParams extends CollectionRequestBase {
  collection: string;
  shard: string;
  replica: string;
  deleteInstanceDir?: boolean;
  deleteDataDir?: boolean;
  deleteIndex?: boolean;
}
export interface MoveReplicaBaseParams extends CollectionRequestBase {
  collection: string;
  targetNode: string;
  timeout?: number;
  inPlaceMove?: boolean;
}
export type MoveReplicaParams = MoveReplicaBaseParams & (
  | { replica: string; sourceNode?: never; shard?: never }
  | { replica?: never; sourceNode: string; shard: string }
);
export interface BalanceShardUniqueParams extends CollectionRequestBase {
  collection: string;
  property: string;
  onlyactivenodes?: boolean;
  shardUnique?: boolean;
}
export interface RebalanceLeadersParams extends CollectionRequestBase { collection: string; maxAtOnce?: number; maxWaitSeconds?: number }
export interface AddReplicaPropertyParams extends CollectionRequestBase {
  collection: string;
  shard: string;
  replica: string;
  property: string;
  "property.value": string;
  shardUnique?: boolean;
}
export interface DeleteReplicaPropertyParams extends CollectionRequestBase { collection: string; shard: string; replica: string; property: string }

/** Action-specific Collections API parameters. Unsupported actions still have a named customParams escape hatch. */
export type CollectionAdminParams<A extends CollectionAdminAction> =
  A extends "LIST" ? ListCollectionsParams :
  A extends "CREATE" ? CreateCollectionParams :
  A extends "DELETE" ? DeleteCollectionParams :
  A extends "RELOAD" ? ReloadCollectionParams :
  A extends "MODIFYCOLLECTION" ? ModifyCollectionParams :
  A extends "MIGRATE" ? MigrateCollectionParams :
  A extends "CREATEALIAS" ? CreateAliasParams :
  A extends "DELETEALIAS" ? DeleteAliasParams :
  A extends "LISTALIASES" ? ListAliasesParams :
  A extends "CLUSTERSTATUS" ? ClusterStatusParams :
  A extends "ADDREPLICA" ? AddReplicaParams :
  A extends "DELETEREPLICA" ? DeleteReplicaParams :
  A extends "MOVEREPLICA" ? MoveReplicaParams :
  A extends "BALANCESHARDUNIQUE" ? BalanceShardUniqueParams :
  A extends "REBALANCELEADERS" ? RebalanceLeadersParams :
  A extends "ADDREPLICAPROP" ? AddReplicaPropertyParams :
  A extends "DELETEREPLICAPROP" ? DeleteReplicaPropertyParams :
  A extends "CREATESHARD" ? CreateShardParams :
  A extends "DELETESHARD" ? DeleteShardParams :
  A extends "SPLITSHARD" ? SplitShardParams :
  A extends "FORCELEADER" ? ForceLeaderParams :
  A extends "BACKUP" ? CollectionBackupParams :
  A extends "RESTORE" ? CollectionRestoreParams :
  A extends "LISTBACKUP" ? CollectionListBackupParams :
  A extends "DELETEBACKUP" ? CollectionDeleteBackupParams :
  A extends "REQUESTSTATUS" ? CollectionAsyncRequestStatusParams :
  A extends "DELETESTATUS" ? CollectionAsyncRequestDeleteParams :
  CollectionRoleParams;

/** Default response contract selected by the Collections action literal. */
export type CollectionAdminResponse<A extends CollectionAdminAction> =
  A extends "LIST" ? SolrCollectionListResponse :
  A extends "CREATE" | "DELETE" | "RELOAD" | "MODIFYCOLLECTION" ? SolrCollectionAdminResponse :
  A extends "ADDREPLICA" | "DELETEREPLICA" | "MOVEREPLICA" | "BALANCESHARDUNIQUE" | "REBALANCELEADERS" | "ADDREPLICAPROP" | "DELETEREPLICAPROP" ? SolrCollectionReplicaResponse :
  A extends "ADDROLE" | "REMOVEROLE" ? SolrCollectionRoleResponse :
  A extends "LISTALIASES" ? SolrCollectionAliasesResponse :
  A extends "CLUSTERSTATUS" ? SolrClusterStatusResponse :
  A extends "CREATEALIAS" | "DELETEALIAS" ? SolrCollectionAliasResponse :
  A extends "CREATESHARD" | "DELETESHARD" | "SPLITSHARD" | "MIGRATE" | "FORCELEADER" ? SolrCollectionShardOperationResponse :
  A extends "BACKUP" | "RESTORE" ? SolrCollectionBackupResponse :
  A extends "LISTBACKUP" ? SolrCollectionBackupListResponse :
  A extends "DELETEBACKUP" ? SolrCollectionBackupDeleteResponse :
  A extends "REQUESTSTATUS" ? SolrCollectionAsyncRequestStatusResponse :
  A extends "DELETESTATUS" ? SolrCollectionAsyncRequestDeleteResponse :
  never;

/** Standard response header returned by the Solr Schema API. */
export interface SolrSchemaResponseHeader {
  status: number;
  QTime?: number;
  [key: string]: unknown;
}

/** A successful Schema API mutation returns its status and processing time. */
export interface SolrSchemaCommandResponse {
  responseHeader?: SolrSchemaResponseHeader;
  [key: string]: unknown;
}

/** Schema-level metadata and collections exposed by GET /schema. */
export interface SolrSchemaProperties {
  name?: string;
  version?: number;
  uniqueKey?: string;
  similarity?: Readonly<Record<string, unknown>>;
  fields?: readonly SolrSchemaField[];
  dynamicFields?: readonly SolrSchemaDynamicField[];
  fieldTypes?: readonly SolrSchemaFieldType[];
  copyFields?: readonly SolrSchemaCopyField[];
  [key: string]: unknown;
}

/** The complete JSON response returned by GET /schema. */
export interface SolrSchemaReadResponse extends SolrSchemaCommandResponse {
  schema?: SolrSchemaProperties;
}

/** Response envelopes for the individual Schema API read endpoints. */
export interface SolrSchemaFieldsResponse extends SolrSchemaCommandResponse {
  fields?: readonly SolrSchemaField[];
}
export interface SolrSchemaDynamicFieldsResponse extends SolrSchemaCommandResponse {
  dynamicFields?: readonly SolrSchemaDynamicField[];
}
export interface SolrSchemaFieldTypesResponse extends SolrSchemaCommandResponse {
  fieldTypes?: readonly SolrSchemaFieldType[];
}
export interface SolrSchemaCopyFieldsResponse extends SolrSchemaCommandResponse {
  copyFields?: readonly SolrSchemaCopyField[];
}
export interface SolrSchemaNameResponse extends SolrSchemaCommandResponse {
  name?: string;
}
export interface SolrSchemaVersionResponse extends SolrSchemaCommandResponse {
  version?: number;
}
export interface SolrSchemaUniqueKeyResponse extends SolrSchemaCommandResponse {
  uniqueKey?: string;
}
export interface SolrSchemaSimilarityResponse extends SolrSchemaCommandResponse {
  similarity?: Readonly<Record<string, unknown>>;
}

/** One field definition in the Schema API. */
export interface SolrSchemaField {
  name: string;
  type: string;
  default?: SolrConfigValue;
  docValues?: boolean;
  indexed?: boolean;
  multiValued?: boolean;
  required?: boolean;
  stored?: boolean;
  uninvertible?: boolean;
  useDocValuesAsStored?: boolean;
  large?: boolean;
  omitNorms?: boolean;
  omitTermFreqAndPositions?: boolean;
  omitPositions?: boolean;
  termVectors?: boolean;
  termPositions?: boolean;
  termOffsets?: boolean;
  termPayloads?: boolean;
  sortMissingFirst?: boolean;
  sortMissingLast?: boolean;
}
export interface SolrSchemaDynamicField extends SolrSchemaField {}
export interface SolrSchemaFieldType {
  name: string;
  class: string;
  positionIncrementGap?: number;
  multiValued?: boolean;
  docValuesFormat?: string;
  postingsFormat?: string;
  analyzer?: SolrSchemaAnalyzer;
  indexAnalyzer?: SolrSchemaAnalyzer;
  queryAnalyzer?: SolrSchemaAnalyzer;
  similarity?: Readonly<Record<string, SolrConfigValue>>;
  [key: string]: unknown;
}
export interface SolrSchemaAnalyzer {
  tokenizer?: SolrSchemaAnalyzerComponent;
  filters?: readonly SolrSchemaAnalyzerComponent[];
  charFilters?: readonly SolrSchemaAnalyzerComponent[];
}
export interface SolrSchemaAnalyzerComponent {
  class: string;
  [key: string]: unknown;
}
export interface SolrSchemaCopyField { source: string; dest: string | readonly string[]; maxChars?: number }
export type SolrSchemaCommand =
  | { "add-field": SolrSchemaField }
  | { "replace-field": SolrSchemaField }
  | { "delete-field": { name: string } }
  | { "add-dynamic-field": SolrSchemaDynamicField }
  | { "replace-dynamic-field": SolrSchemaDynamicField }
  | { "delete-dynamic-field": { name: string } }
  | { "add-field-type": SolrSchemaFieldType }
  | { "replace-field-type": SolrSchemaFieldType }
  | { "delete-field-type": { name: string } }
  | { "add-copy-field": SolrSchemaCopyField }
  | { "delete-copy-field": { source: string; dest: string } };

/** Shared settings for named Config API plugins. */
export interface SolrConfigPlugin {
  name: string;
  class: string;
  startup?: "lazy" | "eager";
  initParams?: Readonly<Record<string, SolrConfigValue>>;
  /** Explicit escape hatch for plugin-specific settings; flattened into the component definition. */
  customOptions?: Readonly<Record<string, SolrConfigValue>>;
}
export interface SolrRequestHandlerConfig extends SolrConfigPlugin {
  /** Allow the handler to be selected through the legacy `qt` request parameter. */
  handleSelect?: boolean;
  defaults?: SolrConfigRequestHandlerParams;
  appends?: SolrConfigRequestHandlerParams;
  invariants?: SolrConfigRequestHandlerParams;
  useParams?: string | readonly string[];
  components?: string | readonly string[];
}
export interface SolrSearchComponentConfig extends SolrConfigPlugin {
  query?: SolrConfigParameterMap;
  highlighting?: SolrConfigParameterMap;
  spellcheck?: SolrConfigParameterMap;
  terms?: SolrConfigParameterMap;
}
export interface SolrQueryResponseWriterConfig extends SolrConfigPlugin {
  contentType?: string;
  charset?: string;
}
export interface SolrInitParamsConfig {
  name: string;
  path?: string | readonly string[];
  defaults?: SolrConfigParameterMap;
  appends?: SolrConfigParameterMap;
  invariants?: SolrConfigParameterMap;
  customOptions?: SolrConfigParameterMap;
}
export interface SolrListenerConfig extends SolrConfigPlugin {
  event: SolrConfigListenerEvent;
}
export interface SolrOtherComponentConfig extends SolrConfigPlugin {}
export type SolrConfigCommand =
  | { "set-property": SolrConfigPropertyValues }
  | { "unset-property": SolrConfigPropertyName | readonly SolrConfigPropertyName[] }
  | { "set-user-property": Readonly<Record<string, SolrConfigValue>> }
  | { "unset-user-property": string | readonly string[] }
  | { "add-requesthandler": SolrRequestHandlerConfig }
  | { "update-requesthandler": SolrRequestHandlerConfig }
  | { "delete-requesthandler": string }
  | { "add-searchcomponent": SolrSearchComponentConfig }
  | { "update-searchcomponent": SolrSearchComponentConfig }
  | { "delete-searchcomponent": string }
  | { "add-queryresponsewriter": SolrQueryResponseWriterConfig }
  | { "update-queryresponsewriter": SolrQueryResponseWriterConfig }
  | { "delete-queryresponsewriter": string }
  | { "add-initparams": SolrInitParamsConfig }
  | { "update-initparams": SolrInitParamsConfig }
  | { "delete-initparams": string }
  | { "add-queryparser": SolrOtherComponentConfig }
  | { "update-queryparser": SolrOtherComponentConfig }
  | { "delete-queryparser": string }
  | { "add-valuesourceparser": SolrOtherComponentConfig }
  | { "update-valuesourceparser": SolrOtherComponentConfig }
  | { "delete-valuesourceparser": string }
  | { "add-transformer": SolrOtherComponentConfig }
  | { "update-transformer": SolrOtherComponentConfig }
  | { "delete-transformer": string }
  | { "add-updateprocessor": SolrOtherComponentConfig }
  | { "update-updateprocessor": SolrOtherComponentConfig }
  | { "delete-updateprocessor": string }
  | { "add-queryconverter": SolrOtherComponentConfig }
  | { "update-queryconverter": SolrOtherComponentConfig }
  | { "delete-queryconverter": string }
  | { "add-listener": SolrListenerConfig }
  | { "update-listener": SolrListenerConfig }
  | { "delete-listener": string }
  | { "add-expressible": SolrOtherComponentConfig }
  | { "update-expressible": SolrOtherComponentConfig }
  | { "delete-expressible": string };

export type SolrAuth =
  | { type: "basic"; username: string; password?: string }
  | { type: "bearer"; token: string };

export interface SolrRetryPolicy {
  /** Maximum total attempts, including the first request. Default: 1 (no retry). */
  maxAttempts?: number;
  /** Base delay for exponential backoff, in milliseconds. Default: 100. */
  baseDelayMs?: number;
  /** Maximum delay between attempts, in milliseconds. Default: 2000. */
  maxDelayMs?: number;
  /** HTTP statuses that can trigger a retry. */
  retryableStatuses?: readonly number[];
  /** Methods that can be retried. Default: GET only. */
  methods?: readonly SolrHttpMethod[];
  /** Retry network failures when the caller has not aborted the request. Default: true. */
  retryNetworkErrors?: boolean;
}

export interface SolrRequestDefaults {
  /** Query parameters added only when the request does not set the same key. */
  params?: Readonly<Record<string, SolrQueryParamValue>>;
  /** Headers applied before client-level and per-request headers. */
  headers?: Readonly<Record<string, string>>;
}

export interface ValidationSchema {
  safeParseAsync(value: unknown): Promise<
    | { success: true; data: unknown }
    | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } }
  >;
}
export interface ValidationConfig {
  inputs?: Readonly<Record<string, ValidationSchema>>;
  outputs?: Readonly<Record<string, ValidationSchema>>;
  onError?: "throw" | "ignore";
}
/** Optional JSON codec for lossless or application-specific Solr JSON handling. */
export interface SolrJsonCodec {
  /** Parse a JSON response body into caller-defined values (for example, BigInt). */
  parse(text: string): unknown;
  /** Serialize a request body; return undefined only when the input has no JSON representation. */
  stringify(value: unknown): string | undefined;
}

export interface SolrClientConfig {
  /** Solr origin or reverse-proxy prefix. Do not include a core or collection name. */
  baseUrl?: string;
  core?: string;
  collection?: string;
  timeoutMs?: number;
  headers?: Readonly<Record<string, string>>;
  /** Preferred typed authentication. Do not combine with username/password. */
  auth?: SolrAuth;
  /** Legacy Basic authentication fields. Prefer auth: { type: "basic", ... }. */
  username?: string;
  password?: string;
  fetch?: typeof fetch;
  /** Optional lossless JSON parser/serializer. Native JSON behavior remains the default. */
  jsonCodec?: SolrJsonCodec;
  retry?: SolrRetryPolicy | false;
  requestDefaults?: SolrRequestDefaults;
  validation?: ValidationConfig;
}


/** Response to GET /api/collections. Collection names are cluster-wide. */
export interface SolrV2CollectionListResponse {
  responseHeader?: SolrResponseHeader;
  collections?: readonly string[];
  readonly [key: string]: unknown;
}

/** Optional, explicitly supported fields for the V2 collection status endpoint. */
export interface SolrV2CollectionStatusOptions {
  coreInfo?: boolean;
  segments?: boolean;
  fieldInfo?: boolean;
  sizeInfo?: boolean;
}

/** Extensible status information for one SolrCloud collection. */
export interface SolrV2CollectionStatus {
  name?: string;
  znodeVersion?: number;
  creationTimeMillis?: number | string;
  properties?: Readonly<Record<string, unknown>>;
  activeShards?: number;
  inactiveShards?: number;
  schemaNonCompliant?: readonly string[];
  shards?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

/** GET /api/collections/{collection} returns CollectionStatusResponse directly. */
export interface SolrV2CollectionStatusResponse extends SolrV2CollectionStatus {
  responseHeader?: SolrResponseHeader;
}

/** Common fields accepted by the post-Solr-9.3 V2 collection creation API. */
export interface SolrV2CollectionCreateParams {
  name: string;
  config: string;
  numShards?: number;
  replicationFactor?: number;
  nrtReplicas?: number;
  tlogReplicas?: number;
  pullReplicas?: number;
  createNodeSet?: string;
  createNodeSetShuffle?: boolean;
  router?: Readonly<Record<string, unknown>>;
  properties?: Readonly<Record<string, string | number | boolean>>;
}

/** Query controls for deleting a V2 collection. Destructive directory deletion is opt-in. */
export interface SolrV2CollectionDeleteOptions {
  deleteInstanceDir?: boolean;
  deleteDataDir?: boolean;
  deleteIndex?: boolean;
}

/** Extensible response envelope for V2 collection lifecycle operations. */
export interface SolrV2CollectionOperationResponse {
  responseHeader?: SolrResponseHeader;
  requestid?: string;
  collection?: string;
  [key: string]: unknown;
}

/** Supported replica types accepted by the V2 ADDREPLICA endpoint. */
export type SolrV2ReplicaType = "nrt" | "tlog" | "pull";

/** Parameters for adding one or more replicas to a shard (Solr 9+). */
export interface SolrV2AddReplicaParams {
  /** Exact shard name or route selector; at least one is required. */
  shard?: string;
  route?: string;
  node?: string;
  nodeSet?: readonly string[];
  instanceDir?: string;
  dataDir?: string;
  type?: SolrV2ReplicaType;
  nrtReplicas?: number;
  tlogReplicas?: number;
  pullReplicas?: number;
  waitForFinalState?: boolean;
}

/** Async tracking option for replica administration requests. */
export interface SolrV2ReplicaMutationOptions {
  async?: string;
}

/** Controls the filesystem cleanup performed by deleting one replica. */
export interface SolrV2DeleteReplicaOptions extends SolrV2ReplicaMutationOptions {
  /** Defaults to false in this client to preserve the replica's instance directory. */
  deleteInstanceDir?: boolean;
  /** Defaults to false in this client to preserve the replica's data directory. */
  deleteDataDir?: boolean;
  /** Defaults to false in this client to preserve the replica's index. */
  deleteIndex?: boolean;
  onlyIfDown?: boolean;
  followAliases?: boolean;
}

/** Extensible response envelope for V2 replica administration. */
export interface SolrV2ReplicaOperationResponse {
  responseHeader?: SolrResponseHeader;
  success?: Readonly<Record<string, unknown>>;
  requestid?: string;
  [key: string]: unknown;
}

/** GET /api/aliases response with extensible alias/property maps. */
export interface SolrV2AliasListResponse {
  responseHeader?: SolrResponseHeader;
  aliases?: Readonly<Record<string, string>>;
  properties?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly [key: string]: unknown;
}

/** GET /api/aliases/{alias} response. */
export interface SolrV2AliasStatusResponse {
  responseHeader?: SolrResponseHeader;
  alias?: string;
  collections?: readonly string[];
  properties?: Readonly<Record<string, string>>;
  readonly [key: string]: unknown;
}

/** Standard alias creation contract for POST /api/aliases (Solr 9.3+). */
export interface SolrV2AliasCreateParams {
  name: string;
  collections: readonly string[];
}

/** Optional asynchronous request identifier accepted by alias mutations. */
export interface SolrV2AliasMutationOptions {
  async?: string;
}

/** Alias metadata values accepted by the V2 property endpoints. */
export type SolrV2AliasPropertyValue = string;

/** Extensible response envelope for V2 alias create/delete/property mutations. */
export interface SolrV2AliasOperationResponse {
  responseHeader?: SolrResponseHeader;
  requestid?: string;
  [key: string]: unknown;
}

/** GET /api/aliases/{alias}/properties response. */
export interface SolrV2AliasPropertiesResponse {
  responseHeader?: SolrResponseHeader;
  properties?: Readonly<Record<string, string>>;
  readonly [key: string]: unknown;
}

/** GET /api/aliases/{alias}/properties/{property} response. */
export interface SolrV2AliasPropertyResponse {
  responseHeader?: SolrResponseHeader;
  value?: string;
  readonly [key: string]: unknown;
}

/** Shared options for collection backup operations. These V2 routes require Solr 9.3+. */
export interface SolrV2BackupLocationOptions {
  /** Shared or configured repository location; must be consistent across SolrCloud nodes. */
  location: string;
  repository?: string;
  async?: string;
}

/** Additional options accepted when creating an incremental collection backup. */
export interface SolrV2CollectionBackupParams extends SolrV2BackupLocationOptions {
  maxNumBackupPoints?: number;
  backupConfigset?: boolean;
  extraProperties?: Readonly<Record<string, string>>;
  incremental?: boolean;
  backupStrategy?: "copy-files" | "none";
  snapshotName?: string;
}

/** Options for listing collection backup points. */
export interface SolrV2BackupListOptions {
  location: string;
  repository?: string;
  async?: string;
}

/** Options for deleting one backup point by its numeric ID. */
export interface SolrV2BackupDeleteOptions extends SolrV2BackupListOptions {}

/** Parameters for creating a collection when restoring a backup to a new name. */
export interface SolrV2RestoreCreateCollectionParams {
  config?: string;
  nodeSet?: readonly string[];
  shuffleNodes?: boolean;
  nrtReplicas?: number;
  tlogReplicas?: number;
  pullReplicas?: number;
  replicationFactor?: number;
  properties?: Readonly<Record<string, string | number | boolean>>;
}

/** Parameters for restoring a collection backup to an existing or new collection. */
export interface SolrV2BackupRestoreParams {
  collection: string;
  backupId?: number;
  location?: string;
  repository?: string;
  "create-collection"?: SolrV2RestoreCreateCollectionParams;
}

/** One incremental backup point's stable metadata fields. */
export interface SolrV2BackupMetadata {
  backupId?: number;
  collection?: string;
  startTime?: string;
  endTime?: string;
  indexVersion?: string;
  indexFileCount?: number;
  uploadedIndexFileCount?: number;
  indexSizeMB?: number;
  uploadedIndexFileMB?: number;
  shardBackupIds?: readonly string[] | Readonly<Record<string, string>>;
  [key: string]: unknown;
}

/** Response returned by collection backup creation and restore operations. */
export interface SolrV2BackupOperationResponse {
  responseHeader?: SolrResponseHeader;
  response?: Readonly<Record<string, unknown>>;
  requestid?: string;
  [key: string]: unknown;
}

/** Response returned by GET /api/backups/{backup}/versions. */
export interface SolrV2BackupListResponse {
  responseHeader?: SolrResponseHeader;
  collection?: string;
  backups?: readonly SolrV2BackupMetadata[];
  [key: string]: unknown;
}

/** Response returned by DELETE /api/backups/{backup}/versions/{backupId}. */
export interface SolrV2BackupDeleteResponse extends SolrV2BackupOperationResponse {
  deleted?: readonly unknown[];
}

/**
 * GET /api/cluster response. The CLUSTERSTATUS V2 route is documented from
 * Solr 9.11; its response remains extensible across Solr versions.
 */
export interface SolrV2ClusterStatusResponse {
  responseHeader?: SolrResponseHeader;
  collections?: readonly string[];
  cluster?: SolrClusterStatus;
  live_nodes?: readonly string[];
  readonly [key: string]: unknown;
}

/** Optional query parameters for V2 Core Admin status discovery. */
export interface SolrV2CoreStatusOptions {
  /** Include index statistics in status results. Defaults to Solr's true. */
  indexInfo?: boolean;
}

/** Extensible index statistics returned by V2 Core Admin status. */
export interface SolrV2CoreIndexStatus {
  numDocs?: number;
  maxDoc?: number;
  deletedDocs?: number;
  segmentCount?: number;
  [key: string]: unknown;
}

/** Extensible status for one core returned by the V2 Core Admin API. */
export interface SolrV2CoreStatus {
  name?: string;
  instanceDir?: string;
  dataDir?: string;
  config?: string;
  schema?: string;
  startTime?: string;
  uptime?: number;
  index?: SolrV2CoreIndexStatus;
  [key: string]: unknown;
}

/** V2 Core Admin status response. Unknown server fields remain available. */
export interface SolrV2CoreStatusResponse {
  responseHeader?: SolrResponseHeader;
  status?: Readonly<Record<string, SolrV2CoreStatus>>;
  initFailures?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}

/** V2 Core Admin rename request body. */
export interface SolrV2CoreRenameParams {
  to: string;
}

/** V2 Core Admin unload options. All destructive flags default to false. */
export interface SolrV2CoreUnloadParams {
  deleteIndex?: boolean;
  deleteDataDir?: boolean;
  deleteInstanceDir?: boolean;
}

/** Extensible response envelope for V2 Core Admin state-changing operations. */
export interface SolrV2CoreOperationResponse {
  responseHeader?: SolrResponseHeader;
  core?: string;
  [key: string]: unknown;
}

/** Built-in Solr query parsers. Custom parser names remain accepted. */
export type SolrQueryParser = "lucene" | "dismax" | "edismax" | (string & {});

/** Boolean operator used by the Solr query parser. */
export type SolrQueryOperator = "AND" | "OR";

/** Common Solr response writers. Custom writer names remain accepted. */
export type SolrResponseWriter = "json" | "xml" | "csv" | "javabin" | (string & {});

export type SolrQueryParamScalar = string | number | boolean | Date | null;
export type SolrQueryParamValue = SolrQueryParamScalar | readonly SolrQueryParamScalar[];

/** One structured filter query. Raw filter strings remain supported alongside this model. */
export interface SolrFilterQuery {
  /** Filter expression, without a local-params prefix. */
  query: string;
  /** Tags applied to this filter for use by facet/parser excludeTags options. */
  tag?: string | readonly string[];
  /** Whether this filter participates in the filter cache. */
  cache?: boolean;
  /** Evaluation cost hint for non-cached filters. */
  cost?: number;
  /** Additional local parameters for this filter. */
  localParams?: Readonly<Record<string, string | number | boolean>>;
}

export type SolrFilter = string | SolrFilterQuery;

/** Parameters accepted by Solr's standard Lucene query parser. */
export interface SolrLuceneQueryOptions {
  type: "lucene";
  df?: string;
  sow?: boolean;
  uf?: string;
}

/** Parameters accepted by Solr's DisMax query parser. */
export interface SolrDisMaxQueryOptions {
  type: "dismax";
  qf?: string;
  mm?: string;
  tie?: number;
  bq?: string | readonly string[];
  bf?: string | readonly string[];
  pf?: string;
  ps?: number;
  qs?: number;
  "q.alt"?: string;
}

/** Parameters accepted by Solr's Extended DisMax query parser. */
export interface SolrExtendedDisMaxQueryOptions extends Omit<SolrDisMaxQueryOptions, "type"> {
  type: "edismax";
  pf2?: string;
  pf3?: string;
  ps2?: number;
  ps3?: number;
  boost?: string;
  uf?: string;
  sow?: boolean;
  lowercaseOperators?: boolean;
  stopwords?: boolean;
  splitOnWhitespace?: boolean;
  "mm.autoRelax"?: boolean;
}

/** Parser-specific parameters. The type discriminator is not sent to Solr. */
export type SolrQueryParserOptions =
  | SolrLuceneQueryOptions
  | SolrDisMaxQueryOptions
  | SolrExtendedDisMaxQueryOptions;

/** Sort order for classic field facets. */
export type SolrFacetSort = "count" | "index";

/** Classic facet algorithms documented by Solr. */
export type SolrFacetMethod = "enum" | "fc" | "fcs";
export type SolrRangeFacetMethod = "filter" | "dv";

/** Values accepted by classic date/range facet include and other options. */
export type SolrFacetInclude = "lower" | "upper" | "edge" | "outer" | "all";
export type SolrFacetOther = "before" | "after" | "between" | "none" | "all";

/** Per-field overrides for a classic field facet. */
export interface SolrFacetFieldOptions {
  field: string;
  limit?: number;
  offset?: number;
  sort?: SolrFacetSort;
  minCount?: number;
  missing?: boolean;
  prefix?: string;
  method?: SolrFacetMethod;
}

/** Configuration for a classic range facet. */
export interface SolrFacetRangeOptions {
  field: string;
  start: string | number;
  end: string | number;
  gap: string | number;
  hardEnd?: boolean;
  other?: SolrFacetOther | readonly SolrFacetOther[];
  include?: SolrFacetInclude | readonly SolrFacetInclude[];
  method?: SolrRangeFacetMethod;
}

/** Options for Solr's classic Facet Component. */
export interface SolrClassicFacetOptions {
  /** Explicitly enable or disable classic faceting. Defaults to true when supplied. */
  enabled?: boolean;
  /** Fields to facet on, with optional field-specific overrides. */
  fields?: string | readonly (string | SolrFacetFieldOptions)[];
  /** Raw query expressions to count as separate facets. */
  queries?: string | readonly string[];
  /** Numeric or date range facets. */
  ranges?: string | readonly SolrFacetRangeOptions[];
  /** Global field-facet defaults. */
  limit?: number;
  offset?: number;
  sort?: SolrFacetSort;
  minCount?: number;
  missing?: boolean;
  prefix?: string;
  method?: SolrFacetMethod;
  rangeMethod?: SolrRangeFacetMethod;
}

/** Highlighter implementation selected by hl.method. */
export type SolrHighlighterMethod = "unified" | "original" | "fastVector";

/** HTML escaping behavior supported by Solr's highlighters. */
export type SolrHighlightEncoder = "html" | "simple";

/** Per-field overrides for Solr highlighting. */
export interface SolrFieldHighlightOptions {
  method?: SolrHighlighterMethod;
  snippets?: number;
  fragmentSize?: number;
  requireFieldMatch?: boolean;
  alternateField?: string;
  maxAlternateFieldLength?: number;
}

/** Typed options for Solr's Highlighting component. */
export interface SolrHighlightingOptions {
  /** Explicitly enable or disable highlighting. Defaults to true when supplied. */
  enabled?: boolean;
  /** Fields to highlight; accepts one field or a list of stored text fields. */
  fields?: string | readonly string[];
  method?: SolrHighlighterMethod;
  snippets?: number;
  fragmentSize?: number;
  mergeContiguous?: boolean;
  requireFieldMatch?: boolean;
  maxAnalyzedChars?: number;
  alternateField?: string;
  maxAlternateFieldLength?: number;
  /** The Original Highlighter currently supports the simple formatter. */
  formatter?: "simple";
  tagPre?: string;
  tagPost?: string;
  simplePre?: string;
  simplePost?: string;
  encoder?: SolrHighlightEncoder;
  highlightMultiTerm?: boolean;
  usePhraseHighlighter?: boolean;
  payloads?: boolean;
  offsetSource?: "ANALYSIS" | "POSTINGS" | "POSTINGS_WITH_TERM_VECTORS" | "TERM_VECTORS";
  fragAlignRatio?: number;
  /** Field-specific highlighting overrides keyed by Solr field name. */
  perField?: Readonly<Record<string, SolrFieldHighlightOptions>>;
}

/** Result Grouping response format. */
export type SolrGroupFormat = "grouped" | "simple";

/** Typed options for Solr Result Grouping (group=true). */
export interface SolrGroupingOptions {
  enabled?: boolean;
  /** Group by one or more single-valued indexed string fields. */
  fields?: string | readonly string[];
  /** Group by one or more function queries; not supported for distributed searches. */
  functions?: string | readonly string[];
  /** Return one group for each supplied query expression. */
  queries?: string | readonly string[];
  /** Number of documents returned in each group. */
  limit?: number;
  /** Offset into each group's document list. */
  offset?: number;
  /** Sort order for groups, corresponding to the top-level sort parameter. */
  sort?: string;
  /** Sort order for documents within each group. */
  groupSort?: string;
  format?: SolrGroupFormat;
  main?: boolean;
  numGroups?: boolean;
  truncate?: boolean;
  facet?: boolean;
  facetLimit?: number;
  cachePercent?: number;
}

/** Null-value behavior for the Collapsing Query Parser. */
export type SolrCollapseNullPolicy = "ignore" | "expand" | "collapse";
export type SolrCollapseHint = "top_fc" | "block";

/** Typed options for Solr's Collapsing Query Parser. */
export interface SolrCollapseOptions {
  /** Required single-valued string, integer, or float field. */
  field: string;
  /** Select the group head with the minimum value or function. */
  min?: string;
  /** Select the group head with the maximum value or function. */
  max?: string;
  /** Select the group head using a sort expression. */
  sort?: string;
  nullPolicy?: SolrCollapseNullPolicy;
  hint?: SolrCollapseHint;
  size?: number;
  cost?: number;
}

/** Typed options for the Expand component used with collapsed results. */
export interface SolrExpandOptions {
  enabled?: boolean;
  field?: string;
  sort?: string;
  rows?: number;
  query?: string;
  filter?: string | readonly string[];
  nullGroup?: boolean;
}

/** Expanded documents keyed by the collapsed group head document ID. */
export type SolrExpandedResult<TDocument = unknown> = Readonly<Record<string, SolrQueryResult<TDocument>>>;

/** Per-field local options for the Stats Component. */
export interface SolrStatsFieldOptions {
  field: string;
  /** Rename this field's entry in stats_fields. */
  key?: string;
  tag?: string | readonly string[];
  excludeTags?: string | readonly string[];
  min?: boolean;
  max?: boolean;
  sum?: boolean;
  count?: boolean;
  missing?: boolean;
  sumOfSquares?: boolean;
  mean?: boolean;
  stddev?: boolean;
  percentiles?: readonly number[];
  distinctValues?: boolean;
  countDistinct?: boolean;
  /** true uses Solr's default accuracy; a number selects cardinality accuracy (0..1). */
  cardinality?: boolean | number;
  tdigestCompression?: number;
}

/** Typed options for Solr's Stats Component. */
export interface SolrStatsOptions {
  enabled?: boolean;
  /** Fields to compute statistics for, optionally with field-specific statistic selection. */
  fields?: string | readonly (string | SolrStatsFieldOptions)[];
  /** Fields to break statistics down by. */
  facets?: string | readonly string[];
  /** Calculate distinctValues and countDistinct for all requested fields. */
  calcDistinct?: boolean;
}

/** Typed options for Solr's MoreLikeThis search component. */
export interface SolrMoreLikeThisOptions {
  /** Enable the component; defaults to true when options are supplied. */
  enabled?: boolean;
  /** Fields used to generate similar-document queries (mlt.fl). */
  fields?: string | readonly string[];
  /** Similar documents returned for each input document (default 5). */
  count?: number;
  /** Minimum term frequency in the source document (default 2). */
  minTermFrequency?: number;
  /** Minimum document frequency across the index (default 5). */
  minDocumentFrequency?: number;
  maxDocumentFrequency?: number;
  /** Maximum document frequency as an integer percentage from 0 to 100. */
  maxDocumentFrequencyPercent?: number;
  minWordLength?: number;
  maxWordLength?: number;
  /** Maximum query terms generated for each source document. */
  maxQueryTerms?: number;
  /** Maximum tokens parsed per source field without term vectors. */
  maxParsedTokens?: number;
  boost?: boolean;
  /** DisMax-style query fields; each must also be included in fields. */
  queryFields?: string;
  interestingTerms?: "none" | "list" | "details";
}

/** Debug response sections supported by Solr's standard query handler. */
export type SolrDebugComponent = "query" | "timing" | "results" | "track" | "all";

/** Typed options for query parsing, timing, and score explanation diagnostics. */
export interface SolrDebugOptions {
  /** Enable debug output; defaults to true when this object is supplied. */
  enabled?: boolean;
  /** One or more debug sections. Omit to request all available sections. */
  components?: SolrDebugComponent | readonly SolrDebugComponent[];
  /** Return score explanations as structured JSON instead of plain strings. */
  explainStructured?: boolean;
  /** Additional Lucene query whose matching documents should be explained. */
  explainOther?: string;
}

/** One structured score explanation returned when debug.explain.structured=true. */
export interface SolrStructuredExplanation {
  match?: boolean;
  value?: number;
  description?: string;
  details?: readonly SolrStructuredExplanation[];
  [key: string]: unknown;
}

/** A score explanation can be plain text or a structured explanation tree. */
export type SolrExplanation = string | SolrStructuredExplanation;

/** Typed spatial filter options for the geofilt and bbox query parsers. */
export interface SolrSpatialQueryOptions {
  parser: "geofilt" | "bbox";
  /** Indexed spatial field (sfield). */
  field: string;
  /** Center point; latitude,longitude for geodetic fields. */
  point: string;
  /** Search radius in the spatial field's configured distance units. */
  distance: number;
  cache?: boolean;
  cost?: number;
}

/** Typed options for Solr's SpellCheck search component. */
export interface SolrSpellcheckOptions {
  /** Enable or disable spelling suggestions. Defaults to true when this object is supplied. */
  enabled?: boolean;
  /** Explicit text to spellcheck; defaults to the original q parameter. */
  query?: string;
  /** Maximum suggestions per term. */
  count?: number;
  /** Return only suggestions that produce more hits than the original term. */
  onlyMorePopular?: boolean;
  /** Include original and suggestion term frequencies. */
  extendedResults?: boolean;
  /** Return query collations built from the best suggestions. */
  collate?: boolean;
  /** Maximum number of collations to return. */
  maxCollations?: number;
  /** Number of collation possibilities Solr should test. */
  maxCollationTries?: number;
  /** Maximum correction combinations evaluated before collation testing. */
  maxCollationEvaluations?: number;
  /** Return expanded collation details including hits and corrections. */
  collateExtendedResults?: boolean;
  /** Maximum number of documents collected while testing collations; zero means all. */
  collateMaxCollectDocs?: number;
  /** Offer suggestions when the original query returns this many hits or fewer. */
  maxResultsForSuggest?: number;
  /** Number of alternatives to return for terms already present in the dictionary. */
  alternativeTermCount?: number;
  /** Minimum accuracy threshold for a suggestion, from 0 to 1. */
  accuracy?: number;
  /** One or more configured spellchecker dictionary names. */
  dictionary?: string | readonly string[];
  /** Field type whose query analyzer tokenizes the spellcheck query. */
  queryAnalyzerFieldType?: string;
  /** Parameters applied when Solr validates candidate collations. */
  collateParams?: Readonly<Record<string, SolrQueryParamValue>>;
}

/** Typed options for Solr's optional Suggester search component. */
export interface SolrSuggesterOptions {
  /** Enable or disable suggestions. Defaults to true when this object is supplied. */
  enabled?: boolean;
  /** One or more dictionary names configured on the server. */
  dictionary?: string | readonly string[];
  /** Explicit lookup text; defaults to the original q parameter. */
  query?: string;
  /** Maximum suggestions returned per dictionary/query pair. */
  count?: number;
  /** Context filter query; only supported by selected lookup/dictionary implementations. */
  contextFilterQuery?: string;
  /** Build the selected suggester dictionary before lookup. */
  build?: boolean;
  /** Reload the selected suggester dictionary. */
  reload?: boolean;
  /** Build all dictionaries configured in the component. */
  buildAll?: boolean;
  /** Reload all dictionaries configured in the component. */
  reloadAll?: boolean;
}

/**
 * Options for the standard /select query handler.
 *
 * Use parserOptions for discoverable parser-specific parameters. Put additional
 * Solr parameters in params; arbitrary top-level keys are intentionally rejected.
 */
export interface SolrStandardQueryOptions {
  /** Query expression, serialized as Solr's q parameter. */
  query?: string;
  /** One or more filter queries, serialized as repeated fq parameters. */
  filter?: SolrFilter | readonly SolrFilter[];
  /** Field list, serialized as Solr's fl parameter. */
  fields?: string | readonly string[];
  /** Solr sort expression, for example price desc, id asc. */
  sort?: string;
  /** Maximum number of documents, serialized as Solr's rows parameter. */
  limit?: number;
  /** Result offset, serialized as Solr's start parameter. */
  offset?: number;
  /** Cursor pagination cannot be combined with a non-zero offset. */
  cursorMark?: never;
  /** Query parser name, serialized as defType. */
  defType?: SolrQueryParser;
  /** Parser-specific options, flattened into individual Solr request parameters. */
  parserOptions?: SolrQueryParserOptions;
  /** Typed options for the classic Facet Component. */
  facets?: SolrClassicFacetOptions;
  /** Typed options for the Highlighting component. */
  highlighting?: SolrHighlightingOptions;
  /** Typed options for the Stats component. */
  stats?: SolrStatsOptions;
  /** Typed options for the MoreLikeThis search component. */
  moreLikeThis?: SolrMoreLikeThisOptions;
  /** Typed options for Solr spellcheck suggestions and collations. */
  spellcheck?: SolrSpellcheckOptions;
  /** Typed options for Solr's configured Suggester search component. */
  suggest?: SolrSuggesterOptions;
  /** Typed options for Result Grouping. */
  grouping?: SolrGroupingOptions;
  /** Collapse duplicate results using the Collapsing Query Parser. */
  collapse?: SolrCollapseOptions;
  /** Retrieve additional documents for collapsed groups. */
  expand?: SolrExpandOptions;
  /** Typed geofilt/bbox spatial filter. */
  spatial?: SolrSpatialQueryOptions;
  /** Query parser, timing, and explain diagnostics. */
  debug?: SolrDebugOptions;
  /** Boolean query operator, serialized as q.op. */
  "q.op"?: SolrQueryOperator;
  /** Response writer, serialized as wt. */
  wt?: SolrResponseWriter;
  /** Additional Solr parameters not yet exposed as dedicated options. */
  params?: Readonly<Record<string, SolrQueryParamValue>>;
}

/** JSON Facet API domain transformations for a facet's input document set. */
export interface SolrJsonFacetDomain {
  filter?: string | readonly string[];
  query?: string;
  excludeTags?: string | readonly string[];
  blockParent?: string;
  blockChildren?: string;
  join?: { from: string; to: string };
}

/** A named metric expression inside a JSON Facet API facet tree. */
export type SolrJsonFacetMetric = string | { type: "func"; func: string };

/** Sort expression accepted by a JSON terms facet. */
export type SolrJsonFacetSort = string | Readonly<Record<string, "asc" | "desc">>;

interface SolrJsonFacetBase {
  /** Nested metrics and facets, evaluated for each bucket or query result. */
  facet?: SolrJsonFacetMap;
  /** Optional domain changes applied before evaluating this facet. */
  domain?: SolrJsonFacetDomain;
}

/** JSON terms facet over the distinct values of a field. */
export interface SolrJsonTermsFacet extends SolrJsonFacetBase {
  type: "terms";
  field: string;
  limit?: number;
  offset?: number;
  sort?: SolrJsonFacetSort;
  mincount?: number;
  missing?: boolean;
  prefix?: string;
  method?: "dv" | "uif" | "dvhash" | "enum" | "stream" | "smart";
  allBuckets?: boolean;
  numBuckets?: boolean;
  refine?: boolean;
  overrequest?: number;
  overrefine?: number;
}

/** JSON query facet over an arbitrary Solr query. */
export interface SolrJsonQueryFacet extends SolrJsonFacetBase {
  type: "query";
  q: string;
}

/** JSON range facet over a numeric or date field. */
export interface SolrJsonRangeFacet extends SolrJsonFacetBase {
  type: "range";
  field: string;
  start: string | number;
  end: string | number;
  gap: string | number;
  hardend?: boolean;
  other?: SolrFacetOther | readonly SolrFacetOther[];
  include?: SolrFacetInclude | readonly SolrFacetInclude[];
  mincount?: number;
}

/** Recursive JSON Facet API tree. Values may be named facet definitions or metrics. */
export type SolrJsonFacetDefinition = SolrJsonTermsFacet | SolrJsonQueryFacet | SolrJsonRangeFacet;
export type SolrJsonFacetMap = Readonly<Record<string, SolrJsonFacetDefinition | SolrJsonFacetMetric>>;

/** Typed request body for Solr's JSON Request API. */
export interface SolrJsonQueryRequest {
  query?: string | Readonly<Record<string, unknown>>;
  filter?: string | Readonly<Record<string, unknown>> | readonly (string | Readonly<Record<string, unknown>>)[];
  fields?: string | readonly string[];
  sort?: string | readonly string[];
  limit?: number;
  offset?: number;
  facet?: boolean | SolrJsonFacetMap;
  params?: Readonly<Record<string, SolrQueryParamValue>>;
  debug?: boolean | string | readonly string[];
  useParams?: string | readonly string[];
}

/** Typed response shape for a JSON Request API query. */
export interface SolrJsonQueryResponse<TDocument = unknown, TJsonFacet = unknown> extends SolrResponse<TDocument, TJsonFacet> {}

/** Cursor requests require a sort expression and cannot use a non-zero offset. */
export interface SolrCursorQuery extends Omit<SolrStandardQueryOptions, "sort" | "offset" | "cursorMark"> {
  /** Initial value "*" or the nextCursorMark returned by the previous page. */
  cursorMark: string;
  /** Stable sort expression that includes the collection's uniqueKey field. */
  sort: string;
  /** Solr permits start=0, but no non-zero offset, with cursorMark. */
  offset?: 0;
}

/** Supplying cursorMark switches to the stricter cursor-query shape. */
export type SolrQuery = SolrStandardQueryOptions | SolrCursorQuery;

export type SolrDocument = Readonly<Record<string, unknown>>;
export type SolrDelete = string | { id: string } | { query: string };

/** Successful response returned by Solr Update Handler commands. */
export interface SolrUpdateResponse {
  responseHeader?: SolrResponseHeader;
  [key: string]: unknown;
}

/** Structured error detail returned in Solr's HTTP error payload. */
export interface SolrErrorDetail {
  code?: number;
  msg?: string;
  metadata?: unknown;
  [key: string]: unknown;
}

/** Solr HTTP error payload; the client exposes this on SolrHttpError.errorResponse. */
export interface SolrErrorResponse {
  error: string | SolrErrorDetail;
  responseHeader?: SolrResponseHeader;
  [key: string]: unknown;
}

/** One add command in a Solr-style JSON update command object. */
export interface SolrJsonAddCommand {
  doc: SolrDocument;
  overwrite?: boolean;
  commitWithin?: number;
}

/** Delete-by-ID, multiple IDs, or delete-by-query in a JSON update command. */
export type SolrJsonDeleteCommand =
  | string
  | readonly string[]
  | { id: string; _version_?: number; query?: never }
  | { query: string; id?: never; _version_?: never };

/**
 * JSON update command object. Use add() for a list of documents; one add
 * command per object avoids JavaScript's inability to preserve duplicate JSON keys.
 */
export interface SolrJsonUpdateCommands {
  add?: SolrJsonAddCommand;
  delete?: SolrJsonDeleteCommand;
  commit?: SolrCommitOptions;
  optimize?: SolrOptimizeOptions;
  rollback?: Readonly<Record<string, never>>;
}

/** Atomic-update modifiers supported by Solr's JSON update syntax. */
export type SolrAtomicUpdateOperation<TValue> =
  | { set: NonNullable<TValue> | null }
  | (NonNullable<TValue> extends readonly (infer TItem)[]
      ? { add: TItem | readonly TItem[] }
        | { "add-distinct": TItem | readonly TItem[] }
        | { remove: TItem | readonly TItem[] }
        | (NonNullable<TItem> extends string ? { removeregex: string | readonly string[] } : never)
      : never)
  | (NonNullable<TValue> extends number ? { inc: number } : never);

/**
 * Field-specific atomic update document. The unique-key field is preserved as
 * a plain value; all other document fields use modifiers. The unique key
 * defaults to "id" when present in TDocument.
 */
export type SolrAtomicUpdateDocument<
  TDocument extends object,
  TUniqueKey extends keyof TDocument = "id" extends keyof TDocument ? "id" : never
> = Pick<TDocument, TUniqueKey>
  & {
    [K in Exclude<keyof TDocument, TUniqueKey | "_root_" | "_version_">]?: SolrAtomicUpdateOperation<TDocument[K]>
  }
  & { _root_?: string; _version_?: number };

/** Request-level options shared by document add and full-document replacement. */
export interface SolrUpdateOptions {
  /** Replace an existing document with the same unique key (default: true). */
  overwrite?: boolean;
  /** Request a commit within this many whole milliseconds; hard/soft behavior follows Solr commitWithin configuration. */
  commitWithin?: number;
  /** Route the update to a SolrCloud shard using the _route_ request parameter. */
  route?: string;
  /** Legacy document boost option retained for source compatibility. */
  boost?: number;
}

/** Delete request options; request controls can be supplied in the same object. */
export interface SolrDeleteOptions extends RequestControlOptions {
  /** Route the delete to a SolrCloud shard using the _route_ request parameter. */
  route?: string;
  /** Request a commit within this many whole milliseconds; hard/soft behavior follows Solr configuration. Solr ignores this for delete-by-query. */
  commitWithin?: number;
}

/** Options for the Update Handler optimize command. */
/** Shared searcher controls for hard and soft commit commands. */
interface SolrCommitSearcherOptions {
  /** Wait for the newly opened searcher to be registered; Solr defaults to true. */
  waitSearcher?: boolean;
  /** Open a new searcher. Defaults to true; sent as the openSearcher request parameter. */
  openSearcher?: boolean;
}

/** Commit options; expungeDeletes is only valid for hard commits. */
export type SolrCommitOptions =
  | (SolrCommitSearcherOptions & { softCommit?: false; expungeDeletes?: boolean })
  | (SolrCommitSearcherOptions & { softCommit: true; expungeDeletes?: never });

/** Options for a soft commit. Expunge and segment-merge options do not apply. */
export interface SolrSoftCommitOptions {
  /** Wait for the newly opened searcher to be registered; defaults to true. */
  waitSearcher?: boolean;
  /** Open a new searcher; defaults to true. */
  openSearcher?: boolean;
}

/** Options for an optimize command. */
export interface SolrOptimizeOptions {
  /** Best-effort maximum number of index segments; omit to use Solr's unlimited default. */
  maxSegments?: number;
  /** Wait until the new searcher is registered; Solr defaults to true. */
  waitSearcher?: boolean;
  /** Open a new searcher; defaults to true. */
  openSearcher?: boolean;
}

/** @deprecated Use SolrUpdateOptions. */
export type UpdateOptions = SolrUpdateOptions;

/**
 * @deprecated Use SolrCommitOptions. maxSegments is optimize-only and is
 * rejected by commit(); use SolrOptimizeOptions for segment merging.
 */
export type CommitOptions = SolrCommitOptions & {
  /** @deprecated maxSegments is valid only for optimize(). */
  maxSegments?: number;
};
/** Common RealTime Get options. Filters map to repeated Solr fq parameters. */
export interface SolrGetOptions {
  /** Stored fields to return. */
  fields?: string | readonly string[];
  /** Optional filter queries applied by the RealTime Get handler. */
  filter?: string | readonly string[];
  /** Additional Solr request parameters. Reserved get parameters must use their typed properties. */
  params?: Readonly<Record<string, SolrQueryParamValue>>;
}

/** Retrieve one document by its unique key. */
export interface SolrGetSingleRequest extends SolrGetOptions {
  id: string;
  ids?: never;
}

/** Retrieve at least two documents; Solr returns a query-shaped response. */
export interface SolrGetMultipleRequest extends SolrGetOptions {
  ids: readonly [string, string, ...string[]];
  id?: never;
}

export type SolrGetRequest = SolrGetSingleRequest | SolrGetMultipleRequest;

/** Response from a single-ID RealTime Get request. */
export interface SolrGetSingleResponse<TDocument = unknown> {
  doc?: TDocument | null;
  [key: string]: unknown;
}

/** Response from a multi-ID RealTime Get request. */
export type SolrGetMultipleResponse<TDocument = unknown> = SolrResponse<TDocument>;

export interface SolrResponse<TDocument = unknown, TJsonFacet = unknown> {
  responseHeader?: SolrResponseHeader;
  response?: SolrQueryResult<TDocument>;
  /** Spellcheck suggestions, term frequencies, and optional collations. */
  spellcheck?: SolrSpellcheckResponse;
  /** Suggester results keyed by configured dictionary name and lookup query. */
  suggest?: SolrSuggesterResponse;
  /** Classic Facet API response; present when classic faceting is enabled. */
  facet_counts?: SolrFacetCounts;
  /** JSON Facet API response; the caller can provide its expected facet shape. */
  facets?: TJsonFacet;
  /** Highlight snippets keyed by document ID and field. */
  highlighting?: SolrHighlighting;
  /** Grouped query results keyed by group field or function. */
  grouped?: Readonly<Record<string, SolrGroupedResult<TDocument>>>;
  /** Additional documents returned by the Expand component. */
  expanded?: SolrExpandedResult<TDocument>;
  /** Stats Component response. */
  stats?: SolrStats;
  /** Alternating source document IDs and similar-document result objects. */
  moreLikeThis?: SolrMoreLikeThisResponse<TDocument>;
  /** Query parser and execution diagnostics, when debug is enabled. */
  debug?: SolrDebugInfo;
  /** Opaque cursor to pass as cursorMark on the next page. */
  nextCursorMark?: string;
  /** Other optional Solr response sections remain accessible. */
  [key: string]: unknown;
}
/** Core result metadata returned by a Solr /select query. */
export interface SolrQueryResult<TDocument = unknown> {
  /** Number of matching documents before pagination. */
  numFound?: number;
  /** Zero-based offset of the first returned document. */
  start?: number;
  /** Highest score among the returned documents, when scoring is enabled. */
  maxScore?: number;
  /** Whether numFound is exact rather than an estimate. */
  numFoundExact?: boolean;
  /** Documents in this page. */
  docs?: TDocument[];
}

/** MoreLikeThis Search Component response keyed by source document unique key. */
export type SolrMoreLikeThisResponse<TDocument = unknown> = Readonly<Record<string, SolrQueryResult<TDocument>>>;

/** Standard response header shared by Solr JSON responses. */
export interface SolrResponseHeader {
  status?: number;
  QTime?: number;
  partialResults?: boolean;
  [key: string]: unknown;
}

/** One classic numeric or date range-facet response. */
export interface SolrFacetRangeResult {
  counts?: readonly (string | number)[];
  start?: string | number;
  end?: string | number;
  gap?: string | number;
  before?: number;
  after?: number;
  between?: number;
  [key: string]: unknown;
}

/** Classic Facet API response sections. */
export interface SolrFacetCounts {
  facet_queries?: Readonly<Record<string, number>>;
  /** Alternating term and count values, as returned by Solr's JSON response. */
  facet_fields?: Readonly<Record<string, readonly (string | number)[]>>;
  /** Date ranges use facet_ranges; the legacy facet_dates section is not supported. */
  facet_ranges?: Readonly<Record<string, SolrFacetRangeResult>>;
  facet_intervals?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Highlight snippets keyed by document unique key, then field name. */
export type SolrHighlighting = Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;

/** A grouped result list for one group field or function. */
export interface SolrGroupedResult<TDocument = unknown> {
  matches?: number;
  ngroups?: number;
  totalGroupCount?: number;
  groups?: readonly {
    groupValue?: string | number | null;
    matches?: number;
    doclist?: SolrQueryResult<TDocument>;
  }[];
  doclist?: SolrQueryResult<TDocument>;
}

/** Common statistics returned for one field by the Stats Component. */
export interface SolrFieldStats {
  min?: number | string | null;
  max?: number | string | null;
  sum?: number;
  count?: number;
  missing?: number;
  mean?: number;
  stddev?: number;
  sumOfSquares?: number;
  distinctValues?: readonly unknown[];
  countDistinct?: number;
  cardinality?: number;
  percentiles?: Readonly<Record<string, number>>;
  facets?: Readonly<Record<string, Readonly<Record<string, SolrFieldStats>>>>;
  [key: string]: unknown;
}

/** Stats Component response. */
export interface SolrStats {
  stats_fields?: Readonly<Record<string, SolrFieldStats>>;
  [key: string]: unknown;
}

/** Common debug information returned when debug is enabled. */
export interface SolrDebugInfo {
  rawquerystring?: string;
  querystring?: string;
  parsedquery?: string;
  parsedquery_toString?: string;
  explain?: Readonly<Record<string, SolrExplanation>>;
  explainOther?: Readonly<Record<string, SolrExplanation>>;
  timing?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}

/** One spellcheck alternative, with frequency fields when extended results are enabled. */
export interface SolrSpellcheckAlternativeObject {
  word: string;
  freq?: number;
  frequency?: number;
  [key: string]: unknown;
}

/** Solr can return alternatives as strings, word/frequency tuples, or extended objects. */
export type SolrSpellcheckAlternative =
  | string
  | readonly [word: string, frequency: number]
  | SolrSpellcheckAlternativeObject;

/** Suggestions and frequency metadata for one original query term. */
export interface SolrSpellcheckTermResult {
  numFound?: number;
  startOffset?: number;
  endOffset?: number;
  origFreq?: number;
  suggestion?: readonly (string | SolrSpellcheckAlternative)[];
  [key: string]: unknown;
}

/** A query collation returned by spellcheck.collate. */
export interface SolrSpellcheckCollation {
  collationQuery: string;
  hits?: number;
  collationInternalRank?: number;
  misspellingsAndCorrections?: Readonly<Record<string, string>>;
  [key: string]: unknown;
}

/** JSON response shape for the SpellCheck component's NamedList data. */
export interface SolrSpellcheckResponse {
  suggestions?: Readonly<Record<string, SolrSpellcheckTermResult | SolrSpellcheckCollation | string>> |
    readonly (string | SolrSpellcheckTermResult | SolrSpellcheckCollation)[];
  correctlySpelled?: boolean;
  collations?: Readonly<Record<string, string | SolrSpellcheckCollation>> |
    readonly (string | SolrSpellcheckCollation)[];
  [key: string]: unknown;
}

/** One suggestion returned by a configured Solr Suggester dictionary. */
export interface SolrSuggesterSuggestion {
  term: string;
  weight?: number;
  payload?: string;
  [key: string]: unknown;
}

/** Results for one lookup query in one configured dictionary. */
export interface SolrSuggesterQueryResult {
  numFound?: number;
  suggestions?: readonly SolrSuggesterSuggestion[];
  [key: string]: unknown;
}

/** Suggester response keyed first by dictionary name, then by lookup query text. */
export type SolrSuggesterResponse = Readonly<Record<string, Readonly<Record<string, SolrSuggesterQueryResult>>>> & {
  [key: string]: unknown;
};

/** Typed response for the standard Solr query handler. */
export interface SolrQueryResponse<TDocument = unknown, TJsonFacet = unknown> extends SolrResponse<TDocument, TJsonFacet> {
  response?: SolrQueryResult<TDocument>;
}

export interface RequestControlOptions {
  /** Cancel this request. The caller signal and timeout are combined. */
  signal?: AbortSignal;
  /** Override the client timeout for this request, in milliseconds. */
  timeoutMs?: number;
  /** Headers that apply to this request only. */
  headers?: Readonly<Record<string, string>>;
}

export interface RequestOptions extends RequestControlOptions {
  method?: SolrHttpMethod;
  query?: URLSearchParams | Record<string, SolrQueryParamValue>;
  body?: unknown;
  operation?: string;
}



/** Common envelope for Solr Admin System API information responses. */
export interface SolrSystemInfoResponse {
  mode?: string;
  solr_home?: string;
  core_root?: string;
  lucene?: Readonly<Record<string, unknown>>;
  jvm?: Readonly<Record<string, unknown>>;
  security?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}

/** JVM and process properties returned by /admin/info/properties. */
export interface SolrSystemPropertiesResponse {
  properties?: Readonly<Record<string, string | number | boolean | null>>;
  [key: string]: unknown;
}

/** One thread entry returned by the JVM thread dump handler. */
export interface SolrSystemThreadInfo {
  id?: number;
  name?: string;
  state?: string;
  [key: string]: unknown;
}

/** Thread diagnostics use the nested system.threadDump response shape. */
export interface SolrSystemThreadsResponse {
  system?: {
    threadDump?: readonly (string | SolrSystemThreadInfo | { thread: SolrSystemThreadInfo })[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Logging configuration and level data returned by /admin/info/logging. */
export interface SolrSystemLoggingResponse {
  levels?: readonly (string | Readonly<Record<string, unknown>>)[];
  loggers?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}
