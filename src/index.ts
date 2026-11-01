export { SolrClient } from "./client.js";
export { SolrAbortError, SolrHttpError, SolrNetworkError, SolrTimeoutError, SolrValidationError } from "./errors.js";
export type { SolrErrorDetail, SolrErrorMetadata } from "./errors.js";
export { solrExcludeTags, solrFieldAlias, solrFields, solrFilter, solrFunction, solrLocalParams, solrSort } from "./query-helpers.js";
export type { SolrFieldListEntry, SolrFunctionArgument, SolrLocalParamValue, SolrSortClause, SolrSortDirection, SolrSortInput } from "./query-helpers.js";
export type { AddReplicaParams, AddReplicaPropertyParams, BalanceShardUniqueParams, CollectionAdminAction, CollectionAdminParams, CollectionReplicaType, DeleteReplicaParams, DeleteReplicaPropertyParams, MoveReplicaParams, CommitOptions, CoreAdminAction, RequestControlOptions, RequestOptions, SolrAdminParams, SolrAuth, SolrClientConfig, SolrCursorQuery, SolrDelete, SolrDocument, SolrFilter, SolrFilterQuery, SolrHttpMethod, SolrLuceneQueryOptions, SolrDisMaxQueryOptions, SolrExtendedDisMaxQueryOptions, SolrQuery, SolrStandardQueryOptions, SolrQueryOperator, SolrQueryParser, SolrQueryParserOptions, SolrQueryParamValue, SolrRequestDefaults, SolrResponse, SolrResponseWriter, SolrRetryPolicy, SolrVersion, UpdateOptions, ValidationConfig, ValidationSchema } from "./types.js";
import { SolrClient } from "./client.js";
import type { SolrClientConfig } from "./types.js";
export function createSolrClient(config:SolrClientConfig={}):SolrClient { return new SolrClient(config); }
