import { SolrTransport } from "./transport.js";
import * as queryApi from "./apis/query.js";
import * as updateApi from "./apis/update.js";
import { schema as schemaApi } from "./apis/schema.js";
import { config as configApi } from "./apis/config.js";
import { coreAdmin as coreAdminApi } from "./apis/core-admin.js";
import { collections as collectionsApi } from "./apis/collections.js";
import { security as securityApi } from "./apis/security.js";
import { systemInfo as systemInfoApi } from "./apis/system.js";
import { metrics as metricsApi } from "./apis/metrics.js";
import * as advancedApi from "./apis/advanced.js";
import type {
  CollectionAdminAction, CollectionAdminParams, CoreAdminAction, RequestControlOptions, SolrAdminParams, SolrCommitOptions, SolrSoftCommitOptions,
  SolrAtomicUpdateDocument, SolrClientConfig, SolrDelete, SolrDeleteOptions, SolrDocument, SolrJsonQueryRequest, SolrJsonUpdateCommands, SolrOptimizeOptions, SolrQuery, SolrUpdateOptions
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

  add<T = unknown>(documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.add<T>(this, this.endpoint("/update"), documents, options, requestOptions);
  }

  update<T = unknown>(documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.update<T>(this, this.endpoint("/update"), documents, options, requestOptions);
  }

  updateCommands<T = unknown>(commands: SolrJsonUpdateCommands, options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.updateCommands<T>(this, this.endpoint("/update"), commands, options, requestOptions);
  }

  atomicUpdate<TDocument extends object, TUniqueKey extends keyof TDocument = "id" extends keyof TDocument ? "id" : never>(
    documents: SolrAtomicUpdateDocument<TDocument, TUniqueKey> | readonly SolrAtomicUpdateDocument<TDocument, TUniqueKey>[],
    options: SolrUpdateOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<unknown> {
    return updateApi.atomicUpdate<unknown>(
      this,
      this.endpoint("/update"),
      documents as unknown as SolrDocument | readonly SolrDocument[],
      options,
      requestOptions
    );
  }

  delete<T = unknown>(command: SolrDelete, options: SolrDeleteOptions = {}): Promise<T> {
    return updateApi.deleteDocuments<T>(this, this.endpoint("/update"), command, options);
  }

  commit<T = unknown>(options: SolrCommitOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.commit<T>(this, this.endpoint("/update"), options, requestOptions);
  }

  softCommit<T = unknown>(requestOptions?: RequestControlOptions): Promise<T>;
  softCommit<T = unknown>(options?: SolrSoftCommitOptions, requestOptions?: RequestControlOptions): Promise<T>;
  softCommit<T = unknown>(
    optionsOrRequestOptions: SolrSoftCommitOptions | RequestControlOptions = {},
    requestOptions: RequestControlOptions = {}
  ): Promise<T> {
    const isSoftCommitOptions = "waitSearcher" in optionsOrRequestOptions || "openSearcher" in optionsOrRequestOptions;
    const options = isSoftCommitOptions ? optionsOrRequestOptions as SolrSoftCommitOptions : {};
    const controls = isSoftCommitOptions ? requestOptions : optionsOrRequestOptions as RequestControlOptions;
    return updateApi.softCommit<T>(this, this.endpoint("/update"), options, controls);
  }

  optimize<T = unknown>(options: SolrOptimizeOptions | number = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.optimize<T>(this, this.endpoint("/update"), options, requestOptions);
  }

  rollback<T = unknown>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.rollback<T>(this, this.endpoint("/update"), requestOptions);
  }

  ping<T = unknown>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return this.request<T>(this.endpoint("/admin/ping"), { ...requestOptions, operation: "ping" });
  }

  schema<T = unknown>(command: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
    return schemaApi<T>(this, this.endpoint("/schema"), command, requestOptions);
  }

  config<T = unknown>(command: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
    return configApi<T>(this, this.endpoint("/config"), command, requestOptions);
  }

  coreAdmin<T = unknown>(action: CoreAdminAction, params: SolrAdminParams = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return coreAdminApi<T>(this, action, params, requestOptions);
  }

  collections<T = unknown, A extends CollectionAdminAction = CollectionAdminAction>(action: A, params: CollectionAdminParams<A> = {} as CollectionAdminParams<A>, requestOptions: RequestControlOptions = {}): Promise<T> {
    return collectionsApi<T>(this, action, params, requestOptions);
  }

  systemInfo<T = unknown>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return systemInfoApi<T>(this, requestOptions);
  }

  metrics<T = unknown>(params: SolrAdminParams = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return metricsApi<T>(this, params, requestOptions);
  }

  security<T = unknown>(area: "authentication" | "authorization", command?: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
    return securityApi<T>(this, area, command, requestOptions);
  }

  stream<T = unknown>(expression: string, requestOptions: RequestControlOptions = {}): Promise<T> {
    return advancedApi.stream<T>(this, this.endpoint("/stream"), expression, requestOptions);
  }

  export(params: SolrAdminParams, requestOptions: RequestControlOptions = {}): Promise<Response> {
    return advancedApi.exportResults(this, this.endpoint("/export"), params, requestOptions);
  }
}
