import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions, SolrCommitOptions, SolrDelete, SolrDeleteOptions, SolrDocument, SolrJsonUpdateCommands, SolrOptimizeOptions, SolrSoftCommitOptions, SolrUpdateOptions, SolrUpdateResponse } from "../types.js";

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

export function atomicUpdate<T = SolrUpdateResponse>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  const batch = Array.isArray(documents) ? documents : [documents];
  for (const document of batch) validateAtomicUpdateDocument(document as SolrDocument);
  return sendDocuments<T>(client, path, batch, options, requestOptions, "atomicUpdate");
}

function sendDocuments<T = SolrUpdateResponse>(
  client: SolrTransport,
  path: string,
  documents: SolrDocument | readonly SolrDocument[],
  options: SolrUpdateOptions,
  requestOptions: RequestControlOptions,
  operation: "add" | "update" | "atomicUpdate"
): Promise<T> {
  const isBatch = Array.isArray(documents);
  const requestPath = isBatch ? path : `${path}/json/docs`;
  return client.request<T>(requestPath, {
    ...requestOptions,
    method: "POST",
    body: documents,
    query: updateParams(options),
    operation
  });
}


function createJsonArrayStream(
  client: SolrTransport,
  documents: AsyncIterable<SolrDocument>
): ReadableStream<Uint8Array> {
  const iterator = documents[Symbol.asyncIterator]();
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

        const document = await client.validateInput("addStream", next.value);
        const serialized = client.serializeJson(document);
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

export function addStream<T = SolrUpdateResponse>(
  client: SolrTransport,
  path: string,
  documents: AsyncIterable<SolrDocument>,
  options: SolrUpdateOptions = {},
  requestOptions: RequestControlOptions = {}
): Promise<T> {
  if (!documents || typeof documents[Symbol.asyncIterator] !== "function") {
    throw new TypeError("addStream requires an AsyncIterable of Solr documents");
  }
  const body = createJsonArrayStream(client, documents);
  return client.request<T>(path, {
    ...requestOptions,
    method: "POST",
    body,
    query: updateParams(options),
    operation: "addStream"
  });
}

export function add<T = SolrUpdateResponse>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return sendDocuments<T>(client, path, documents, options, requestOptions, "add");
}

function validateJsonUpdateCommands(commands: SolrJsonUpdateCommands): void {
  if (!commands || typeof commands !== "object" || Array.isArray(commands)) {
    throw new TypeError("JSON update commands must be an object");
  }
  const entries = Object.entries(commands);
  if (entries.length === 0) throw new TypeError("A JSON update command object must contain at least one command");
  const supported = new Set(["add", "delete", "commit", "optimize", "rollback"]);
  for (const [name, value] of entries) {
    if (!supported.has(name)) throw new TypeError(`Unsupported JSON update command "${name}"`);
    if (name === "add") {
      if (!value || typeof value !== "object" || Array.isArray(value) ||
        !("doc" in value) || !value.doc || typeof value.doc !== "object" || Array.isArray(value.doc)) {
        throw new TypeError("JSON add command requires a document object");
      }
      const addCommand = value as { commitWithin?: unknown; overwrite?: unknown };
      if (addCommand.commitWithin !== undefined &&
        (typeof addCommand.commitWithin !== "number" || !Number.isInteger(addCommand.commitWithin) || addCommand.commitWithin < 0)) {
        throw new RangeError("JSON add commitWithin must be a non-negative integer");
      }
      if (addCommand.overwrite !== undefined && typeof addCommand.overwrite !== "boolean") {
        throw new TypeError("JSON add overwrite must be a boolean");
      }
    } else if (name === "delete") {
      const validDelete = typeof value === "string" ||
        (Array.isArray(value) && value.every(id => typeof id === "string")) ||
        (!!value && typeof value === "object" && !Array.isArray(value) && (() => {
          const command = value as Record<string, unknown>;
          const hasId = typeof command.id === "string";
          const hasQuery = typeof command.query === "string";
          const allowedKeys = hasId ? ["id", "_version_"] : ["query"];
          return hasId !== hasQuery &&
            Object.keys(command).every(key => allowedKeys.includes(key)) &&
            (command._version_ === undefined || (hasId && typeof command._version_ === "number"));
        })());
      if (!validDelete) throw new TypeError("JSON delete command must contain an ID, ID list, or query");
    } else if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`JSON ${name} command must be an object`);
    } else if (name === "commit" && "maxSegments" in value) {
      throw new TypeError("maxSegments is optimize-only; use optimize()");
    } else if (name === "commit" && (value as SolrCommitOptions).softCommit === true && (value as SolrCommitOptions).expungeDeletes === true) {
      throw new TypeError("expungeDeletes is not supported on a soft commit");
    } else if (name === "optimize" && "expungeDeletes" in value) {
      throw new TypeError("expungeDeletes is commit-only");
    } else if (name === "optimize" && (value as SolrOptimizeOptions).maxSegments !== undefined &&
      (!Number.isInteger((value as SolrOptimizeOptions).maxSegments) || (value as SolrOptimizeOptions).maxSegments! < 1)) {
      throw new RangeError("maxSegments must be a positive integer");
    } else if (name === "rollback" && Object.keys(value).length > 0) {
      throw new TypeError("JSON rollback command must be an empty object");
    }
  }
}

