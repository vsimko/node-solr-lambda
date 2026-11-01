export { SolrClient } from "./client.js";
export { SolrHttpError, SolrValidationError } from "./errors.js";
export type { CollectionAdminAction, CoreAdminAction, RequestOptions, SolrAdminParams, SolrClientConfig, SolrDelete, SolrDocument, SolrQuery, SolrResponse, SolrVersion, ValidationConfig, ValidationSchema } from "./types.js";
import { SolrClient } from "./client.js";
import type { SolrClientConfig } from "./types.js";
export function createSolrClient(config:SolrClientConfig={}):SolrClient { return new SolrClient(config); }
