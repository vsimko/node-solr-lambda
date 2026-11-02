export type SolrVersion = "8" | "9" | "10";
export type SolrHttpMethod = "GET" | "POST" | "PUT" | "DELETE";
export type CoreAdminAction = "STATUS" | "CREATE" | "RELOAD" | "UNLOAD" | "RENAME" | "SWAP" | "MERGEINDEXES" | "SPLIT";
export type CollectionAdminAction = "LIST" | "CREATE" | "DELETE" | "RELOAD" | "MODIFYCOLLECTION" | "CREATEALIAS" | "DELETEALIAS" | "LISTALIASES" | "CLUSTERSTATUS" | "ADDREPLICA" | "DELETEREPLICA" | "MOVEREPLICA" | "BALANCESHARDUNIQUE" | "REBALANCELEADERS" | "ADDREPLICAPROP" | "DELETEREPLICAPROP" | "CREATESHARD" | "DELETESHARD" | "SPLITSHARD" | "ADDROLE" | "REMOVEROLE";
export type SolrAdminParams = Readonly<Record<string, string | number | boolean>>;

/** Custom key/value parameters for administrative actions not yet modelled by this client. */
export type SolrAdminCustomParams = SolrAdminParams;

/** Values accepted by Config API properties and plugin configuration. */
export type SolrConfigValue = string | number | boolean | null | readonly SolrConfigValue[] | { readonly [key: string]: SolrConfigValue };

/** A typed Core Admin STATUS request. */
export interface CoreStatusParams {
  core?: string;
  indexInfo?: boolean;
  customParams?: SolrAdminCustomParams;
}
export interface CoreCreateParams {
  name: string;
  instanceDir?: string;
  dataDir?: string;
  config?: string;
  schema?: string;
  configSet?: string;
  collection?: string;
  shard?: string;
  numShards?: number;
  replicaType?: CollectionReplicaType;
  async?: string;
  customParams?: SolrAdminCustomParams;
}
export interface CoreReloadParams { core: string; async?: string; customParams?: SolrAdminCustomParams }
export interface CoreUnloadParams {
  core: string;
  deleteIndex?: boolean;
  deleteDataDir?: boolean;
  deleteInstanceDir?: boolean;
  async?: string;
  customParams?: SolrAdminCustomParams;
}
export interface CoreRenameParams { core: string; other: string; async?: string; customParams?: SolrAdminCustomParams }
export interface CoreSwapParams { core: string; other: string; async?: string; customParams?: SolrAdminCustomParams }
export interface CoreMergeIndexesParams {
  core: string;
  indexDir?: string | readonly string[];
  srcCore?: string | readonly string[];
  async?: string;
  customParams?: SolrAdminCustomParams;
}
export interface CoreSplitParams {
  core: string;
  path?: string | readonly string[];
  targetCore?: string | readonly string[];
  ranges?: string;
  splitKey?: string;
  async?: string;
  customParams?: SolrAdminCustomParams;
}
/** Action-specific Core Admin parameters; customParams is the explicit escape hatch. */
export type CoreAdminParams<A extends CoreAdminAction> =
  A extends "STATUS" ? CoreStatusParams :
  A extends "CREATE" ? CoreCreateParams :
  A extends "RELOAD" ? CoreReloadParams :
  A extends "UNLOAD" ? CoreUnloadParams :
  A extends "RENAME" ? CoreRenameParams :
  A extends "SWAP" ? CoreSwapParams :
  A extends "MERGEINDEXES" ? CoreMergeIndexesParams :
  CoreSplitParams;

/** Replica types accepted by the SolrCloud Collections API. */
export type CollectionReplicaType = "nrt" | "tlog" | "pull";
export interface CollectionRequestBase { async?: string; customParams?: SolrAdminCustomParams }
export interface ListCollectionsParams extends CollectionRequestBase {}
export interface CreateCollectionParams extends CollectionRequestBase {
  name: string;
  numShards?: number;
  replicationFactor?: number;
  nrtReplicas?: number;
  tlogReplicas?: number;
  pullReplicas?: number;
  maxShardsPerNode?: number;
  createNodeSet?: string;
  "router.name"?: "compositeId" | "implicit" | (string & {});
  "router.field"?: string;
  shards?: string;
  "collection.configName"?: string;
  autoAddReplicas?: boolean;
  waitForFinalState?: boolean;
  rule?: string | readonly string[];
  snitch?: string | readonly string[];
}
export interface DeleteCollectionParams extends CollectionRequestBase { name: string }
export interface ReloadCollectionParams extends CollectionRequestBase { name: string }
export interface ModifyCollectionParams extends CollectionRequestBase {
  collection: string;
  replicationFactor?: number;
  readOnly?: boolean;
  autoAddReplicas?: boolean;
  maxShardsPerNode?: number;
  rule?: string | readonly string[];
  snitch?: string | readonly string[];
}
export interface CreateAliasParams extends CollectionRequestBase { name: string; collections: string | readonly string[] }
export interface DeleteAliasParams extends CollectionRequestBase { name: string }
export interface ListAliasesParams extends CollectionRequestBase {}
export interface ClusterStatusParams extends CollectionRequestBase { collection?: string; shard?: string; route?: string; coreInfo?: boolean }
export interface CreateShardParams extends CollectionRequestBase { collection: string; shard: string; createNodeSet?: string; nrtReplicas?: number; tlogReplicas?: number; pullReplicas?: number; waitForFinalState?: boolean }
export interface DeleteShardParams extends CollectionRequestBase { collection: string; shard: string; deleteInstanceDir?: boolean; deleteDataDir?: boolean; deleteIndex?: boolean }
export interface SplitShardParams extends CollectionRequestBase { collection: string; shard?: string; splitKey?: string; ranges?: string; numSubShards?: number; splitMethod?: "rewrite" | "link" | "router"; waitForFinalState?: boolean }
export interface CollectionRoleParams extends CollectionRequestBase { node: string; role: string }

