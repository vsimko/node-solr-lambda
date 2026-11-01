import { Buffer } from "node:buffer";
import { SolrHttpError, SolrValidationError } from "./errors.js";
import type { RequestOptions, SolrClientConfig, ValidationSchema } from "./types.js";

const DEFAULT_BASE_URL = "http://localhost:8983/";

function appendQuery(url: URL, query: RequestOptions["query"]): void {
  if (!query) return;
  const entries = query instanceof URLSearchParams
    ? query.entries()
    : Object.entries(query).flatMap(([key, value]) =>
        (Array.isArray(value) ? value : [value]).map(item => [key, String(item)] as [string, string])
      );
  for (const [key, value] of entries) url.searchParams.append(key, value);
}

/** Shared HTTP transport. Domain APIs use this class for all Solr requests. */
export class SolrTransport {
  readonly clientConfig: Readonly<SolrClientConfig>;
  private readonly requestFetch: typeof fetch;

  constructor(config: SolrClientConfig = {}) {
    this.clientConfig = Object.freeze({ ...config });
    this.requestFetch = config.fetch ?? globalThis.fetch;
    if (!this.requestFetch) throw new Error("Node.js 20 or later with global fetch is required");
  }

  private async validate(operation: string, direction: "inputs" | "outputs", value: unknown): Promise<unknown> {
    const schema: ValidationSchema | undefined = this.clientConfig.validation?.[direction]?.[operation];
    if (!schema) return value;
    const result = await schema.safeParseAsync(value);
    if (result.success) return result.data;
    if (this.clientConfig.validation?.onError === "ignore") return value;
    throw new SolrValidationError(operation, result.error.issues);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const operation = options.operation ?? method;
    const input = this.clientConfig.validation
      ? await this.validate(operation, "inputs", options.body ?? options.query)
      : (options.body ?? options.query);
    const url = new URL(path.replace(/^\//, ""), this.clientConfig.baseUrl ?? DEFAULT_BASE_URL);
    appendQuery(url, options.body === undefined ? input as RequestOptions["query"] : options.query);
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(this.clientConfig.username !== undefined
        ? { authorization: `Basic ${Buffer.from(`${this.clientConfig.username}:${this.clientConfig.password ?? ""}`).toString("base64")}` }
        : {}),
      ...this.clientConfig.headers,
      ...options.headers
    };
    const response = await this.requestFetch(url, {
      method,
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(input) }),
      signal: options.signal ?? AbortSignal.timeout(this.clientConfig.timeoutMs ?? 30_000)
    });
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
    const input = this.clientConfig.validation
      ? await this.validate(operation, "inputs", options.body ?? options.query)
      : (options.body ?? options.query);
    const url = new URL(path.startsWith("/") ? path.slice(1) : path, this.clientConfig.baseUrl ?? DEFAULT_BASE_URL);
    appendQuery(url, options.body === undefined ? input as RequestOptions["query"] : options.query);
    const headers: Record<string, string> = {
      accept: "*/*",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(this.clientConfig.username !== undefined
        ? { authorization: `Basic ${Buffer.from(`${this.clientConfig.username}:${this.clientConfig.password ?? ""}`).toString("base64")}` }
        : {}),
      ...this.clientConfig.headers,
      ...options.headers
    };
    const response = await this.requestFetch(url, {
      method,
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(input) }),
      signal: options.signal ?? AbortSignal.timeout(this.clientConfig.timeoutMs ?? 30_000)
    });
    if (!response.ok) {
      const text = await response.text();
      let payload: unknown = text;
      try { payload = text ? JSON.parse(text) as unknown : undefined; } catch {}
      throw new SolrHttpError(response.status, response.statusText, payload);
    }
    return response;
  }
}
