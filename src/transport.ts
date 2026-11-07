import { Buffer } from "node:buffer";
import { SolrAbortError, SolrHttpError, SolrNetworkError, SolrTimeoutError, SolrValidationError } from "./errors.js";
import type {
  RequestOptions, SolrAuth, SolrClientConfig, SolrHttpMethod, SolrRequestDefaults,
  SolrRetryPolicy, ValidationSchema
} from "./types.js";

const DEFAULT_BASE_URL = "http://localhost:8983/";
const DEFAULT_RETRY_STATUSES = [408, 429, 500, 502, 503, 504] as const;

interface RequestSignalContext {
  signal: AbortSignal;
  cleanup(): void;
  classify(cause?: unknown): SolrAbortError | SolrTimeoutError | undefined;
}

function serializeQueryParam(value: string | number | boolean | Date | null): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function appendSearchParams(target: URLSearchParams, query: RequestOptions["query"]): void {
  if (!query) return;
  const entries = query instanceof URLSearchParams
    ? query.entries()
    : Object.entries(query).flatMap(([key, value]) =>
        (Array.isArray(value) ? value : [value]).map(item => [key, serializeQueryParam(item)] as [string, string])
      );
  for (const [key, value] of entries) target.append(key, value);
}

function withDefaultParams(
  defaults: SolrRequestDefaults["params"],
  query: RequestOptions["query"]
): RequestOptions["query"] {
  if (!defaults || Object.keys(defaults).length === 0) return query;
  if (query instanceof URLSearchParams) {
    const merged = new URLSearchParams();
    for (const [key, value] of Object.entries(defaults)) {
      if (!query.has(key)) {
        const values = Array.isArray(value) ? value : [value];
        for (const item of values) merged.append(key, serializeQueryParam(item));
      }
    }
    appendSearchParams(merged, query);
    return merged;
  }
  return { ...defaults, ...query };
}

function resolveUrl(path: string, baseUrl: string): URL {
  const base = new URL(baseUrl);
  if (/^https?:\/\//i.test(path)) {
    const target = new URL(path);
    if (target.origin !== base.origin) {
      throw new TypeError("Solr request URL must use the configured Solr origin");
    }
    if (target.username || target.password || target.hash) {
      throw new TypeError("Solr request URL must not include credentials or a fragment");
    }
    return target;
  }
  const url = base;
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

function endpointFor(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

function parseBody(text: string, codec?: SolrClientConfig["jsonCodec"]): unknown {
  if (!text) return undefined;
  try { return codec ? codec.parse(text) : JSON.parse(text) as unknown; }
  catch { return text; }
}

function stringifyBody(value: unknown, codec?: SolrClientConfig["jsonCodec"]): string | undefined {
  return codec ? codec.stringify(value) : JSON.stringify(value);
}

function isReadableStreamBody(value: unknown): value is ReadableStream<Uint8Array> {
  return typeof ReadableStream !== "undefined" &&
    value !== null &&
    typeof value === "object" &&
    typeof (value as { getReader?: unknown }).getReader === "function";
}

const STREAMING_JSON_ARRAY_BODY = Symbol("streaming-json-array-body");

interface StreamingJsonArrayBody {
  readonly [STREAMING_JSON_ARRAY_BODY]: true;
  readonly documents: AsyncIterable<unknown>;
  readonly operation: string;
}

/** @internal Create a transport-owned streamed JSON-array body for an AsyncIterable. */
export function createStreamingJsonArrayBody(
  documents: AsyncIterable<unknown>,
  operation: string
): StreamingJsonArrayBody {
  return { [STREAMING_JSON_ARRAY_BODY]: true, documents, operation };
}

function isStreamingJsonArrayBody(value: unknown): value is StreamingJsonArrayBody {
  return value !== null &&
    typeof value === "object" &&
    (value as StreamingJsonArrayBody)[STREAMING_JSON_ARRAY_BODY] === true;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof SolrTimeoutError ||
    (error instanceof Error && error.name === "TimeoutError");
}

function createRequestSignal(callerSignal: AbortSignal | undefined, timeoutMs: number, endpoint: string): RequestSignalContext {
  const controller = new AbortController();
  let timedOut = false;
  let cleaned = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const abortFromCaller = (): void => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

  timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new SolrTimeoutError(endpoint, timeoutMs));
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      if (cleaned) return;
      cleaned = true;
      if (timeout !== undefined) clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    },
    classify: (cause?: unknown) => {
      if (callerSignal?.aborted) return new SolrAbortError(endpoint, callerSignal.reason, cause);
      if (timedOut || controller.signal.aborted || isTimeoutError(cause)) {
        return new SolrTimeoutError(endpoint, timeoutMs, cause);
      }
      return undefined;
    }
  };
}

