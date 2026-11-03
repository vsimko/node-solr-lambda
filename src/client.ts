import { SolrTransport } from "./transport.js";
import * as queryApi from "./apis/query.js";
import * as updateApi from "./apis/update.js";
import { schema as schemaApi } from "./apis/schema.js";
import { config as configApi } from "./apis/config.js";
import { coreAdmin as coreAdminApi } from "./apis/core-admin.js";
import { collections as collectionsApi } from "./apis/collections.js";
import { security as securityApi } from "./apis/security.js";
import { systemInfo as systemInfoApi, systemProperties as systemPropertiesApi, systemThreads as systemThreadsApi, systemLogging as systemLoggingApi } from "./apis/system.js";
import { metrics as metricsApi } from "./apis/metrics.js";
import * as advancedApi from "./apis/advanced.js";
import * as replicationApi from "./apis/replication.js";
import type {
  CollectionAdminAction, CollectionAdminParams, CollectionAdminResponse, CoreAdminAction, CoreAdminCommandResponse, CoreAdminParams, RequestControlOptions, SolrMetricsParams, SolrMetricsResponse, SolrCommitOptions, SolrSoftCommitOptions, SolrConfigCommand, SolrConfigCommandResponse, SolrConfigReadResponse, SolrConfigOverlayResponse, SolrSchemaCommand, SolrSchemaCommandResponse, CollectionBackupParams, CollectionRestoreParams, CollectionListBackupParams, CollectionDeleteBackupParams, CollectionAsyncRequestStatusParams, CollectionAsyncRequestDeleteParams, SolrCollectionBackupResponse, SolrCollectionBackupListResponse, SolrCollectionBackupDeleteResponse, SolrCollectionAsyncRequestStatusResponse, SolrCollectionAsyncRequestDeleteResponse, SolrCollectionAliasesResponse, SolrCollectionAliasResponse, SolrClusterStatusResponse, SolrCollectionShardOperationResponse,
  SolrAtomicUpdateDocument, SolrClientConfig, SolrDelete, SolrDeleteOptions, SolrDocument, SolrJsonQueryRequest, SolrJsonUpdateCommands, SolrOptimizeOptions, SolrQuery, SolrUpdateOptions, SolrUpdateResponse,
  SolrReplicationCommand, SolrReplicationParams, SolrReplicationResponse, SolrReplicationFileContentParams, SolrAuthorizationCommand, SolrAuthorizationResponse, SolrAuthenticationCommand, SolrAuthenticationResponse, SolrReplicationFileListParams, SolrReplicationFileListResponse, SolrReplicationDeleteBackupParams, SolrExportParams, SolrStreamingExpressionResponse, SolrSystemInfoResponse, SolrSystemPropertiesResponse, SolrSystemThreadsResponse, SolrSystemLoggingResponse
} from "./types.js";

/** Public Solr client. API methods delegate to domain modules over one transport. */
export class SolrClient extends SolrTransport {
  constructor(config: SolrClientConfig = {}) {
    super(config);
  }

  query<T = unknown>(query: SolrQuery, requestOptions: RequestControlOptions = {}): Promise<T> {
    return queryApi.query<T>(this, this.endpoint("/select"), query, requestOptions);
  }

  queryJson<T = unknown>(request: SolrJsonQueryRequest, requestOptions?: RequestControlOptions): Promise<T>;
  queryJson<T = unknown>(request: Readonly<Record<string, unknown>> & { facet?: never }, requestOptions?: RequestControlOptions): Promise<T>;
  queryJson<T = unknown>(request: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
    return queryApi.queryJson<T>(this, this.endpoint("/query"), request, requestOptions);
  }

  add<T = SolrUpdateResponse>(documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.add<T>(this, this.endpoint("/update"), documents, options, requestOptions);
  }

  update<T = SolrUpdateResponse>(documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.update<T>(this, this.endpoint("/update"), documents, options, requestOptions);
  }

  updateCommands<T = SolrUpdateResponse>(commands: SolrJsonUpdateCommands, options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.updateCommands<T>(this, this.endpoint("/update"), commands, options, requestOptions);
  }