/** Parameters for Collections API ADDREPLICA. */
export interface AddReplicaParams extends CollectionRequestBase {
  collection: string;
  shard?: string;
  name?: string;
  type?: CollectionReplicaType;
  node?: string;
  createNodeSet?: string;
  waitForFinalState?: boolean;
}
/** Parameters for Collections API DELETEREPLICA. */
export interface DeleteReplicaParams extends CollectionRequestBase {
  collection: string;
  shard: string;
  replica: string;
  deleteInstanceDir?: boolean;
  deleteDataDir?: boolean;
  deleteIndex?: boolean;
}
export interface MoveReplicaBaseParams extends CollectionRequestBase {
  collection: string;
  targetNode: string;
  timeout?: number;
  inPlaceMove?: boolean;
}
export type MoveReplicaParams = MoveReplicaBaseParams & (
  | { replica: string; sourceNode?: never; shard?: never }
  | { replica?: never; sourceNode: string; shard: string }
);
export interface BalanceShardUniqueParams extends CollectionRequestBase {
  collection: string;
  property: string;
  onlyactivenodes?: boolean;
  shardUnique?: boolean;
}
export interface RebalanceLeadersParams extends CollectionRequestBase { collection: string; maxAtOnce?: number; maxWaitSeconds?: number }
export interface AddReplicaPropertyParams extends CollectionRequestBase {
  collection: string;
  shard: string;
  replica: string;
  property: string;
  "property.value": string;
  shardUnique?: boolean;
}
export interface DeleteReplicaPropertyParams extends CollectionRequestBase { collection: string; shard: string; replica: string; property: string }

/** Action-specific Collections API parameters. Unsupported actions still have a named customParams escape hatch. */
export type CollectionAdminParams<A extends CollectionAdminAction> =
  A extends "LIST" ? ListCollectionsParams :
  A extends "CREATE" ? CreateCollectionParams :
  A extends "DELETE" ? DeleteCollectionParams :
  A extends "RELOAD" ? ReloadCollectionParams :
  A extends "MODIFYCOLLECTION" ? ModifyCollectionParams :
  A extends "CREATEALIAS" ? CreateAliasParams :
  A extends "DELETEALIAS" ? DeleteAliasParams :
  A extends "LISTALIASES" ? ListAliasesParams :
  A extends "CLUSTERSTATUS" ? ClusterStatusParams :
  A extends "ADDREPLICA" ? AddReplicaParams :
  A extends "DELETEREPLICA" ? DeleteReplicaParams :
  A extends "MOVEREPLICA" ? MoveReplicaParams :
  A extends "BALANCESHARDUNIQUE" ? BalanceShardUniqueParams :
  A extends "REBALANCELEADERS" ? RebalanceLeadersParams :
  A extends "ADDREPLICAPROP" ? AddReplicaPropertyParams :
  A extends "DELETEREPLICAPROP" ? DeleteReplicaPropertyParams :
  A extends "CREATESHARD" ? CreateShardParams :
  A extends "DELETESHARD" ? DeleteShardParams :
  A extends "SPLITSHARD" ? SplitShardParams :
  CollectionRoleParams;

/** One field definition in the Schema API. */
export interface SolrSchemaField {
  name: string;
  type: string;
  default?: SolrConfigValue;
  docValues?: boolean;
  indexed?: boolean;
  multiValued?: boolean;
  required?: boolean;
  stored?: boolean;
  uninvertible?: boolean;
  useDocValuesAsStored?: boolean;
  large?: boolean;
  omitNorms?: boolean;
  omitTermFreqAndPositions?: boolean;
  omitPositions?: boolean;
  termVectors?: boolean;
  termPositions?: boolean;
  termOffsets?: boolean;
  termPayloads?: boolean;
  sortMissingFirst?: boolean;
  sortMissingLast?: boolean;
}
export interface SolrSchemaDynamicField extends SolrSchemaField {}
export interface SolrSchemaFieldType {
  name: string;
  class: string;
  positionIncrementGap?: number;
  multiValued?: boolean;
  docValuesFormat?: string;
  postingsFormat?: string;
  analyzer?: SolrSchemaAnalyzer;
  indexAnalyzer?: SolrSchemaAnalyzer;
  queryAnalyzer?: SolrSchemaAnalyzer;
  similarity?: Readonly<Record<string, SolrConfigValue>>;
  [key: string]: unknown;
}
export interface SolrSchemaAnalyzer {
  tokenizer?: SolrSchemaAnalyzerComponent;
  filters?: readonly SolrSchemaAnalyzerComponent[];
  charFilters?: readonly SolrSchemaAnalyzerComponent[];
}
export interface SolrSchemaAnalyzerComponent {
  class: string;
  [key: string]: unknown;
}
export interface SolrSchemaCopyField { source: string; dest: string; maxChars?: number }
export type SolrSchemaCommand =
  | { "add-field": SolrSchemaField }
  | { "replace-field": SolrSchemaField }
  | { "delete-field": { name: string } }
  | { "add-dynamic-field": SolrSchemaDynamicField }
  | { "replace-dynamic-field": SolrSchemaDynamicField }
  | { "delete-dynamic-field": { name: string } }
  | { "add-field-type": SolrSchemaFieldType }
  | { "replace-field-type": SolrSchemaFieldType }
  | { "delete-field-type": { name: string } }
  | { "add-copy-field": SolrSchemaCopyField }
  | { "delete-copy-field": { source: string; dest: string } };

