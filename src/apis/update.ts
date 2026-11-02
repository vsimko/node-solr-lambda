import type { SolrTransport } from "../transport.js";
import type { CommitOptions, RequestControlOptions, SolrDelete, SolrDeleteOptions, SolrDocument, SolrOptimizeOptions, SolrUpdateOptions } from "../types.js";

function updateParams(options: SolrUpdateOptions): Record<string, string | number | boolean> {
  const { route, ...params } = options;
  if (options.commitWithin !== undefined && (!Number.isInteger(options.commitWithin) || options.commitWithin < 0)) {
    throw new RangeError("commitWithin must be a non-negative integer");
  }
  if (route !== undefined && route.trim() === "") throw new TypeError("route must be a non-empty string");
  return { ...params, ...(route === undefined ? {} : { _route_: route }) };
}

function deleteParams(options: SolrDeleteOptions): Record<string, string | number | boolean> {
  const { route, commitWithin } = options;
  if (commitWithin !== undefined && (!Number.isInteger(commitWithin) || commitWithin < 0)) {
    throw new RangeError("commitWithin must be a non-negative integer");
  }
  if (route !== undefined && route.trim() === "") throw new TypeError("route must be a non-empty string");
  return {
    ...(route === undefined ? {} : { _route_: route }),
    ...(commitWithin === undefined ? {} : { commitWithin })
  };
}

const atomicModifiers = new Set(["set", "add", "add-distinct", "remove", "removeregex", "inc"]);

function validateAtomicUpdateDocument(document: SolrDocument): void {
  let uniqueKeyCount = 0;
  let modifierCount = 0;

  for (const [field, value] of Object.entries(document)) {
    if (field === "_root_") {
      if (typeof value !== "string" || value.length === 0) throw new TypeError("_root_ must be a non-empty string");
      continue;
    }
    if (field === "_version_") {
      if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError("_version_ must be a finite number");
      continue;
    }

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      uniqueKeyCount += 1;
      if (typeof value !== "string" && typeof value !== "number") {
        throw new TypeError("The atomic update unique-key value must be a string or number");
      }
      continue;
    }

    const modifiers = Object.keys(value);
    if (modifiers.length !== 1 || !atomicModifiers.has(modifiers[0]!)) {
      throw new TypeError(`Atomic update field "${field}" must contain exactly one supported modifier`);
    }
    const modifier = modifiers[0]!;
    const modifierValue = (value as Record<string, unknown>)[modifier];
    if (modifier === "inc" && (typeof modifierValue !== "number" || !Number.isFinite(modifierValue))) {
      throw new TypeError(`Atomic update modifier "inc" for "${field}" must be a finite number`);
    }
    if (modifier === "removeregex" &&
      !(typeof modifierValue === "string" || (Array.isArray(modifierValue) && modifierValue.every(item => typeof item === "string")))) {
      throw new TypeError(`Atomic update modifier "removeregex" for "${field}" must be a string or string array`);
    }
    modifierCount += 1;
  }

  if (uniqueKeyCount !== 1) throw new TypeError("An atomic update document must contain exactly one plain unique-key field");
  if (modifierCount === 0) throw new TypeError("An atomic update document must contain at least one field modifier");
}

export function atomicUpdate<T>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  const batch = Array.isArray(documents) ? documents : [documents];
  for (const document of batch) validateAtomicUpdateDocument(document as SolrDocument);
  return add<T>(client, path, batch, options, requestOptions);
}

export function add<T>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, {
    ...requestOptions,
    method: "POST",
    body: Array.isArray(documents) ? documents : [documents],
    query: updateParams(options),
    operation: "add"
  });
}

export function update<T>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return add<T>(client, path, documents, options, requestOptions);
}

export function deleteDocuments<T>(client: SolrTransport, path: string, command: SolrDelete, options: SolrDeleteOptions = {}): Promise<T> {
  const requestOptions: RequestControlOptions = {
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.headers === undefined ? {} : { headers: options.headers })
  };
  return client.request<T>(path, {
    ...requestOptions,
    method: "POST",
    body: { delete: typeof command === "string" ? { id: command } : command },
    query: deleteParams(options),
    operation: "delete"
  });
}

export function commit<T>(client: SolrTransport, path: string, options: CommitOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: { commit: options }, operation: "commit" });
}

export function softCommit<T>(client: SolrTransport, path: string, requestOptions: RequestControlOptions = {}): Promise<T> {
  return commit<T>(client, path, { softCommit: true, waitSearcher: false }, requestOptions);
}

export function optimize<T>(client: SolrTransport, path: string, options: SolrOptimizeOptions | number = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  const normalized = typeof options === "number" ? { maxSegments: options } : options;
  if (normalized.maxSegments !== undefined && (!Number.isInteger(normalized.maxSegments) || normalized.maxSegments < 1)) {
    throw new RangeError("maxSegments must be a positive integer");
  }
  return client.request<T>(path, { ...requestOptions, method: "POST", body: { optimize: normalized }, operation: "optimize" });
}

export function rollback<T>(client: SolrTransport, path: string, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: { rollback: {} }, operation: "rollback" });
}