  atomicUpdate<TDocument extends object, TUniqueKey extends keyof TDocument = "id" extends keyof TDocument ? "id" : never, TResponse = SolrUpdateResponse>(
    documents: SolrAtomicUpdateDocument<TDocument, TUniqueKey> | readonly SolrAtomicUpdateDocument<TDocument, TUniqueKey>[],
    options: SolrUpdateOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<TResponse> {
    return updateApi.atomicUpdate<TResponse>(
      this,
      this.endpoint("/update"),
      documents as unknown as SolrDocument | readonly SolrDocument[],
      options,
      requestOptions
    );
  }

  delete<T = SolrUpdateResponse>(command: SolrDelete, options: SolrDeleteOptions = {}): Promise<T> {
    return updateApi.deleteDocuments<T>(this, this.endpoint("/update"), command, options);
  }

  commit<T = SolrUpdateResponse>(options: SolrCommitOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.commit<T>(this, this.endpoint("/update"), options, requestOptions);
  }

  softCommit<T = SolrUpdateResponse>(requestOptions?: RequestControlOptions): Promise<T>;
  softCommit<T = SolrUpdateResponse>(options?: SolrSoftCommitOptions, requestOptions?: RequestControlOptions): Promise<T>;
  softCommit<T = SolrUpdateResponse>(
    optionsOrRequestOptions: SolrSoftCommitOptions | RequestControlOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<T> {
    const isSoftCommitOptions = "waitSearcher" in optionsOrRequestOptions || "openSearcher" in optionsOrRequestOptions;
    const options = isSoftCommitOptions ? optionsOrRequestOptions as SolrSoftCommitOptions : {};
    const controls = isSoftCommitOptions ? requestOptions : optionsOrRequestOptions as RequestControlOptions;
    return updateApi.softCommit<T>(this, this.endpoint("/update"), options, controls);
  }

  optimize<T = SolrUpdateResponse>(options: SolrOptimizeOptions | number = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.optimize<T>(this, this.endpoint("/update"), options, requestOptions);
  }

  rollback<T = SolrUpdateResponse>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.rollback<T>(this, this.endpoint("/update"), requestOptions);
  }

  ping<T = unknown>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return this.request<T>(this.endpoint("/admin/ping"), { ...requestOptions, operation: "ping" });
  }

  schema<T = SolrSchemaCommandResponse>(command: SolrSchemaCommand, requestOptions: RequestControlOptions = {}): Promise<T> {
    return schemaApi<T>(this, this.endpoint("/schema"), command, requestOptions);
  }

  config<T = SolrConfigCommandResponse>(command: SolrConfigCommand, requestOptions: RequestControlOptions = {}): Promise<T> {
    return configApi<T>(this, this.endpoint("/config"), command, requestOptions);
  }

