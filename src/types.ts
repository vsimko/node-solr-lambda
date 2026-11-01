export type SolrVersion = "8" | "9" | "10";
export type SolrHttpMethod = "GET" | "POST" | "PUT" | "DELETE";
export type CoreAdminAction = "STATUS" | "CREATE" | "RELOAD" | "UNLOAD" | "RENAME" | "SWAP" | "MERGEINDEXES" | "SPLIT";
export type CollectionAdminAction = "LIST" | "CREATE" | "DELETE" | "RELOAD" | "MODIFYCOLLECTION" | "CREATEALIAS" | "DELETEALIAS" | "LISTALIASES" | "CLUSTERSTATUS" | "ADDREPLICA" | "DELETEREPLICA" | "CREATESHARD" | "DELETESHARD" | "SPLITSHARD" | "ADDROLE" | "REMOVEROLE";
export type SolrAdminParams = Readonly<Record<string, string | number | boolean>>;

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
export interface SolrQuery {
  query?: string; filter?: string | readonly string[]; fields?: string | readonly string[];
  sort?: string; limit?: number; offset?: number;
  params?: Readonly<Record<string, string | number | boolean | readonly (string | number)[]>>;
  [key: string]: unknown;
}
export type SolrDocument = Readonly<Record<string, unknown>>;
export type SolrDelete = string | { id: string } | { query: string };
export interface UpdateOptions { overwrite?: boolean; commitWithin?: number; boost?: number; }
export interface CommitOptions { waitSearcher?: boolean; softCommit?: boolean; expungeDeletes?: boolean; maxSegments?: number; }
export interface SolrResponse<T = unknown> {
  responseHeader?: { status?: number; QTime?: number };
  response?: { numFound?: number; start?: number; docs?: T[] };
  [key: string]: unknown;
}
export interface RequestOptions {
  method?: SolrHttpMethod;
  query?: URLSearchParams | Record<string, string | number | boolean | readonly (string | number)[]>;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
  operation?: string;
}
