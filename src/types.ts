export type SolrVersion = "8" | "9" | "10";
export type SolrHttpMethod = "GET" | "POST" | "PUT" | "DELETE";
export type CoreAdminAction = "STATUS" | "CREATE" | "RELOAD" | "UNLOAD" | "RENAME" | "SWAP" | "MERGEINDEXES" | "SPLIT" | "REQUESTSTATUS" | "REQUESTRECOVERY";
export type CollectionAdminAction = "LIST" | "CREATE" | "DELETE" | "RELOAD" | "MODIFYCOLLECTION" | "CREATEALIAS" | "DELETEALIAS" | "LISTALIASES" | "CLUSTERSTATUS" | "ADDREPLICA" | "DELETEREPLICA" | "MOVEREPLICA" | "BALANCESHARDUNIQUE" | "REBALANCELEADERS" | "ADDREPLICAPROP" | "DELETEREPLICAPROP" | "CREATESHARD" | "DELETESHARD" | "SPLITSHARD" | "ADDROLE" | "REMOVEROLE" | "BACKUP" | "RESTORE" | "LISTBACKUP" | "DELETEBACKUP" | "REQUESTSTATUS" | "DELETESTATUS";
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
  defaults?: Readonly<Record<string, SolrConfigValue>>;
  appends?: Readonly<Record<string, SolrConfigValue>>;
  invariants?: Readonly<Record<string, SolrConfigValue>>;
  useParams?: readonly string[];
  [key: string]: unknown;
}
export type SolrConfigReadPluginCollection = Readonly<Record<string, SolrConfigReadPlugin>> | readonly SolrConfigReadPlugin[];
export interface SolrConfigSettings {
  query?: SolrConfigQuerySettings;
  updateHandler?: SolrConfigUpdateHandlerSettings;
  requestDispatcher?: SolrConfigRequestDispatcherSettings;
  requestHandler?: Readonly<Record<string, SolrConfigReadPlugin>>;
  searchComponent?: Readonly<Record<string, SolrConfigReadPlugin>>;
  queryResponseWriter?: Readonly<Record<string, SolrConfigReadPlugin>>;
  initParams?: SolrConfigReadPluginCollection;
  listener?: SolrConfigReadPluginCollection;
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
  createNodeSet?: string;
  "router.name"?: "compositeId" | "implicit" | (string & {});
  "router.field"?: string;
  shards?: string;
  "collection.configName"?: string;
  autoAddReplicas?: boolean;
  waitForFinalState?: boolean;
  rule?: string | readonly string[];
  snitch?: string | readonly string[];
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
export interface CreateShardParams extends CollectionRequestBase { collection: string; shard: string; createNodeSet?: string; nrtReplicas?: number; tlogReplicas?: number; pullReplicas?: number; waitForFinalState?: boolean }
export interface DeleteShardParams extends CollectionRequestBase { collection: string; shard: string; deleteInstanceDir?: boolean; deleteDataDir?: boolean; deleteIndex?: boolean }
export interface SplitShardParams extends CollectionRequestBase { collection: string; shard?: string; splitKey?: string; ranges?: string; numSubShards?: number; splitMethod?: "rewrite" | "link" | "router"; waitForFinalState?: boolean }
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
  A extends "BACKUP" ? CollectionBackupParams :
  A extends "RESTORE" ? CollectionRestoreParams :
  A extends "LISTBACKUP" ? CollectionListBackupParams :
  A extends "DELETEBACKUP" ? CollectionDeleteBackupParams :
  A extends "REQUESTSTATUS" ? CollectionAsyncRequestStatusParams :
  A extends "DELETESTATUS" ? CollectionAsyncRequestDeleteParams :
  CollectionRoleParams;

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
  defaults?: Readonly<Record<string, SolrConfigValue>>;
  appends?: Readonly<Record<string, SolrConfigValue>>;
  invariants?: Readonly<Record<string, SolrConfigValue>>;
  useParams?: string | readonly string[];
  components?: string | readonly string[];
}
export interface SolrSearchComponentConfig extends SolrConfigPlugin {
  query?: Readonly<Record<string, SolrConfigValue>>;
  highlighting?: Readonly<Record<string, SolrConfigValue>>;
  spellcheck?: Readonly<Record<string, SolrConfigValue>>;
  terms?: Readonly<Record<string, SolrConfigValue>>;
}
export interface SolrQueryResponseWriterConfig extends SolrConfigPlugin {
  contentType?: string;
  charset?: string;
}
export interface SolrInitParamsConfig {
  name: string;
  path?: string | readonly string[];
  defaults?: Readonly<Record<string, SolrConfigValue>>;
  appends?: Readonly<Record<string, SolrConfigValue>>;
  invariants?: Readonly<Record<string, SolrConfigValue>>;
  customOptions?: Readonly<Record<string, SolrConfigValue>>;
}
export interface SolrListenerConfig extends SolrConfigPlugin {
  event: string;
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
  retry?: SolrRetryPolicy | false;
  requestDefaults?: SolrRequestDefaults;
  validation?: ValidationConfig;
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
export interface SolrResponse<TDocument = unknown, TJsonFacet = unknown> {
  responseHeader?: SolrResponseHeader;
  response?: SolrQueryResult<TDocument>;
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
  system?: Readonly<Record<string, string | number | boolean | null>>;
  [key: string]: unknown;
}

/** Thread diagnostics returned by /admin/info/threads; thread details vary by JVM. */
export interface SolrSystemThreadsResponse {
  threadDump?: string;
  [key: string]: unknown;
}

/** Logging configuration and level data returned by /admin/info/logging. */
export interface SolrSystemLoggingResponse {
  levels?: readonly (string | Readonly<Record<string, unknown>>)[];
  loggers?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}
