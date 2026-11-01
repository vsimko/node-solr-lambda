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
  CollectionAdminAction, CommitOptions, CoreAdminAction, RequestControlOptions, SolrAdminParams,
  SolrClientConfig, SolrDelete, SolrDocument, SolrQuery, UpdateOptions
} from "./types.js";

/** Public Solr client. API methods delegate to domain modules over one transport. */
export class SolrClient extends SolrTransport {
  constructor(config: SolrClientConfig = {}) {
    super(config);
  }

  query<T = unknown>(query: SolrQuery, requestOptions: RequestControlOptions = {}): Promise<T> {
    return queryApi.query<T>(this, this.endpoint("/select"), query, requestOptions);
  }

  queryJson<T = unknown>(request: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
    return queryApi.queryJson<T>(this, this.endpoint("/query"), request, requestOptions);
  }

  add<T = unknown>(documents: SolrDocument | readonly SolrDocument[], options: UpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.add<T>(this, this.endpoint("/update"), documents, options, requestOptions);
  }

  update<T = unknown>(documents: SolrDocument | readonly SolrDocument[], options: UpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.update<T>(this, this.endpoint("/update"), documents, options, requestOptions);
  }

  delete<T = unknown>(command: SolrDelete, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.deleteDocuments<T>(this, this.endpoint("/update"), command, requestOptions);
  }

  commit<T = unknown>(options: CommitOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.commit<T>(this, this.endpoint("/update"), options, requestOptions);
  }

  softCommit<T = unknown>(requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.softCommit<T>(this, this.endpoint("/update"), requestOptions);
  }

  optimize<T = unknown>(maxSegments = 1, requestOptions: RequestControlOptions = {}): Promise<T> {
    return updateApi.optimize<T>(this, this.endpoint("/update"), maxSegments, requestOptions);
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

  collections<T = unknown>(action: CollectionAdminAction, params: SolrAdminParams = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
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
