export { SolrClient } from "./client.js";
export { SolrAbortError, SolrHttpError, SolrNetworkError, SolrTimeoutError, SolrValidationError } from "./errors.js";
export type { SolrErrorDetail, SolrErrorMetadata } from "./errors.js";
export { solrExcludeTags, solrFieldAlias, solrFields, solrFilter, solrFunction, solrLocalParams, solrSort } from "./query-helpers.js";
export type { SolrFieldListEntry, SolrFunctionArgument, SolrLocalParamValue, SolrSortClause, SolrSortDirection, SolrSortInput } from "./query-helpers.js";
export type { SolrCollapseHint, SolrCollapseNullPolicy, SolrCollapseOptions, SolrExpandOptions, SolrExpandedResult, SolrGroupFormat, SolrGroupingOptions } from "./types.js";
export type { SolrFieldHighlightOptions, SolrHighlightEncoder, SolrHighlighterMethod, SolrHighlightingOptions } from "./types.js";
export type { SolrJsonFacetDefinition, SolrJsonFacetDomain, SolrJsonFacetMap, SolrJsonFacetMetric, SolrJsonFacetSort, SolrJsonQueryRequest, SolrJsonQueryResponse, SolrJsonQueryFacet, SolrJsonRangeFacet, SolrJsonTermsFacet } from "./types.js";
export type { SolrClassicFacetOptions, SolrFacetFieldOptions, SolrFacetInclude, SolrFacetMethod, SolrFacetOther, SolrFacetRangeOptions, SolrFacetRangeResult, SolrFacetSort, SolrRangeFacetMethod } from "./types.js";
export type { SolrDebugInfo, SolrFacetCounts, SolrFieldStats, SolrGroupedResult, SolrHighlighting, SolrQueryResponse, SolrQueryResult, SolrResponseHeader, SolrStats } from "./types.js";
export type { AddReplicaParams, AddReplicaPropertyParams, BalanceShardUniqueParams, CollectionAdminAction, CollectionAdminParams, CollectionReplicaType, DeleteReplicaParams, DeleteReplicaPropertyParams, MoveReplicaBaseParams, MoveReplicaParams, RebalanceLeadersParams, CommitOptions, CoreAdminAction, RequestControlOptions, RequestOptions, SolrAdminParams, SolrAuth, SolrClientConfig, SolrCursorQuery, SolrDelete, SolrDocument, SolrFilter, SolrFilterQuery, SolrHttpMethod, SolrLuceneQueryOptions, SolrDisMaxQueryOptions, SolrExtendedDisMaxQueryOptions, SolrQuery, SolrStandardQueryOptions, SolrQueryOperator, SolrQueryParser, SolrQueryParserOptions, SolrQueryParamValue, SolrRequestDefaults, SolrResponse, SolrResponseWriter, SolrRetryPolicy, SolrVersion, UpdateOptions, ValidationConfig, ValidationSchema } from "./types.js";
import { SolrClient } from "./client.js";
import type { SolrClientConfig } from "./types.js";
export function createSolrClient(config:SolrClientConfig={}):SolrClient { return new SolrClient(config); }
