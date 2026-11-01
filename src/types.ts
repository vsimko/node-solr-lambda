export type SolrVersion = "8" | "9" | "10";
export type CoreAdminAction = "STATUS" | "CREATE" | "RELOAD" | "UNLOAD" | "RENAME" | "SWAP" | "MERGEINDEXES" | "SPLIT";
export type CollectionAdminAction = "LIST" | "CREATE" | "DELETE" | "RELOAD" | "MODIFYCOLLECTION" | "CREATEALIAS" | "DELETEALIAS" | "LISTALIASES" | "CLUSTERSTATUS" | "ADDREPLICA" | "DELETEREPLICA" | "CREATESHARD" | "DELETESHARD" | "SPLITSHARD" | "ADDROLE" | "REMOVEROLE";
export type SolrAdminParams = Readonly<Record<string,string|number|boolean>>;
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
  baseUrl?: string; core?: string; collection?: string; timeoutMs?: number;
  headers?: Readonly<Record<string,string>>; username?: string; password?: string;
  fetch?: typeof fetch; validation?: ValidationConfig;
}
export interface SolrQuery {
  query?: string; filter?: string | readonly string[]; fields?: string | readonly string[];
  sort?: string; limit?: number; offset?: number;
  params?: Readonly<Record<string,string | number | boolean | readonly (string | number)[]>>;
  [key:string]: unknown;
}
export type SolrDocument = Readonly<Record<string,unknown>>;
export type SolrDelete = string | {id:string} | {query:string};
export interface SolrResponse<T=unknown> {
  responseHeader?: {status?:number;QTime?:number};
  response?: {numFound?:number;start?:number;docs?:T[]};
  [key:string]:unknown;
}
export interface RequestOptions {
  method?:"GET"|"POST"|"PUT"|"DELETE";
  query?:URLSearchParams|Record<string,string|number|boolean|readonly (string|number)[]>;
  body?:unknown; headers?:Readonly<Record<string,string>>; signal?:AbortSignal; operation?:string;
}
