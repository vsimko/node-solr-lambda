import type { SolrResponse } from "./types.js";
export class SolrHttpError extends Error {
  constructor(readonly status:number, readonly statusText:string, readonly payload:unknown) {
    const message=(payload as {error?:{msg?:string}}|null)?.error?.msg;
    super(message ?? `Solr request failed: ${status} ${statusText}`);
    this.name="SolrHttpError";
  }
}
export class SolrValidationError extends Error {
  constructor(readonly operation:string, readonly issues:readonly {path:readonly PropertyKey[];message:string}[]) {
    super(`Solr validation failed for ${operation}`);
    this.name="SolrValidationError";
  }
}
export type { SolrResponse };
