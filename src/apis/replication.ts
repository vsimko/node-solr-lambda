import type { SolrTransport } from "../transport.js";
import type {
  RequestControlOptions,
  SolrReplicationCommand,
  SolrReplicationFileContentParams,
  SolrReplicationParams,
  SolrReplicationResponse
} from "../types.js";

/** Execute a JSON ReplicationHandler command against the configured core. */
export function replication<A extends SolrReplicationCommand>(
  client: SolrTransport,
  path: string,
  command: A,
  params: SolrReplicationParams<A> = {} as SolrReplicationParams<A>,
  requestOptions: RequestControlOptions = {}
): Promise<SolrReplicationResponse<A>> {
  const { customParams, ...commandParams } = params as SolrReplicationParams<A> & {
    customParams?: Readonly<Record<string, string | number | boolean>>;
  };
  const query: Record<string, string | number | boolean> = {
    ...commandParams,
    ...customParams,
    command,
    wt: "json"
  };
  if (command === "filelist") {
    const fileListParams = params as { generation?: number; indexversion?: number };
    const generation = fileListParams.generation ?? fileListParams.indexversion;
    if (generation !== undefined) {
      if (!Number.isInteger(generation) || generation < 0) {
        throw new RangeError("generation must be a non-negative integer");
      }
      query.generation = generation;
      query.indexversion = generation;
    }
  }
  return client.request<SolrReplicationResponse<A>>(path, {
    ...requestOptions,
    query,
    operation: "replication"
  });
}

/** Retrieve a replication index/config/transaction-log file as a raw stream. */
export function replicationFile(
  client: SolrTransport,
  path: string,
  params: SolrReplicationFileContentParams,
  requestOptions: RequestControlOptions = {}
): Promise<Response> {
  const { directoryType, filePath, customParams, ...fileOptions } = params;
  if (!filePath.trim()) throw new TypeError("filePath must be a non-empty string");
  if (fileOptions.offset !== undefined && (!Number.isInteger(fileOptions.offset) || fileOptions.offset < 0)) {
    throw new RangeError("offset must be a non-negative integer");
  }
  if (fileOptions.length !== undefined && (!Number.isInteger(fileOptions.length) || fileOptions.length <= 0)) {
    throw new RangeError("length must be a positive integer");
  }
  if (fileOptions.generation !== undefined && (!Number.isInteger(fileOptions.generation) || fileOptions.generation < 0)) {
    throw new RangeError("generation must be a non-negative integer");
  }
  if (fileOptions.maxWriteMBPerSec !== undefined &&
    (!Number.isFinite(fileOptions.maxWriteMBPerSec) || fileOptions.maxWriteMBPerSec < 0)) {
    throw new RangeError("maxWriteMBPerSec must be a non-negative number");
  }

  return client.requestRaw(path, {
    ...requestOptions,
    query: {
      ...customParams,
      command: "filecontent",
      [directoryType]: filePath,
      wt: "filestream",
      ...fileOptions
    },
    operation: "replicationFile"
  });
}
