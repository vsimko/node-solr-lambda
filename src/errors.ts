import type { SolrResponse } from "./types.js";

export interface SolrErrorDetail {
  code?: number;
  msg?: string;
  metadata?: unknown;
  [key: string]: unknown;
}

function readSolrError(payload: unknown): SolrErrorDetail | undefined {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return { msg: error };
  if (error && typeof error === "object") return error as SolrErrorDetail;
  return undefined;
}

export class SolrHttpError extends Error {
  readonly solrError?: SolrErrorDetail;

  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly endpoint: string,
    readonly body: string,
    readonly payload: unknown,
    options?: ErrorOptions
  ) {
    const solrError = readSolrError(payload);
    super(solrError?.msg ?? `Solr request failed: ${status} ${statusText}`, options);
    this.name = "SolrHttpError";
    this.solrError = solrError;
  }
}

export class SolrNetworkError extends Error {
  constructor(readonly endpoint: string, cause: unknown) {
    super(`Solr request failed before a response was received from ${endpoint}`, { cause });
    this.name = "SolrNetworkError";
  }
}

export class SolrValidationError extends Error {
  constructor(readonly operation: string, readonly issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
    super(`Solr validation failed for ${operation}`);
    this.name = "SolrValidationError";
  }
}

export type { SolrResponse };
export type { SolrErrorDetail as SolrErrorMetadata };