/** Shared settings for named Config API plugins. */
export interface SolrConfigPlugin {
  name: string;
  class: string;
  startup?: "lazy" | "eager";
  initParams?: Readonly<Record<string, SolrConfigValue>>;
  /** Explicit escape hatch for plugin-specific settings; flattened into the component definition. */
  customOptions?: Readonly<Record<string, SolrConfigValue>>;
}
export interface SolrRequestHandlerConfig extends SolrConfigPlugin {
  defaults?: Readonly<Record<string, SolrConfigValue>>;
  appends?: Readonly<Record<string, SolrConfigValue>>;
  invariants?: Readonly<Record<string, SolrConfigValue>>;
  useParams?: string | readonly string[];
  components?: string | readonly string[];
}
export interface SolrSearchComponentConfig extends SolrConfigPlugin {
  query?: Readonly<Record<string, SolrConfigValue>>;
  highlighting?: Readonly<Record<string, SolrConfigValue>>;
  spellcheck?: Readonly<Record<string, SolrConfigValue>>;
  terms?: Readonly<Record<string, SolrConfigValue>>;
}
export interface SolrQueryResponseWriterConfig extends SolrConfigPlugin {
  contentType?: string;
  charset?: string;
}
export interface SolrInitParamsConfig {
  name: string;
  path?: string | readonly string[];
  defaults?: Readonly<Record<string, SolrConfigValue>>;
  appends?: Readonly<Record<string, SolrConfigValue>>;
  invariants?: Readonly<Record<string, SolrConfigValue>>;
  customOptions?: Readonly<Record<string, SolrConfigValue>>;
}
export interface SolrListenerConfig extends SolrConfigPlugin {
  event: string;
}
export interface SolrOtherComponentConfig extends SolrConfigPlugin {}
export type SolrConfigCommand =
  | { "set-property": Readonly<Record<string, SolrConfigValue>> }
  | { "unset-property": string | readonly string[] }
  | { "set-user-property": Readonly<Record<string, SolrConfigValue>> }
  | { "unset-user-property": string | readonly string[] }
  | { "add-requesthandler": SolrRequestHandlerConfig }
  | { "update-requesthandler": SolrRequestHandlerConfig }
  | { "delete-requesthandler": string }
  | { "add-searchcomponent": SolrSearchComponentConfig }
  | { "update-searchcomponent": SolrSearchComponentConfig }
  | { "delete-searchcomponent": string }
  | { "add-queryresponsewriter": SolrQueryResponseWriterConfig }
  | { "update-queryresponsewriter": SolrQueryResponseWriterConfig }
  | { "delete-queryresponsewriter": string }
  | { "add-initparams": SolrInitParamsConfig }
  | { "update-initparams": SolrInitParamsConfig }
  | { "delete-initparams": string }
  | { "add-queryparser": SolrOtherComponentConfig }
  | { "update-queryparser": SolrOtherComponentConfig }
  | { "delete-queryparser": string }
  | { "add-valuesourceparser": SolrOtherComponentConfig }
  | { "update-valuesourceparser": SolrOtherComponentConfig }
  | { "delete-valuesourceparser": string }
  | { "add-transformer": SolrOtherComponentConfig }
  | { "update-transformer": SolrOtherComponentConfig }
  | { "delete-transformer": string }
  | { "add-updateprocessor": SolrOtherComponentConfig }
  | { "update-updateprocessor": SolrOtherComponentConfig }
  | { "delete-updateprocessor": string }
  | { "add-queryconverter": SolrOtherComponentConfig }
  | { "update-queryconverter": SolrOtherComponentConfig }
  | { "delete-queryconverter": string }
  | { "add-listener": SolrListenerConfig }
  | { "update-listener": SolrListenerConfig }
  | { "delete-listener": string }
  | { "add-expressible": SolrOtherComponentConfig }
  | { "update-expressible": SolrOtherComponentConfig }
  | { "delete-expressible": string };

export type SolrAuth =
  | { type: "basic"; username: string; password?: string }
  | { type: "bearer"; token: string };

export interface SolrRetryPolicy {
  /** Maximum total attempts, including the first request. Default: 1 (no retry). */
  maxAttempts?: number;
  /** Base delay for exponential backoff, in milliseconds. Default: 100. */
  baseDelayMs?: number;
  /** Maximum delay between attempts, in milliseconds. Default: 2000. */
  maxDelayMs?: number;
  /** HTTP statuses that can trigger a retry. */
  retryableStatuses?: readonly number[];
  /** Methods that can be retried. Default: GET only. */
  methods?: readonly SolrHttpMethod[];
  /** Retry network failures when the caller has not aborted the request. Default: true. */
  retryNetworkErrors?: boolean;
}

export interface SolrRequestDefaults {
  /** Query parameters added only when the request does not set the same key. */
  params?: Readonly<Record<string, SolrQueryParamValue>>;
  /** Headers applied before client-level and per-request headers. */
  headers?: Readonly<Record<string, string>>;
}

export interface ValidationSchema {
  safeParseAsync(value: unknown): Promise<
    | { success: true; data: unknown }
    | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } }
  >;
}
export interface ValidationConfig {
  inputs?: Readonly<Record<string, ValidationSchema>>;
  outputs?: Readonly<Record<string, ValidationSchema>>;
  onError?: "throw" | "ignore";
}
export interface SolrClientConfig {
  /** Solr origin or reverse-proxy prefix. Do not include a core or collection name. */
  baseUrl?: string;
  core?: string;
  collection?: string;
  timeoutMs?: number;
  headers?: Readonly<Record<string, string>>;
  /** Preferred typed authentication. Do not combine with username/password. */
  auth?: SolrAuth;
  /** Legacy Basic authentication fields. Prefer auth: { type: "basic", ... }. */
  username?: string;
  password?: string;
  fetch?: typeof fetch;
  retry?: SolrRetryPolicy | false;
  requestDefaults?: SolrRequestDefaults;
  validation?: ValidationConfig;
}