  /** Read the effective configuration (overlay merged with solrconfig.xml). */
  getConfig<T = SolrConfigReadResponse>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return this.request<T>(this.endpoint("/config"), { ...requestOptions, method: "GET", operation: "config" });
  }

  /** Read only the persisted Config API overlay. */
  getConfigOverlay<T = SolrConfigOverlayResponse>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return this.request<T>(this.endpoint("/config/overlay"), { ...requestOptions, method: "GET", operation: "config" });
  }

  coreAdmin<T = unknown>(action: "STATUS", params?: CoreAdminParams<"STATUS">, requestOptions?: RequestControlOptions): Promise<T>;
  coreAdmin<T = CoreAdminCommandResponse, A extends Exclude<CoreAdminAction, "STATUS"> = Exclude<CoreAdminAction, "STATUS">>(action: A, params: CoreAdminParams<A>, requestOptions?: RequestControlOptions): Promise<T>;
  coreAdmin<T = unknown, A extends CoreAdminAction = CoreAdminAction>(action: A, params: CoreAdminParams<A> = {} as CoreAdminParams<A>, requestOptions: RequestControlOptions = {}): Promise<T> {
    return coreAdminApi<T, A>(this, action, params, requestOptions);
  }

  collections<const A extends CollectionAdminAction>(
    ...args: A extends "LIST" | "LISTALIASES" | "CLUSTERSTATUS"
      ? [action: A, params?: CollectionAdminParams<A>, requestOptions?: RequestControlOptions]
      : [action: A, params: CollectionAdminParams<A>, requestOptions?: RequestControlOptions]
  ): Promise<CollectionAdminResponse<A>>;
  collections<T = unknown, A extends CollectionAdminAction = CollectionAdminAction>(action: A, params: CollectionAdminParams<A> = {} as CollectionAdminParams<A>, requestOptions: RequestControlOptions = {}): Promise<T> {
    return collectionsApi<T>(this, action, params, requestOptions);
  }

  replication(
    command: "filelist",
    params: SolrReplicationFileListParams,
    requestOptions?: RequestControlOptions
  ): Promise<SolrReplicationFileListResponse>;
  replication(
    command: "deletebackup",
    params: SolrReplicationDeleteBackupParams,
    requestOptions?: RequestControlOptions
  ): Promise<SolrReplicationResponse<"deletebackup">>;
  replication<A extends Exclude<SolrReplicationCommand, "filelist" | "deletebackup">>(
    command: A,
    params?: SolrReplicationParams<A>,
    requestOptions?: RequestControlOptions
  ): Promise<SolrReplicationResponse<A>>;
  replication<A extends SolrReplicationCommand>(
    command: A,
    params: SolrReplicationParams<A> = {} as SolrReplicationParams<A>,
    requestOptions: RequestControlOptions = {}
  ): Promise<SolrReplicationResponse<A>> {
    return replicationApi.replication(this, this.endpoint("/replication"), command, params, requestOptions);
  }

  replicationFile(params: SolrReplicationFileContentParams, requestOptions: RequestControlOptions = {}): Promise<Response> {
    return replicationApi.replicationFile(this, this.endpoint("/replication"), params, requestOptions);
  }

  systemInfo<T = SolrSystemInfoResponse>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return systemInfoApi<T>(this, requestOptions);
  }

  /** Read JVM and process properties from the global System API. */
  systemProperties<T = SolrSystemPropertiesResponse>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return systemPropertiesApi<T>(this, requestOptions);
  }

  /** Read the current JVM thread dump from the global System API. */
  systemThreads<T = SolrSystemThreadsResponse>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return systemThreadsApi<T>(this, requestOptions);
  }

  /** Read logger names, levels, and logging configuration from the global System API. */
  systemLogging<T = SolrSystemLoggingResponse>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return systemLoggingApi<T>(this, requestOptions);
  }

  metrics<T = SolrMetricsResponse>(params: SolrMetricsParams = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return metricsApi<T>(this, params, requestOptions);
  }

  security<T = SolrAuthorizationResponse>(area: "authorization", command?: SolrAuthorizationCommand, requestOptions?: RequestControlOptions): Promise<T>;
  security<T = SolrAuthenticationResponse>(area: "authentication", command?: SolrAuthenticationCommand, requestOptions?: RequestControlOptions): Promise<T>;
  security<T = unknown>(
    area: "authentication" | "authorization",
    command?: SolrAuthenticationCommand | SolrAuthorizationCommand,
    requestOptions: RequestControlOptions = {}
  ): Promise<T> {
    return securityApi<T>(this, area, command, requestOptions);
  }

  stream<T = SolrStreamingExpressionResponse>(expression: string, requestOptions: RequestControlOptions = {}): Promise<T> {
    return advancedApi.stream<T>(this, this.endpoint("/stream"), expression, requestOptions);
  }

  export(params: SolrExportParams, requestOptions: RequestControlOptions = {}): Promise<Response> {
    return advancedApi.exportResults(this, this.endpoint("/export"), params, requestOptions);
  }

  /** Return the raw Export response body as a backpressure-aware byte stream. */
  async exportStream(params: SolrExportParams, requestOptions: RequestControlOptions = {}): Promise<ReadableStream<Uint8Array>> {
    const response = await this.export(params, requestOptions);
    if (!response.body) throw new Error("Solr Export response did not contain a body stream");
    return response.body;
  }
}
