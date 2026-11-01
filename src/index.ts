export { SolrClient } from "./client.js";
export { SolrAbortError, SolrHttpError, SolrNetworkError, SolrTimeoutError, SolrValidationError } from "./errors.js";
export type { SolrErrorDetail, SolrErrorMetadata } from "./errors.js";
export type { CollectionAdminAction, CommitOptions, CoreAdminAction, RequestControlOptions, RequestOptions, SolrAdminParams, SolrAuth, SolrClientConfig, SolrDelete, SolrDocument, SolrHttpMethod, SolrQuery, SolrRequestDefaults, SolrResponse, SolrRetryPolicy, SolrVersion, UpdateOptions, ValidationConfig, ValidationSchema } from "./types.js";
import { SolrClient } from "./client.js";
import type { SolrClientConfig } from "./types.js";
export function createSolrClient(config:SolrClientConfig={}):SolrClient { return new SolrClient(config); }