/** Built-in Solr query parsers. Custom parser names remain accepted. */
export type SolrQueryParser = "lucene" | "dismax" | "edismax" | (string & {});

/** Boolean operator used by the Solr query parser. */
export type SolrQueryOperator = "AND" | "OR";

/** Common Solr response writers. Custom writer names remain accepted. */
export type SolrResponseWriter = "json" | "xml" | "csv" | "javabin" | (string & {});

export type SolrQueryParamScalar = string | number | boolean | Date | null;
export type SolrQueryParamValue = SolrQueryParamScalar | readonly SolrQueryParamScalar[];

/** One structured filter query. Raw filter strings remain supported alongside this model. */
export interface SolrFilterQuery {
  /** Filter expression, without a local-params prefix. */
  query: string;
  /** Tags applied to this filter for use by facet/parser excludeTags options. */
  tag?: string | readonly string[];
  /** Whether this filter participates in the filter cache. */
  cache?: boolean;
  /** Evaluation cost hint for non-cached filters. */
  cost?: number;
  /** Additional local parameters for this filter. */
  localParams?: Readonly<Record<string, string | number | boolean>>;
}

export type SolrFilter = string | SolrFilterQuery;

/** Parameters accepted by Solr's standard Lucene query parser. */
export interface SolrLuceneQueryOptions {
  type: "lucene";
  df?: string;
  sow?: boolean;
  uf?: string;
}

/** Parameters accepted by Solr's DisMax query parser. */
export interface SolrDisMaxQueryOptions {
  type: "dismax";
  qf?: string;
  mm?: string;
  tie?: number;
  bq?: string | readonly string[];
  bf?: string | readonly string[];
  pf?: string;
  ps?: number;
  qs?: number;
  "q.alt"?: string;
}

/** Parameters accepted by Solr's Extended DisMax query parser. */
export interface SolrExtendedDisMaxQueryOptions extends Omit<SolrDisMaxQueryOptions, "type"> {
  type: "edismax";
  pf2?: string;
  pf3?: string;
  ps2?: number;
  ps3?: number;
  boost?: string;
  uf?: string;
  sow?: boolean;
  lowercaseOperators?: boolean;
  stopwords?: boolean;
  splitOnWhitespace?: boolean;
  "mm.autoRelax"?: boolean;
}

/** Parser-specific parameters. The type discriminator is not sent to Solr. */
export type SolrQueryParserOptions =
  | SolrLuceneQueryOptions
  | SolrDisMaxQueryOptions
  | SolrExtendedDisMaxQueryOptions;

/** Sort order for classic field facets. */
export type SolrFacetSort = "count" | "index";

/** Classic facet algorithms documented by Solr. */
export type SolrFacetMethod = "enum" | "fc" | "fcs";
export type SolrRangeFacetMethod = "filter" | "dv";

/** Values accepted by classic date/range facet include and other options. */
export type SolrFacetInclude = "lower" | "upper" | "edge" | "outer" | "all";
export type SolrFacetOther = "before" | "after" | "between" | "none" | "all";

/** Per-field overrides for a classic field facet. */
export interface SolrFacetFieldOptions {
  field: string;
  limit?: number;
  offset?: number;
  sort?: SolrFacetSort;
  minCount?: number;
  missing?: boolean;
  prefix?: string;
  method?: SolrFacetMethod;
}

/** Configuration for a classic range facet. */
export interface SolrFacetRangeOptions {
  field: string;
  start: string | number;
  end: string | number;
  gap: string | number;
  hardEnd?: boolean;
  other?: SolrFacetOther | readonly SolrFacetOther[];
  include?: SolrFacetInclude | readonly SolrFacetInclude[];
  method?: SolrRangeFacetMethod;
}

/** Options for Solr's classic Facet Component. */
export interface SolrClassicFacetOptions {
  /** Explicitly enable or disable classic faceting. Defaults to true when supplied. */
  enabled?: boolean;
  /** Fields to facet on, with optional field-specific overrides. */
  fields?: string | readonly (string | SolrFacetFieldOptions)[];
  /** Raw query expressions to count as separate facets. */
  queries?: string | readonly string[];
  /** Numeric or date range facets. */
  ranges?: string | readonly SolrFacetRangeOptions[];
  /** Global field-facet defaults. */
  limit?: number;
  offset?: number;
  sort?: SolrFacetSort;
  minCount?: number;
  missing?: boolean;
  prefix?: string;
  method?: SolrFacetMethod;
  rangeMethod?: SolrRangeFacetMethod;
}

/** Highlighter implementation selected by hl.method. */
export type SolrHighlighterMethod = "unified" | "original" | "fastVector";

/** HTML escaping behavior supported by Solr's highlighters. */
export type SolrHighlightEncoder = "html" | "simple";

/** Per-field overrides for Solr highlighting. */
export interface SolrFieldHighlightOptions {
  method?: SolrHighlighterMethod;
  snippets?: number;
  fragmentSize?: number;
  requireFieldMatch?: boolean;
  alternateField?: string;
  maxAlternateFieldLength?: number;
}

