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
  CollectionAdminAction, CommitOptions, CoreAdminAction, SolrAdminParams,
  SolrClientConfig, SolrDelete, SolrDocument, SolrQuery, UpdateOptions
} from "./types.js";

/** Public Solr client. API methods delegate to domain modules over one transport. */
export class SolrClient extends SolrTransport {
  constructor(config: SolrClientConfig = {}) {
    super(config);
  }

  query<T = unknown>(query: SolrQuery): Promise<T> {
    return queryApi.query<T>(this, this.endpoint("/select"), query);
  }

  queryJson<T = unknown>(request: Readonly<Record<string, unknown>>): Promise<T> {
    return queryApi.queryJson<T>(this, this.endpoint("/query"), request);
  }

  add<T = unknown>(documents: SolrDocument | readonly SolrDocument[], options: UpdateOptions = {}): Promise<T> {
    return updateApi.add<T>(this, this.endpoint("/update"), documents, options);
  }

  update<T = unknown>(documents: SolrDocument | readonly SolrDocument[], options: UpdateOptions = {}): Promise<T> {
    return updateApi.update<T>(this, this.endpoint("/update"), documents, options);
  }

  delete<T = unknown>(command: SolrDelete): Promise<T> {
    return updateApi.deleteDocuments<T>(this, this.endpoint("/update"), command);
  }

  commit<T = unknown>(options: CommitOptions = {}): Promise<T> {
    return updateApi.commit<T>(this, this.endpoint("/update"), options);
  }

  softCommit<T = unknown>(): Promise<T> {
    return updateApi.softCommit<T>(this, this.endpoint("/update"));
  }

  optimize<T = unknown>(maxSegments = 1): Promise<T> {
    return updateApi.optimize<T>(this, this.endpoint("/update"), maxSegments);
  }

  rollback<T = unknown>(): Promise<T> {
    return updateApi.rollback<T>(this, this.endpoint("/update"));
  }

  ping<T = unknown>(): Promise<T> {
    return this.request<T>(this.endpoint("/admin/ping"), { operation: "ping" });
  }

  schema<T = unknown>(command: Readonly<Record<string, unknown>>): Promise<T> {
    return schemaApi<T>(this, this.endpoint("/schema"), command);
  }

  config<T = unknown>(command: Readonly<Record<string, unknown>>): Promise<T> {
    return configApi<T>(this, this.endpoint("/config"), command);
  }

  coreAdmin<T = unknown>(action: CoreAdminAction, params: SolrAdminParams = {}): Promise<T> {
    return coreAdminApi<T>(this, action, params);
  }

  collections<T = unknown>(action: CollectionAdminAction, params: SolrAdminParams = {}): Promise<T> {
    return collectionsApi<T>(this, action, params);
  }

  systemInfo<T = unknown>(): Promise<T> {
    return systemInfoApi<T>(this);
  }

  metrics<T = unknown>(params: SolrAdminParams = {}): Promise<T> {
    return metricsApi<T>(this, params);
  }

  security<T = unknown>(area: "authentication" | "authorization", command?: Readonly<Record<string, unknown>>): Promise<T> {
    return securityApi<T>(this, area, command);
  }

  stream<T = unknown>(expression: string): Promise<T> {
    return advancedApi.stream<T>(this, this.endpoint("/stream"), expression);
  }

  export(params: SolrAdminParams): Promise<Response> {
    return advancedApi.exportResults(this, this.endpoint("/export"), params);
  }
}
