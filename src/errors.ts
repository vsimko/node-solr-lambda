import type { SolrErrorDetail, SolrErrorResponse, SolrResponse } from "./types.js";

function readSolrErrorResponse(payload: unknown): SolrErrorResponse | undefined {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" || (error && typeof error === "object")) {
    return payload as SolrErrorResponse;
  }
  return undefined;
}

function readSolrError(payload: unknown): SolrErrorDetail | undefined {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return { msg: error };
  if (error && typeof error === "object") return error as SolrErrorDetail;
  return undefined;
}

export class SolrHttpError extends Error {
  readonly solrError: SolrErrorDetail | undefined;
  readonly errorResponse: SolrErrorResponse | undefined;

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
    this.errorResponse = readSolrErrorResponse(payload);
  }
}

export class SolrNetworkError extends Error {
  constructor(readonly endpoint: string, cause: unknown) {
    super(`Solr request failed before a response was received from ${endpoint}`, { cause });
    this.name = "SolrNetworkError";
  }
}

export class SolrTimeoutError extends Error {
  constructor(readonly endpoint: string, readonly timeoutMs: number, cause?: unknown) {
    super(`Solr request to ${endpoint} timed out after ${timeoutMs} ms`, cause === undefined ? undefined : { cause });
    this.name = "SolrTimeoutError";
  }
}

export class SolrAbortError extends Error {
  constructor(readonly endpoint: string, readonly reason: unknown, cause?: unknown) {
    super(`Solr request to ${endpoint} was aborted`, cause === undefined ? { cause: reason } : { cause });
    this.name = "SolrAbortError";
  }
}

export class SolrValidationError extends Error {
  constructor(
    readonly operation: string,
    readonly issues: readonly { path: readonly PropertyKey[]; message: string }[],
    cause?: unknown
  ) {
    const detail = cause instanceof Error ? `: ${cause.message}` : "";
    super(`Solr validation failed for ${operation}${detail}`, cause === undefined ? undefined : { cause });
    this.name = "SolrValidationError";
  }
}

export type { SolrResponse };
export type { SolrErrorDetail as SolrErrorMetadata };