/** Typed options for Solr's Highlighting component. */
export interface SolrHighlightingOptions {
  /** Explicitly enable or disable highlighting. Defaults to true when supplied. */
  enabled?: boolean;
  /** Fields to highlight; accepts one field or a list of stored text fields. */
  fields?: string | readonly string[];
  method?: SolrHighlighterMethod;
  snippets?: number;
  fragmentSize?: number;
  mergeContiguous?: boolean;
  requireFieldMatch?: boolean;
  maxAnalyzedChars?: number;
  alternateField?: string;
  maxAlternateFieldLength?: number;
  /** The Original Highlighter currently supports the simple formatter. */
  formatter?: "simple";
  tagPre?: string;
  tagPost?: string;
  simplePre?: string;
  simplePost?: string;
  encoder?: SolrHighlightEncoder;
  highlightMultiTerm?: boolean;
  usePhraseHighlighter?: boolean;
  payloads?: boolean;
  offsetSource?: "ANALYSIS" | "POSTINGS" | "POSTINGS_WITH_TERM_VECTORS" | "TERM_VECTORS";
  fragAlignRatio?: number;
  /** Field-specific highlighting overrides keyed by Solr field name. */
  perField?: Readonly<Record<string, SolrFieldHighlightOptions>>;
}

/** Result Grouping response format. */
export type SolrGroupFormat = "grouped" | "simple";

/** Typed options for Solr Result Grouping (group=true). */
export interface SolrGroupingOptions {
  enabled?: boolean;
  /** Group by one or more single-valued indexed string fields. */
  fields?: string | readonly string[];
  /** Group by one or more function queries; not supported for distributed searches. */
  functions?: string | readonly string[];
  /** Return one group for each supplied query expression. */
  queries?: string | readonly string[];
  /** Number of documents returned in each group. */
  limit?: number;
  /** Offset into each group's document list. */
  offset?: number;
  /** Sort order for groups, corresponding to the top-level sort parameter. */
  sort?: string;
  /** Sort order for documents within each group. */
  groupSort?: string;
  format?: SolrGroupFormat;
  main?: boolean;
  numGroups?: boolean;
  truncate?: boolean;
  facet?: boolean;
  facetLimit?: number;
  cachePercent?: number;
}

/** Null-value behavior for the Collapsing Query Parser. */
export type SolrCollapseNullPolicy = "ignore" | "expand" | "collapse";
export type SolrCollapseHint = "top_fc" | "block";

/** Typed options for Solr's Collapsing Query Parser. */
export interface SolrCollapseOptions {
  /** Required single-valued string, integer, or float field. */
  field: string;
  /** Select the group head with the minimum value or function. */
  min?: string;
  /** Select the group head with the maximum value or function. */
  max?: string;
  /** Select the group head using a sort expression. */
  sort?: string;
  nullPolicy?: SolrCollapseNullPolicy;
  hint?: SolrCollapseHint;
  size?: number;
  cost?: number;
}

/** Typed options for the Expand component used with collapsed results. */
export interface SolrExpandOptions {
  enabled?: boolean;
  field?: string;
  sort?: string;
  rows?: number;
  query?: string;
  filter?: string | readonly string[];
  nullGroup?: boolean;
}

/** Expanded documents keyed by the collapsed group head document ID. */
export type SolrExpandedResult<TDocument = unknown> = Readonly<Record<string, SolrQueryResult<TDocument>>>;

/** Per-field local options for the Stats Component. */
export interface SolrStatsFieldOptions {
  field: string;
  /** Rename this field's entry in stats_fields. */
  key?: string;
  tag?: string | readonly string[];
  excludeTags?: string | readonly string[];
  min?: boolean;
  max?: boolean;
  sum?: boolean;
  count?: boolean;
  missing?: boolean;
  sumOfSquares?: boolean;
  mean?: boolean;
  stddev?: boolean;
  percentiles?: readonly number[];
  distinctValues?: boolean;
  countDistinct?: boolean;
  /** true uses Solr's default accuracy; a number selects cardinality accuracy (0..1). */
  cardinality?: boolean | number;
  tdigestCompression?: number;
}

/** Typed options for Solr's Stats Component. */
export interface SolrStatsOptions {
  enabled?: boolean;
  /** Fields to compute statistics for, optionally with field-specific statistic selection. */
  fields?: string | readonly (string | SolrStatsFieldOptions)[];
  /** Fields to break statistics down by. */
  facets?: string | readonly string[];
  /** Calculate distinctValues and countDistinct for all requested fields. */
  calcDistinct?: boolean;
}

/** Typed options for Solr's MoreLikeThis search component. */
export interface SolrMoreLikeThisOptions {
  /** Enable the component; defaults to true when options are supplied. */
  enabled?: boolean;
  /** Fields used to generate similar-document queries (mlt.fl). */
  fields?: string | readonly string[];
  /** Similar documents returned for each input document (default 5). */
  count?: number;
  /** Minimum term frequency in the source document (default 2). */
  minTermFrequency?: number;
  /** Minimum document frequency across the index (default 5). */
  minDocumentFrequency?: number;
  maxDocumentFrequency?: number;
  /** Maximum document frequency as an integer percentage from 0 to 100. */
  maxDocumentFrequencyPercent?: number;
  minWordLength?: number;
  maxWordLength?: number;
  /** Maximum query terms generated for each source document. */
  maxQueryTerms?: number;
  /** Maximum tokens parsed per source field without term vectors. */
  maxParsedTokens?: number;
  boost?: boolean;
  /** DisMax-style query fields; each must also be included in fields. */
  queryFields?: string;
  interestingTerms?: "none" | "list" | "details";
}

/** Debug response sections supported by Solr's standard query handler. */
export type SolrDebugComponent = "query" | "timing" | "results" | "track" | "all";

/** Typed options for query parsing, timing, and score explanation diagnostics. */
export interface SolrDebugOptions {
  /** Enable debug output; defaults to true when this object is supplied. */
  enabled?: boolean;
  /** One or more debug sections. Omit to request all available sections. */
  components?: SolrDebugComponent | readonly SolrDebugComponent[];
  /** Return score explanations as structured JSON instead of plain strings. */
  explainStructured?: boolean;
  /** Additional Lucene query whose matching documents should be explained. */
  explainOther?: string;
}

