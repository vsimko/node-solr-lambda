import { Buffer } from "node:buffer";
import { SolrHttpError, SolrValidationError } from "./errors.js";
import type { RequestOptions, SolrAuth, SolrClientConfig, SolrHttpMethod, SolrRequestDefaults, SolrRetryPolicy, ValidationSchema } from "./types.js";

const DEFAULT_BASE_URL = "http://localhost:8983/";
const DEFAULT_RETRY_STATUSES = [408, 429, 500, 502, 503, 504] as const;

function appendSearchParams(target: URLSearchParams, query: RequestOptions["query"]): void {
  if (!query) return;
  const entries = query instanceof URLSearchParams
    ? query.entries()
    : Object.entries(query).flatMap(([key, value]) =>
        (Array.isArray(value) ? value : [value]).map(item => [key, String(item)] as [string, string])
      );
  for (const [key, value] of entries) target.append(key, value);
}

function hasQueryKey(query: RequestOptions["query"], key: string): boolean {
  if (!query) return false;
  return query instanceof URLSearchParams
    ? query.has(key)
    : Object.prototype.hasOwnProperty.call(query, key);
}

function withDefaultParams(
  defaults: SolrRequestDefaults["params"],
  query: RequestOptions["query"]
): RequestOptions["query"] {
  if (!defaults || Object.keys(defaults).length === 0) return query;
  const merged = new URLSearchParams();
  for (const [key, value] of Object.entries(defaults)) {
    if (!hasQueryKey(query, key)) {
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) merged.append(key, String(item));
    }
  }
  appendSearchParams(merged, query);
  return merged;
}

function resolveUrl(path: string, baseUrl: string): URL {
  if (/^https?:\/\//i.test(path)) return new URL(path);
  const url = new URL(baseUrl);
  const baseSegments = url.pathname.split("/").filter(Boolean);
  const pathSegments = path.split("/").filter(Boolean);
  if (baseSegments[baseSegments.length - 1] === "solr" && pathSegments[0] === "solr") {
    pathSegments.shift();
  }
  url.pathname = `/${[...baseSegments, ...pathSegments].join("/")}`;
  return url;
}

function wait(milliseconds: number): Promise<void> {
  return milliseconds <= 0 ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, milliseconds));
}

/** Shared HTTP transport. Domain APIs use this class for all Solr requests. */
export class SolrTransport {
  readonly clientConfig: Readonly<SolrClientConfig>;
  private readonly requestFetch: typeof fetch;

  constructor(config: SolrClientConfig = {}) {
    this.validateConfig(config);
    this.clientConfig = Object.freeze({ ...config });
    this.requestFetch = config.fetch ?? globalThis.fetch;
    if (!this.requestFetch) throw new Error("Node.js 20 or later with global fetch is required");
  }

