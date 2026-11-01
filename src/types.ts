export type SolrVersion = "8" | "9" | "10";
export type SolrHttpMethod = "GET" | "POST" | "PUT" | "DELETE";
export type CoreAdminAction = "STATUS" | "CREATE" | "RELOAD" | "UNLOAD" | "RENAME" | "SWAP" | "MERGEINDEXES" | "SPLIT";
export type CollectionAdminAction = "LIST" | "CREATE" | "DELETE" | "RELOAD" | "MODIFYCOLLECTION" | "CREATEALIAS" | "DELETEALIAS" | "LISTALIASES" | "CLUSTERSTATUS" | "ADDREPLICA" | "DELETEREPLICA" | "MOVEREPLICA" | "BALANCESHARDUNIQUE" | "REBALANCELEADERS" | "ADDREPLICAPROP" | "DELETEREPLICAPROP" | "CREATESHARD" | "DELETESHARD" | "SPLITSHARD" | "ADDROLE" | "REMOVEROLE";
export type SolrAdminParams = Readonly<Record<string, string | number | boolean>>;

/** Replica types accepted by the SolrCloud Collections API. */
export type CollectionReplicaType = "nrt" | "tlog" | "pull";

/** Parameters for Collections API ADDREPLICA. */
export interface AddReplicaParams {
  /** Additional Collections API parameters not modelled here. */
  customParams?: SolrAdminParams;
  /** Target collection. */
  collection: string;
  /** Target shard; omit when the collection has a single shard. */
  shard?: string;
  /** Optional explicit replica name. */
  name?: string;
  /** Replica type; defaults to the collection's configured replica type. */
  type?: CollectionReplicaType;
  /** Node name on which to place the replica. */
  node?: string;
  /** Comma-separated candidate node names for placement. */
  createNodeSet?: string;
  /** Wait until the replica reaches an active state before returning. */
  waitForFinalState?: boolean;
  /** Async request identifier. */
  async?: string;
}

/** Parameters for Collections API DELETEREPLICA. */
export interface DeleteReplicaParams {
  /** Additional Collections API parameters not modelled here. */
  customParams?: SolrAdminParams;
  /** Target collection. */
  collection: string;
  /** Target shard. */
  shard: string;
  /** Replica name to remove. */
  replica: string;
  /** Delete the replica's instance directory from its node. */
  deleteInstanceDir?: boolean;
  /** Delete the replica's data directory from its node. */
  deleteDataDir?: boolean;
  /** Delete the replica's index directory from its node. */
  deleteIndex?: boolean;
  /** Async request identifier. */
  async?: string;
}

/** Parameters for Collections API MOVEREPLICA. */
export interface MoveReplicaBaseParams {
  collection: string;
  targetNode: string;
  timeout?: number;
  inPlaceMove?: boolean;
  async?: string;
}

/** A move identifies either one replica or a source node and shard. */
export type MoveReplicaParams = MoveReplicaBaseParams & (
  | { replica: string; sourceNode?: never; shard?: never }
  | { replica?: never; sourceNode: string; shard: string }
);

/** Parameters for Collections API BALANCESHARDUNIQUE. */
export interface BalanceShardUniqueParams {
  collection: string;
  property: string;
  onlyactivenodes?: boolean;
  shardUnique?: boolean;
}

/** Parameters for Collections API REBALANCELEADERS. */
export interface RebalanceLeadersParams {
  collection: string;
  maxAtOnce?: number;
  maxWaitSeconds?: number;
  async?: string;
}

/** Parameters for Collections API ADDREPLICAPROP. */
export interface AddReplicaPropertyParams {
  collection: string;
  shard: string;
  replica: string;
  property: string;
  "property.value": string;
  shardUnique?: boolean;
}

/** Parameters for Collections API DELETEREPLICAPROP. */
export interface DeleteReplicaPropertyParams {
  collection: string;
  shard: string;
  replica: string;
  property: string;
}

/** Action-specific parameter models for replica lifecycle and property operations. */
export type CollectionAdminParams<A extends CollectionAdminAction> =
  A extends "ADDREPLICA" ? AddReplicaParams :
  A extends "DELETEREPLICA" ? DeleteReplicaParams :
  A extends "MOVEREPLICA" ? MoveReplicaParams :
  A extends "BALANCESHARDUNIQUE" ? BalanceShardUniqueParams :
  A extends "REBALANCELEADERS" ? RebalanceLeadersParams :
  A extends "ADDREPLICAPROP" ? AddReplicaPropertyParams :
  A extends "DELETEREPLICAPROP" ? DeleteReplicaPropertyParams :
  SolrAdminParams;

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
  params?: Readonly<Record<string, string | number | boolean | readonly (string | number)[]>>;
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

export type SolrQueryParamValue = string | number | boolean | readonly (string | number)[];

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
  /** Boolean query operator, serialized as q.op. */
  "q.op"?: SolrQueryOperator;
  /** Response writer, serialized as wt. */
  wt?: SolrResponseWriter;
  /** Additional Solr parameters not yet exposed as dedicated options. */
  params?: Readonly<Record<string, SolrQueryParamValue>>;
}

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
export interface UpdateOptions { overwrite?: boolean; commitWithin?: number; boost?: number; }
export interface CommitOptions { waitSearcher?: boolean; softCommit?: boolean; expungeDeletes?: boolean; maxSegments?: number; }
export interface SolrResponse<T = unknown> {
  responseHeader?: { status?: number; QTime?: number; partialResults?: boolean };
  response?: { numFound?: number; start?: number; docs?: T[] };
  /** Opaque cursor to pass as cursorMark on the next page. */
  nextCursorMark?: string;
  [key: string]: unknown;
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
  query?: URLSearchParams | Record<string, string | number | boolean | readonly (string | number)[]>;
  body?: unknown;
  operation?: string;
}