/** One structured score explanation returned when debug.explain.structured=true. */
export interface SolrStructuredExplanation {
  match?: boolean;
  value?: number;
  description?: string;
  details?: readonly SolrStructuredExplanation[];
  [key: string]: unknown;
}

/** A score explanation can be plain text or a structured explanation tree. */
export type SolrExplanation = string | SolrStructuredExplanation;

/** Typed spatial filter options for the geofilt and bbox query parsers. */
export interface SolrSpatialQueryOptions {
  parser: "geofilt" | "bbox";
  /** Indexed spatial field (sfield). */
  field: string;
  /** Center point; latitude,longitude for geodetic fields. */
  point: string;
  /** Search radius in the spatial field's configured distance units. */
  distance: number;
  cache?: boolean;
  cost?: number;
}

/**
 * Options for the standard /select query handler.
 *
 * Use parserOptions for discoverable parser-specific parameters. Put additional
 * Solr parameters in params; arbitrary top-level keys are intentionally rejected.
 */
export interface SolrStandardQueryOptions {
  /** Query expression, serialized as Solr's q parameter. */
  query?: string;
  /** One or more filter queries, serialized as repeated fq parameters. */
  filter?: SolrFilter | readonly SolrFilter[];
  /** Field list, serialized as Solr's fl parameter. */
  fields?: string | readonly string[];
  /** Solr sort expression, for example price desc, id asc. */
  sort?: string;
  /** Maximum number of documents, serialized as Solr's rows parameter. */
  limit?: number;
  /** Result offset, serialized as Solr's start parameter. */
  offset?: number;
  /** Cursor pagination cannot be combined with a non-zero offset. */
  cursorMark?: never;
  /** Query parser name, serialized as defType. */
  defType?: SolrQueryParser;
  /** Parser-specific options, flattened into individual Solr request parameters. */
  parserOptions?: SolrQueryParserOptions;
  /** Typed options for the classic Facet Component. */
  facets?: SolrClassicFacetOptions;
  /** Typed options for the Highlighting component. */
  highlighting?: SolrHighlightingOptions;
  /** Typed options for the Stats component. */
  stats?: SolrStatsOptions;
  /** Typed options for the MoreLikeThis search component. */
  moreLikeThis?: SolrMoreLikeThisOptions;
  /** Typed options for Result Grouping. */
  grouping?: SolrGroupingOptions;
  /** Collapse duplicate results using the Collapsing Query Parser. */
  collapse?: SolrCollapseOptions;
  /** Retrieve additional documents for collapsed groups. */
  expand?: SolrExpandOptions;
  /** Typed geofilt/bbox spatial filter. */
  spatial?: SolrSpatialQueryOptions;
  /** Query parser, timing, and explain diagnostics. */
  debug?: SolrDebugOptions;
  /** Boolean query operator, serialized as q.op. */
  "q.op"?: SolrQueryOperator;
  /** Response writer, serialized as wt. */
  wt?: SolrResponseWriter;
  /** Additional Solr parameters not yet exposed as dedicated options. */
  params?: Readonly<Record<string, SolrQueryParamValue>>;
}

/** JSON Facet API domain transformations for a facet's input document set. */
export interface SolrJsonFacetDomain {
  filter?: string | readonly string[];
  query?: string;
  excludeTags?: string | readonly string[];
  blockParent?: string;
  blockChildren?: string;
  join?: { from: string; to: string };
}

/** A named metric expression inside a JSON Facet API facet tree. */
export type SolrJsonFacetMetric = string | { type: "func"; func: string };

/** Sort expression accepted by a JSON terms facet. */
export type SolrJsonFacetSort = string | Readonly<Record<string, "asc" | "desc">>;

interface SolrJsonFacetBase {
  /** Nested metrics and facets, evaluated for each bucket or query result. */
  facet?: SolrJsonFacetMap;
  /** Optional domain changes applied before evaluating this facet. */
  domain?: SolrJsonFacetDomain;
}

/** JSON terms facet over the distinct values of a field. */
export interface SolrJsonTermsFacet extends SolrJsonFacetBase {
  type: "terms";
  field: string;
  limit?: number;
  offset?: number;
  sort?: SolrJsonFacetSort;
  mincount?: number;
  missing?: boolean;
  prefix?: string;
  method?: "dv" | "uif" | "dvhash" | "enum" | "stream" | "smart";
  allBuckets?: boolean;
  numBuckets?: boolean;
  refine?: boolean;
  overrequest?: number;
  overrefine?: number;
}

/** JSON query facet over an arbitrary Solr query. */
export interface SolrJsonQueryFacet extends SolrJsonFacetBase {
  type: "query";
  q: string;
}

/** JSON range facet over a numeric or date field. */
export interface SolrJsonRangeFacet extends SolrJsonFacetBase {
  type: "range";
  field: string;
  start: string | number;
  end: string | number;
  gap: string | number;
  hardend?: boolean;
  other?: SolrFacetOther | readonly SolrFacetOther[];
  include?: SolrFacetInclude | readonly SolrFacetInclude[];
  mincount?: number;
}

/** Recursive JSON Facet API tree. Values may be named facet definitions or metrics. */
export type SolrJsonFacetDefinition = SolrJsonTermsFacet | SolrJsonQueryFacet | SolrJsonRangeFacet;
export type SolrJsonFacetMap = Readonly<Record<string, SolrJsonFacetDefinition | SolrJsonFacetMetric>>;

