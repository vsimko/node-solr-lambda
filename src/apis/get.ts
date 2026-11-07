import type { SolrTransport } from "../transport.js";
import type {
  RequestControlOptions,
  SolrGetMultipleResponse,
  SolrGetRequest,
  SolrGetSingleResponse,
  SolrQueryParamValue
} from "../types.js";

const reservedParameters = new Set(["id", "ids", "fl", "fq"]);

function assertNonEmptyString(value: string, name: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`RealTime Get ${name} must be a non-empty string`);
  }
}

function serializeGetRequest(request: SolrGetRequest): Record<string, SolrQueryParamValue> {
  const params: Record<string, SolrQueryParamValue> = { ...(request.params ?? {}) };
  for (const name of reservedParameters) {
    if (Object.prototype.hasOwnProperty.call(params, name)) {
      throw new TypeError(`RealTime Get params must not override ${name}; use its typed request property`);
    }
  }

  const singleId = (request as { id?: string }).id;
  const multipleIds = (request as { ids?: readonly string[] }).ids;
  if ((singleId === undefined) === (multipleIds === undefined)) {
    throw new TypeError("RealTime Get requires exactly one of id or ids");
  }
  if (singleId !== undefined) {
    assertNonEmptyString(singleId, "id");
    params.id = singleId;
  } else {
    if (!Array.isArray(multipleIds) || multipleIds.length < 2) {
      throw new TypeError("RealTime Get ids must contain at least two document IDs");
    }
    for (const id of multipleIds) {
      assertNonEmptyString(id, "ids entry");
      if (id.includes(",")) throw new TypeError("RealTime Get IDs must not contain commas when using ids");
    }
    params.ids = multipleIds.join(",");
  }

  if (request.fields !== undefined) {
    const fields = typeof request.fields === "string" ? [request.fields] : request.fields;
    if (fields.length === 0) throw new TypeError("RealTime Get fields must not be empty");
    for (const field of fields) assertNonEmptyString(field, "field");
    params.fl = fields.join(",");
  }
  if (request.filter !== undefined) {
    const filters = typeof request.filter === "string" ? [request.filter] : request.filter;
    if (filters.length === 0) throw new TypeError("RealTime Get filter must not be empty");
    for (const filter of filters) assertNonEmptyString(filter, "filter");
    params.fq = filters;
  }
  return params;
}

export function get<TDocument = unknown>(
  client: SolrTransport,
  path: string,
  request: SolrGetRequest,
  requestOptions: RequestControlOptions = {}
): Promise<SolrGetSingleResponse<TDocument> | SolrGetMultipleResponse<TDocument>> {
  const query = serializeGetRequest(request);
  return client.request<SolrGetSingleResponse<TDocument> | SolrGetMultipleResponse<TDocument>>(path, {
    ...requestOptions,
    method: "GET",
    query,
    operation: "get"
  });
}