export function updateCommands<T = SolrUpdateResponse>(client: SolrTransport, path: string, commands: SolrJsonUpdateCommands, options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  validateJsonUpdateCommands(commands);
  const commitOpenSearcher = commands.commit?.openSearcher;
  const optimizeOpenSearcher = commands.optimize?.openSearcher;
  if (commitOpenSearcher !== undefined && optimizeOpenSearcher !== undefined && commitOpenSearcher !== optimizeOpenSearcher) {
    throw new TypeError("commit and optimize commands must use the same openSearcher value in one request");
  }
  const openSearcher = commitOpenSearcher ?? optimizeOpenSearcher;
  const commitOptions = commands.commit === undefined ? undefined : { ...commands.commit };
  const optimizeOptions = commands.optimize === undefined ? undefined : { ...commands.optimize };
  if (commitOptions) delete commitOptions.openSearcher;
  if (optimizeOptions) delete optimizeOptions.openSearcher;
  const body: SolrJsonUpdateCommands = {
    ...commands,
    ...(commitOptions === undefined ? {} : { commit: commitOptions }),
    ...(optimizeOptions === undefined ? {} : { optimize: optimizeOptions })
  };
  return client.request<T>(`${path}/json`, {
    ...requestOptions,
    method: "POST",
    body,
    query: { ...updateParams(options), ...(openSearcher === undefined ? {} : { openSearcher }) },
    operation: "updateCommands"
  });
}

export function update<T = SolrUpdateResponse>(client: SolrTransport, path: string, documents: SolrDocument | readonly SolrDocument[], options: SolrUpdateOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  return sendDocuments<T>(client, path, documents, options, requestOptions, "update");
}

export function deleteDocuments<T = SolrUpdateResponse>(client: SolrTransport, path: string, command: SolrDelete, options: SolrDeleteOptions = {}): Promise<T> {
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

export function commit<T = SolrUpdateResponse>(client: SolrTransport, path: string, options: SolrCommitOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  if (options.softCommit === true && options.expungeDeletes === true) {
    throw new TypeError("expungeDeletes is not supported on a soft commit");
  }
  const legacyOptions = options as SolrCommitOptions & { maxSegments?: number };
  if (legacyOptions.maxSegments !== undefined) {
    throw new TypeError("maxSegments is optimize-only; use optimize()");
  }
  const { openSearcher, ...commitOptions } = options;
  return client.request<T>(path, {
    ...requestOptions,
    method: "POST",
    body: { commit: commitOptions },
    ...(openSearcher === undefined ? {} : { query: { openSearcher } }),
    operation: "commit"
  });
}

export function softCommit<T = SolrUpdateResponse>(client: SolrTransport, path: string, options: SolrSoftCommitOptions = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  const { openSearcher, waitSearcher } = options;
  return client.request<T>(path, {
    ...requestOptions,
    method: "POST",
    body: { commit: { softCommit: true, waitSearcher: waitSearcher ?? true } },
    ...(openSearcher === undefined ? {} : { query: { openSearcher } }),
    operation: "softCommit"
  });
}

export function optimize<T = SolrUpdateResponse>(client: SolrTransport, path: string, options: SolrOptimizeOptions | number = {}, requestOptions: RequestControlOptions = {}): Promise<T> {
  const normalized = typeof options === "number" ? { maxSegments: options } : options;
  if (normalized.maxSegments !== undefined && (!Number.isInteger(normalized.maxSegments) || normalized.maxSegments < 1)) {
    throw new RangeError("maxSegments must be a positive integer");
  }
  const { openSearcher, ...optimizeOptions } = normalized;
  return client.request<T>(path, {
    ...requestOptions,
    method: "POST",
    body: { optimize: optimizeOptions },
    ...(openSearcher === undefined ? {} : { query: { openSearcher } }),
    operation: "optimize"
  });
}

export function rollback<T = SolrUpdateResponse>(client: SolrTransport, path: string, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: { rollback: {} }, operation: "rollback" });
}