/** Typed request body for Solr's JSON Request API. */
export interface SolrJsonQueryRequest {
  query?: string | Readonly<Record<string, unknown>>;
  filter?: string | Readonly<Record<string, unknown>> | readonly (string | Readonly<Record<string, unknown>>)[];
  fields?: string | readonly string[];
  sort?: string | readonly string[];
  limit?: number;
  offset?: number;
  facet?: boolean | SolrJsonFacetMap;
  params?: Readonly<Record<string, SolrQueryParamValue>>;
  debug?: boolean | string | readonly string[];
  useParams?: string | readonly string[];
}

/** Typed response shape for a JSON Request API query. */
export interface SolrJsonQueryResponse<TDocument = unknown, TJsonFacet = unknown> extends SolrResponse<TDocument, TJsonFacet> {}

/** Cursor requests require a sort expression and cannot use a non-zero offset. */
export interface SolrCursorQuery extends Omit<SolrStandardQueryOptions, "sort" | "offset" | "cursorMark"> {
  /** Initial value "*" or the nextCursorMark returned by the previous page. */
  cursorMark: string;
  /** Stable sort expression that includes the collection's uniqueKey field. */
  sort: string;
  /** Solr permits start=0, but no non-zero offset, with cursorMark. */
  offset?: 0;
}

/** Supplying cursorMark switches to the stricter cursor-query shape. */
export type SolrQuery = SolrStandardQueryOptions | SolrCursorQuery;

export type SolrDocument = Readonly<Record<string, unknown>>;
export type SolrDelete = string | { id: string } | { query: string };

/** One add command in a Solr-style JSON update command object. */
export interface SolrJsonAddCommand {
  doc: SolrDocument;
  overwrite?: boolean;
  commitWithin?: number;
}

/** Delete-by-ID, multiple IDs, or delete-by-query in a JSON update command. */
export type SolrJsonDeleteCommand =
  | string
  | readonly string[]
  | { id: string; _version_?: number; query?: never }
  | { query: string; id?: never; _version_?: never };

/**
 * JSON update command object. Use add() for a list of documents; one add
 * command per object avoids JavaScript's inability to preserve duplicate JSON keys.
 */
export interface SolrJsonUpdateCommands {
  add?: SolrJsonAddCommand;
  delete?: SolrJsonDeleteCommand;
  commit?: SolrCommitOptions;
  optimize?: SolrOptimizeOptions;
  rollback?: Readonly<Record<string, never>>;
}

/** Atomic-update modifiers supported by Solr's JSON update syntax. */
export type SolrAtomicUpdateOperation<TValue> =
  | { set: NonNullable<TValue> | null }
  | (NonNullable<TValue> extends readonly (infer TItem)[]
      ? { add: TItem | readonly TItem[] }
        | { "add-distinct": TItem | readonly TItem[] }
        | { remove: TItem | readonly TItem[] }
        | (NonNullable<TItem> extends string ? { removeregex: string | readonly string[] } : never)
      : never)
  | (NonNullable<TValue> extends number ? { inc: number } : never);

/**
 * Field-specific atomic update document. The unique-key field is preserved as
 * a plain value; all other document fields use modifiers. The unique key
 * defaults to "id" when present in TDocument.
 */
export type SolrAtomicUpdateDocument<
  TDocument extends object,
  TUniqueKey extends keyof TDocument = "id" extends keyof TDocument ? "id" : never
> = Pick<TDocument, TUniqueKey>
  & {
    [K in Exclude<keyof TDocument, TUniqueKey | "_root_" | "_version_">]?: SolrAtomicUpdateOperation<TDocument[K]>
  }
  & { _root_?: string; _version_?: number };

/** Request-level options shared by document add and full-document replacement. */
export interface SolrUpdateOptions {
  /** Replace an existing document with the same unique key (default: true). */
  overwrite?: boolean;
  /** Request a commit within this many whole milliseconds; hard/soft behavior follows Solr commitWithin configuration. */
  commitWithin?: number;
  /** Route the update to a SolrCloud shard using the _route_ request parameter. */
  route?: string;
  /** Legacy document boost option retained for source compatibility. */
  boost?: number;
}

/** Delete request options; request controls can be supplied in the same object. */
export interface SolrDeleteOptions extends RequestControlOptions {
  /** Route the delete to a SolrCloud shard using the _route_ request parameter. */
  route?: string;
  /** Request a commit within this many whole milliseconds; hard/soft behavior follows Solr configuration. Solr ignores this for delete-by-query. */
  commitWithin?: number;
}

/** Options for the Update Handler optimize command. */
/** Shared searcher controls for hard and soft commit commands. */
interface SolrCommitSearcherOptions {
  /** Wait for the newly opened searcher to be registered; Solr defaults to true. */
  waitSearcher?: boolean;
  /** Open a new searcher. Defaults to true; sent as the openSearcher request parameter. */
  openSearcher?: boolean;
}

/** Commit options; expungeDeletes is only valid for hard commits. */
export type SolrCommitOptions =
  | (SolrCommitSearcherOptions & { softCommit?: false; expungeDeletes?: boolean })
  | (SolrCommitSearcherOptions & { softCommit: true; expungeDeletes?: never });

/** Options for a soft commit. Expunge and segment-merge options do not apply. */
export interface SolrSoftCommitOptions {
  /** Wait for the newly opened searcher to be registered; defaults to true. */
  waitSearcher?: boolean;
  /** Open a new searcher; defaults to true. */
  openSearcher?: boolean;
}

/** Options for an optimize command. */
export interface SolrOptimizeOptions {
  /** Best-effort maximum number of index segments; omit to use Solr's unlimited default. */
  maxSegments?: number;
  /** Wait until the new searcher is registered; Solr defaults to true. */
  waitSearcher?: boolean;
  /** Open a new searcher; defaults to true. */
  openSearcher?: boolean;
}