function wrapResponse(response: Response, context: RequestSignalContext, endpoint: string): Response {
  if (!response.body) {
    context.cleanup();
    return response;
  }
  context.signal.addEventListener("abort", context.cleanup, { once: true });
  const reader = response.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          controller.close();
          context.cleanup();
        } else {
          controller.enqueue(result.value);
        }
      } catch (error) {
        const classified = context.classify(error);
        context.cleanup();
        controller.error(classified ?? new SolrNetworkError(endpoint, error));
      }
    },
    async cancel(reason) {
      try { await reader.cancel(reason); }
      finally { context.cleanup(); }
    }
  });
  const wrapped = new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
  Object.defineProperties(wrapped, {
    url: { value: response.url },
    redirected: { value: response.redirected },
    type: { value: response.type }
  });
  return wrapped;
}

/** Shared HTTP transport. Domain APIs use this class for all Solr requests. */
export class SolrTransport {
  readonly #clientConfig: Readonly<SolrClientConfig>;
  private readonly requestFetch: typeof fetch;

  constructor(config: SolrClientConfig = {}) {
    this.validateConfig(config);
    this.#clientConfig = Object.freeze({ ...config });
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
    if (config.jsonCodec !== undefined && (
      !config.jsonCodec ||
      typeof config.jsonCodec.parse !== "function" ||
      typeof config.jsonCodec.stringify !== "function"
    )) {
      throw new TypeError("jsonCodec must provide parse() and stringify() functions");
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

  private requestTimeout(options: RequestOptions): number {
    const timeoutMs = options.timeoutMs ?? this.#clientConfig.timeoutMs ?? 30_000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new RangeError("Request timeoutMs must be a positive number");
    }
    return timeoutMs;
  }

  private createJsonArrayStream(body: StreamingJsonArrayBody): ReadableStream<Uint8Array> {
    const thisTransport = this;
    const iterator = body.documents[Symbol.asyncIterator]();
    const encoder = new TextEncoder();
    let started = false;
    let firstDocument = true;
    let completed = false;

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          if (!started) {
            started = true;
            controller.enqueue(encoder.encode("["));
            return;
          }

          const next = await iterator.next();
          if (next.done) {
            completed = true;
            controller.enqueue(encoder.encode("]"));
            controller.close();
            return;
          }

          const document = await thisTransport.validate(body.operation, "inputs", next.value);
          const serialized = stringifyBody(document, thisTransport.#clientConfig.jsonCodec);
          if (typeof serialized !== "string") {
            throw new TypeError("The JSON codec must serialize every streamed document to a string");
          }
          controller.enqueue(encoder.encode(`${firstDocument ? "" : ","}${serialized}`));
          firstDocument = false;
        } catch (error) {
          try { await iterator.return?.(); } catch { /* preserve the original producer/serialization error */ }
          controller.error(error);
        }
      },
      async cancel() {
        if (!completed) await iterator.return?.();
      }
    }, { highWaterMark: 1 });
  }

  private async validate(operation: string, direction: "inputs" | "outputs", value: unknown): Promise<unknown> {
    const schema: ValidationSchema | undefined = this.#clientConfig.validation?.[direction]?.[operation];
    if (!schema) return value;
    let result: Awaited<ReturnType<ValidationSchema["safeParseAsync"]>>;
    try {
      result = await schema.safeParseAsync(value);
    } catch (cause) {
      throw new SolrValidationError(operation, [], cause);
    }
    if (result.success) return result.data;
    if (this.#clientConfig.validation?.onError === "ignore") return value;
    throw new SolrValidationError(operation, result.error.issues);
  }

  private authorizationHeader(): string | undefined {
    const auth: SolrAuth | undefined = this.#clientConfig.auth;
    if (auth?.type === "bearer") return `Bearer ${auth.token}`;
    if (auth?.type === "basic") {
      return `Basic ${Buffer.from(`${auth.username}:${auth.password ?? ""}`).toString("base64")}`;
    }
    if (this.#clientConfig.username !== undefined) {
      return `Basic ${Buffer.from(`${this.#clientConfig.username}:${this.#clientConfig.password ?? ""}`).toString("base64")}`;
    }
    return undefined;
  }

  private async fetchWithRetry(
    url: URL,
    method: SolrHttpMethod,
    headers: Record<string, string>,
    body: BodyInit | undefined,
    callerSignal: AbortSignal | undefined,
    timeoutMs: number,
    streamingBody = false
  ): Promise<{ response: Response; signalContext: RequestSignalContext }> {
    const policy: SolrRetryPolicy = this.#clientConfig.retry === false ? {} : (this.#clientConfig.retry ?? {});
    const maxAttempts = streamingBody ? 1 : (policy.maxAttempts ?? 1);
    const retryMethods = policy.methods ?? ["GET"];
    const retryStatuses = policy.retryableStatuses ?? DEFAULT_RETRY_STATUSES;
    const retryNetworkErrors = policy.retryNetworkErrors ?? true;
    const baseDelayMs = policy.baseDelayMs ?? 100;
    const maxDelayMs = policy.maxDelayMs ?? 2_000;
    const endpoint = endpointFor(url);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (callerSignal?.aborted) throw new SolrAbortError(endpoint, callerSignal.reason);
      const signalContext = createRequestSignal(callerSignal, timeoutMs, endpoint);
      try {
        const init = {
          method,
          headers,
          ...(body === undefined ? {} : { body }),
          signal: signalContext.signal,
          ...(streamingBody ? { duplex: "half" as const } : {})
        } as RequestInit & { duplex?: "half" };
        const response = await this.requestFetch(url, init);
        const abortError = signalContext.classify();
        if (abortError) throw abortError;
        if (attempt < maxAttempts && retryMethods.includes(method) && retryStatuses.includes(response.status)) {
          try { await response.body?.cancel(); }
          finally { signalContext.cleanup(); }
          await wait(Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1))));
          continue;
        }
        return { response, signalContext };
      } catch (error) {
        const classified = signalContext.classify(error);
        signalContext.cleanup();
        if (classified instanceof SolrAbortError) throw classified;
        if (attempt < maxAttempts && retryMethods.includes(method) && retryNetworkErrors) {
          await wait(Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1))));
          continue;
        }
        if (classified instanceof SolrTimeoutError) throw classified;
        throw new SolrNetworkError(endpoint, error);
      }
    }
    throw new Error("Solr request retry loop ended unexpectedly");
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const operation = options.operation ?? method;
    const query = withDefaultParams(this.#clientConfig.requestDefaults?.params, options.query);
    const streamingArrayBody = isStreamingJsonArrayBody(options.body) ? options.body : undefined;
    const rawStreamBody = isReadableStreamBody(options.body);
    const streamingBody = streamingArrayBody !== undefined || rawStreamBody;
    const input = streamingArrayBody !== undefined
      ? this.createJsonArrayStream(streamingArrayBody)
      : rawStreamBody
        ? options.body
        : this.#clientConfig.validation
          ? await this.validate(operation, "inputs", options.body ?? query)
          : (options.body ?? query);
    const url = resolveUrl(path, this.#clientConfig.baseUrl ?? DEFAULT_BASE_URL);
    appendSearchParams(url.searchParams, options.body === undefined ? input as RequestOptions["query"] : query);
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...this.#clientConfig.requestDefaults?.headers,
      ...(this.authorizationHeader() ? { authorization: this.authorizationHeader() as string } : {}),
      ...this.#clientConfig.headers,
      ...options.headers
    };
    const { response, signalContext } = await this.fetchWithRetry(
      url, method, headers, options.body === undefined ? undefined : streamingBody ? input as ReadableStream<Uint8Array> : stringifyBody(input, this.#clientConfig.jsonCodec), options.signal, this.requestTimeout(options), streamingBody
    );
    try {
      let body: string;
      try { body = await response.text(); }
      catch (error) {
        const classified = signalContext.classify(error);
        throw classified ?? new SolrNetworkError(endpointFor(url), error);
      }
      const abortError = signalContext.classify();
      if (abortError) throw abortError;
      const payload = parseBody(body, this.#clientConfig.jsonCodec);
      if (!response.ok) {
        throw new SolrHttpError(response.status, response.statusText, endpointFor(url), body, payload);
      }
      return (this.#clientConfig.validation ? await this.validate(operation, "outputs", payload) : payload) as T;
    } finally {
      signalContext.cleanup();
    }
  }

  protected endpoint(path: string): string {
    const target = this.#clientConfig.core ?? this.#clientConfig.collection;
    if (!target) throw new Error("Set 'core' or 'collection' in the Solr client configuration");
    return `/solr/${encodeURIComponent(target)}${path}`;
  }

  /**
   * Send a request and return the raw Response. String bodies are sent unchanged;
   * callers must set their own Content-Type for non-JSON payloads. Other bodies
   * are JSON serialized as before.
   */
  async requestRaw(path: string, options: RequestOptions = {}): Promise<Response> {
    const method = options.method ?? "GET";
    const operation = options.operation ?? method;
    const query = withDefaultParams(this.#clientConfig.requestDefaults?.params, options.query);
    const streamingBody = isReadableStreamBody(options.body);
    const input = streamingBody
      ? options.body
      : this.#clientConfig.validation
        ? await this.validate(operation, "inputs", options.body ?? query)
        : (options.body ?? query);
    const url = resolveUrl(path, this.#clientConfig.baseUrl ?? DEFAULT_BASE_URL);
    appendSearchParams(url.searchParams, options.body === undefined ? input as RequestOptions["query"] : query);
    const rawStringBody = typeof input === "string";
    const headers: Record<string, string> = {
      accept: "*/*",
      ...(options.body === undefined || rawStringBody ? {} : { "content-type": "application/json" }),
      ...this.#clientConfig.requestDefaults?.headers,
      ...(this.authorizationHeader() ? { authorization: this.authorizationHeader() as string } : {}),
      ...this.#clientConfig.headers,
      ...options.headers
    };
    const { response, signalContext } = await this.fetchWithRetry(
      url, method, headers, options.body === undefined ? undefined : streamingBody ? input as ReadableStream<Uint8Array> : rawStringBody ? input as string : stringifyBody(input, this.#clientConfig.jsonCodec), options.signal, this.requestTimeout(options), streamingBody
    );
    if (!response.ok) {
      try {
        const body = await response.text();
        const abortError = signalContext.classify();
        if (abortError) throw abortError;
        throw new SolrHttpError(response.status, response.statusText, endpointFor(url), body, parseBody(body, this.#clientConfig.jsonCodec));
      } catch (error) {
        const classified = signalContext.classify(error);
        if (classified) throw classified;
        if (error instanceof SolrHttpError) throw error;
        throw new SolrNetworkError(endpointFor(url), error);
      } finally {
        signalContext.cleanup();
      }
    }
    return wrapResponse(response, signalContext, endpointFor(url));
  }
}
