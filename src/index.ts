export { SolrClient } from "./client.js";
export { SolrHttpError, SolrNetworkError, SolrValidationError } from "./errors.js";
export type { SolrErrorDetail, SolrErrorMetadata } from "./errors.js";
export type { CollectionAdminAction, CommitOptions, CoreAdminAction, RequestOptions, SolrAdminParams, SolrAuth, SolrClientConfig, SolrDelete, SolrDocument, SolrHttpMethod, SolrQuery, SolrRequestDefaults, SolrResponse, SolrRetryPolicy, SolrVersion, UpdateOptions, ValidationConfig, ValidationSchema } from "./types.js";
import { SolrClient } from "./client.js";
import type { SolrClientConfig } from "./types.js";
export function createSolrClient(config:SolrClientConfig={}):SolrClient { return new SolrClient(config); }
