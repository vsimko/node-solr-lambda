export { SolrClient } from "./client.js";
export { SolrAbortError, SolrHttpError, SolrNetworkError, SolrTimeoutError, SolrValidationError } from "./errors.js";
export type { SolrErrorDetail, SolrErrorMetadata } from "./errors.js";
export { solrExcludeTags, solrFieldAlias, solrFields, solrFilter, solrFunction, solrLocalParams, solrSort, solrGeofilt, solrBbox, solrGeoDistance } from "./query-helpers.js";
export type { SolrFieldListEntry, SolrFunctionArgument, SolrLocalParamValue, SolrSortClause, SolrSortDirection, SolrSortInput, SolrSpatialFilterOptions } from "./query-helpers.js";
export type { SolrStatsFieldOptions, SolrStatsOptions } from "./types.js";
export type { SolrMoreLikeThisOptions, SolrMoreLikeThisResponse } from "./types.js";
export type { SolrCollapseHint, SolrCollapseNullPolicy, SolrCollapseOptions, SolrExpandOptions, SolrExpandedResult, SolrGroupFormat, SolrGroupingOptions } from "./types.js";
export type { SolrFieldHighlightOptions, SolrHighlightEncoder, SolrHighlighterMethod, SolrHighlightingOptions } from "./types.js";
export type { SolrJsonFacetDefinition, SolrJsonFacetDomain, SolrJsonFacetMap, SolrJsonFacetMetric, SolrJsonFacetSort, SolrJsonQueryRequest, SolrJsonQueryResponse, SolrJsonQueryFacet, SolrJsonRangeFacet, SolrJsonTermsFacet } from "./types.js";
export type { SolrClassicFacetOptions, SolrFacetFieldOptions, SolrFacetInclude, SolrFacetMethod, SolrFacetOther, SolrFacetRangeOptions, SolrFacetRangeResult, SolrFacetSort, SolrRangeFacetMethod } from "./types.js";
export type { SolrDebugComponent, SolrDebugInfo, SolrDebugOptions, SolrExplanation, SolrStructuredExplanation, SolrFacetCounts, SolrFieldStats, SolrGroupedResult, SolrHighlighting, SolrQueryResponse, SolrQueryResult, SolrResponseHeader, SolrStats } from "./types.js";
export type { AddReplicaParams, AddReplicaPropertyParams, BalanceShardUniqueParams, CollectionAdminAction, CollectionAdminParams, CollectionReplicaType, DeleteReplicaParams, DeleteReplicaPropertyParams, MoveReplicaBaseParams, MoveReplicaParams, RebalanceLeadersParams, CommitOptions, CoreAdminAction, RequestControlOptions, RequestOptions, SolrAdminParams, SolrAuth, SolrClientConfig, SolrCursorQuery, SolrDelete, SolrDocument, SolrFilter, SolrFilterQuery, SolrHttpMethod, SolrLuceneQueryOptions, SolrDisMaxQueryOptions, SolrExtendedDisMaxQueryOptions, SolrQuery, SolrStandardQueryOptions, SolrQueryOperator, SolrQueryParser, SolrQueryParserOptions, SolrQueryParamValue, SolrRequestDefaults, SolrResponse, SolrResponseWriter, SolrRetryPolicy, SolrVersion, SolrDeleteOptions, SolrOptimizeOptions, SolrUpdateOptions, UpdateOptions, ValidationConfig, ValidationSchema, SolrSpatialQueryOptions } from "./types.js";
import { SolrClient } from "./client.js";
import type { SolrClientConfig } from "./types.js";
export function createSolrClient(config:SolrClientConfig={}):SolrClient { return new SolrClient(config); }