/** @deprecated Use SolrUpdateOptions. */
export type UpdateOptions = SolrUpdateOptions;

/**
 * @deprecated Use SolrCommitOptions. maxSegments is optimize-only and is
 * rejected by commit(); use SolrOptimizeOptions for segment merging.
 */
export type CommitOptions = SolrCommitOptions & {
  /** @deprecated maxSegments is valid only for optimize(). */
  maxSegments?: number;
};
export interface SolrResponse<TDocument = unknown, TJsonFacet = unknown> {
  responseHeader?: SolrResponseHeader;
  response?: SolrQueryResult<TDocument>;
  /** Classic Facet API response; present when classic faceting is enabled. */
  facet_counts?: SolrFacetCounts;
  /** JSON Facet API response; the caller can provide its expected facet shape. */
  facets?: TJsonFacet;
  /** Highlight snippets keyed by document ID and field. */
  highlighting?: SolrHighlighting;
  /** Grouped query results keyed by group field or function. */
  grouped?: Readonly<Record<string, SolrGroupedResult<TDocument>>>;
  /** Additional documents returned by the Expand component. */
  expanded?: SolrExpandedResult<TDocument>;
  /** Stats Component response. */
  stats?: SolrStats;
  /** Alternating source document IDs and similar-document result objects. */
  moreLikeThis?: SolrMoreLikeThisResponse<TDocument>;
  /** Query parser and execution diagnostics, when debug is enabled. */
  debug?: SolrDebugInfo;
  /** Opaque cursor to pass as cursorMark on the next page. */
  nextCursorMark?: string;
  /** Other optional Solr response sections remain accessible. */
  [key: string]: unknown;
}
/** Core result metadata returned by a Solr /select query. */
export interface SolrQueryResult<TDocument = unknown> {
  /** Number of matching documents before pagination. */
  numFound?: number;
  /** Zero-based offset of the first returned document. */
  start?: number;
  /** Highest score among the returned documents, when scoring is enabled. */
  maxScore?: number;
  /** Whether numFound is exact rather than an estimate. */
  numFoundExact?: boolean;
  /** Documents in this page. */
  docs?: TDocument[];
}

/** MoreLikeThis Search Component response keyed by source document unique key. */
export type SolrMoreLikeThisResponse<TDocument = unknown> = Readonly<Record<string, SolrQueryResult<TDocument>>>;

/** Standard response header shared by Solr JSON responses. */
export interface SolrResponseHeader {
  status?: number;
  QTime?: number;
  partialResults?: boolean;
  [key: string]: unknown;
}

/** One classic numeric or date range-facet response. */
export interface SolrFacetRangeResult {
  counts?: readonly (string | number)[];
  start?: string | number;
  end?: string | number;
  gap?: string | number;
  before?: number;
  after?: number;
  between?: number;
  [key: string]: unknown;
}

/** Classic Facet API response sections. */
export interface SolrFacetCounts {
  facet_queries?: Readonly<Record<string, number>>;
  /** Alternating term and count values, as returned by Solr's JSON response. */
  facet_fields?: Readonly<Record<string, readonly (string | number)[]>>;
  /** Date ranges use facet_ranges; the legacy facet_dates section is not supported. */
  facet_ranges?: Readonly<Record<string, SolrFacetRangeResult>>;
  facet_intervals?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Highlight snippets keyed by document unique key, then field name. */
export type SolrHighlighting = Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;

/** A grouped result list for one group field or function. */
export interface SolrGroupedResult<TDocument = unknown> {
  matches?: number;
  ngroups?: number;
  totalGroupCount?: number;
  groups?: readonly {
    groupValue?: string | number | null;
    matches?: number;
    doclist?: SolrQueryResult<TDocument>;
  }[];
  doclist?: SolrQueryResult<TDocument>;
}

/** Common statistics returned for one field by the Stats Component. */
export interface SolrFieldStats {
  min?: number | string | null;
  max?: number | string | null;
  sum?: number;
  count?: number;
  missing?: number;
  mean?: number;
  stddev?: number;
  sumOfSquares?: number;
  distinctValues?: readonly unknown[];
  countDistinct?: number;
  cardinality?: number;
  percentiles?: Readonly<Record<string, number>>;
  facets?: Readonly<Record<string, Readonly<Record<string, SolrFieldStats>>>>;
  [key: string]: unknown;
}

/** Stats Component response. */
export interface SolrStats {
  stats_fields?: Readonly<Record<string, SolrFieldStats>>;
  [key: string]: unknown;
}

/** Common debug information returned when debug is enabled. */
export interface SolrDebugInfo {
  rawquerystring?: string;
  querystring?: string;
  parsedquery?: string;
  parsedquery_toString?: string;
  explain?: Readonly<Record<string, SolrExplanation>>;
  explainOther?: Readonly<Record<string, SolrExplanation>>;
  timing?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Typed response for the standard Solr query handler. */
export interface SolrQueryResponse<TDocument = unknown, TJsonFacet = unknown> extends SolrResponse<TDocument, TJsonFacet> {
  response?: SolrQueryResult<TDocument>;
}

export interface RequestControlOptions {
  /** Cancel this request. The caller signal and timeout are combined. */
  signal?: AbortSignal;
  /** Override the client timeout for this request, in milliseconds. */
  timeoutMs?: number;
  /** Headers that apply to this request only. */
  headers?: Readonly<Record<string, string>>;
}

export interface RequestOptions extends RequestControlOptions {
  method?: SolrHttpMethod;
  query?: URLSearchParams | Record<string, SolrQueryParamValue>;
  body?: unknown;
  operation?: string;
}