  private validateConfig(config: SolrClientConfig): void {
    const baseUrl = new URL(config.baseUrl ?? DEFAULT_BASE_URL);
    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      throw new TypeError("Solr baseUrl must use HTTP or HTTPS");
    }
    if (baseUrl.search || baseUrl.hash) {
      throw new TypeError("Solr baseUrl must not include a query string or fragment");
    }
    if (baseUrl.username || baseUrl.password) {
      throw new TypeError("Solr baseUrl must not include embedded credentials");
    }
    if (config.timeoutMs !== undefined && (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0)) {
      throw new RangeError("timeoutMs must be a positive number");
    }
    if (config.auth && (config.username !== undefined || config.password !== undefined)) {
      throw new TypeError("Use either auth or username/password, not both");
    }
    if (config.auth?.type === "basic" && !config.auth.username.trim()) {
      throw new TypeError("Basic authentication requires a non-empty username");
    }
    if (config.auth?.type === "bearer" && !config.auth.token.trim()) {
      throw new TypeError("Bearer authentication requires a non-empty token");
    }
    if (config.password !== undefined && config.username === undefined) {
      throw new TypeError("A password requires a username");
    }
    const retry = config.retry;
    if (retry !== undefined && retry !== false) {
      if (retry.maxAttempts !== undefined && (!Number.isInteger(retry.maxAttempts) || retry.maxAttempts < 1)) {
        throw new RangeError("retry.maxAttempts must be a positive integer");
      }
      if (retry.baseDelayMs !== undefined && (!Number.isFinite(retry.baseDelayMs) || retry.baseDelayMs < 0)) {
        throw new RangeError("retry.baseDelayMs must be zero or greater");
      }
      if (retry.maxDelayMs !== undefined && (!Number.isFinite(retry.maxDelayMs) || retry.maxDelayMs < 0)) {
        throw new RangeError("retry.maxDelayMs must be zero or greater");
      }
      if (retry.baseDelayMs !== undefined && retry.maxDelayMs !== undefined && retry.maxDelayMs < retry.baseDelayMs) {
        throw new RangeError("retry.maxDelayMs must be greater than or equal to retry.baseDelayMs");
      }
      if (retry.retryableStatuses?.some(status => !Number.isInteger(status) || status < 100 || status > 599)) {
        throw new RangeError("retryableStatuses must contain HTTP status codes");
      }
    }
  }

  private async validate(operation: string, direction: "inputs" | "outputs", value: unknown): Promise<unknown> {
    const schema: ValidationSchema | undefined = this.clientConfig.validation?.[direction]?.[operation];
    if (!schema) return value;
    const result = await schema.safeParseAsync(value);
    if (result.success) return result.data;
    if (this.clientConfig.validation?.onError === "ignore") return value;
    throw new SolrValidationError(operation, result.error.issues);
  }

  private authorizationHeader(): string | undefined {
    const auth: SolrAuth | undefined = this.clientConfig.auth;
    if (auth?.type === "bearer") return `Bearer ${auth.token}`;
    if (auth?.type === "basic") {
      return `Basic ${Buffer.from(`${auth.username}:${auth.password ?? ""}`).toString("base64")}`;
    }
    if (this.clientConfig.username !== undefined) {
      return `Basic ${Buffer.from(`${this.clientConfig.username}:${this.clientConfig.password ?? ""}`).toString("base64")}`;
    }
    return undefined;
  }

  private async fetchWithRetry(
    url: URL,
    method: SolrHttpMethod,
    headers: Record<string, string>,
    body: string | undefined,
    callerSignal?: AbortSignal
  ): Promise<Response> {
    const policy: SolrRetryPolicy = this.clientConfig.retry === false ? {} : (this.clientConfig.retry ?? {});
    const maxAttempts = policy.maxAttempts ?? 1;
    const retryMethods = policy.methods ?? ["GET"];
    const retryStatuses = policy.retryableStatuses ?? DEFAULT_RETRY_STATUSES;
    const retryNetworkErrors = policy.retryNetworkErrors ?? true;
    const baseDelayMs = policy.baseDelayMs ?? 100;
    const maxDelayMs = policy.maxDelayMs ?? 2_000;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const signal = callerSignal ?? AbortSignal.timeout(this.clientConfig.timeoutMs ?? 30_000);
      try {
        const response = await this.requestFetch(url, {
          method,
          headers,
          ...(body === undefined ? {} : { body }),
          signal
        });
        if (attempt < maxAttempts && retryMethods.includes(method) && retryStatuses.includes(response.status)) {
          try { await response.body?.cancel(); } catch {}
          const delay = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
          await wait(delay);
          continue;
        }
        return response;
      } catch (error) {
        if (callerSignal?.aborted || attempt >= maxAttempts || !retryMethods.includes(method) || !retryNetworkErrors) {
          throw error;
        }
        const delay = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
        await wait(delay);
      }
    }
    throw new Error("Solr request retry loop ended unexpectedly");
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const operation = options.operation ?? method;
    const query = withDefaultParams(this.clientConfig.requestDefaults?.params, options.query);
    const input = this.clientConfig.validation
      ? await this.validate(operation, "inputs", options.body ?? query)
      : (options.body ?? query);
    const url = resolveUrl(path, this.clientConfig.baseUrl ?? DEFAULT_BASE_URL);
    appendSearchParams(url.searchParams, options.body === undefined ? input as RequestOptions["query"] : query);
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...this.clientConfig.requestDefaults?.headers,
      ...(this.authorizationHeader() ? { authorization: this.authorizationHeader() as string } : {}),
      ...this.clientConfig.headers,
      ...options.headers
    };
    const response = await this.fetchWithRetry(
      url, method, headers, options.body === undefined ? undefined : JSON.stringify(input), options.signal
    );
    const text = await response.text();
    let payload: unknown;
    if (text) {
      try { payload = JSON.parse(text) as unknown; }
      catch { payload = text; }
    }
    if (!response.ok) throw new SolrHttpError(response.status, response.statusText, payload);
    return (this.clientConfig.validation ? await this.validate(operation, "outputs", payload) : payload) as T;
  }

  protected endpoint(path: string): string {
    const target = this.clientConfig.core ?? this.clientConfig.collection;
    if (!target) throw new Error("Set 'core' or 'collection' in the Solr client configuration");
    return `/solr/${encodeURIComponent(target)}${path}`;
  }

  async requestRaw(path: string, options: RequestOptions = {}): Promise<Response> {
    const method = options.method ?? "GET";
    const operation = options.operation ?? method;
    const query = withDefaultParams(this.clientConfig.requestDefaults?.params, options.query);
    const input = this.clientConfig.validation
      ? await this.validate(operation, "inputs", options.body ?? query)
      : (options.body ?? query);
    const url = resolveUrl(path, this.clientConfig.baseUrl ?? DEFAULT_BASE_URL);
    appendSearchParams(url.searchParams, options.body === undefined ? input as RequestOptions["query"] : query);
    const headers: Record<string, string> = {
      accept: "*/*",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(this.authorizationHeader() ? { authorization: this.authorizationHeader() as string } : {}),
      ...this.clientConfig.requestDefaults?.headers,
      ...this.clientConfig.headers,
      ...options.headers
    };
    const response = await this.fetchWithRetry(
      url, method, headers, options.body === undefined ? undefined : JSON.stringify(input), options.signal
    );
    if (!response.ok) {
      const text = await response.text();
      let payload: unknown = text;
      try { payload = text ? JSON.parse(text) as unknown : undefined; } catch {}
      throw new SolrHttpError(response.status, response.statusText, payload);
    }
    return response;
  }
}
