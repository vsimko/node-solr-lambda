import type { SolrTransport } from "../transport.js";
import { solrFilter } from "../query-helpers.js";
import type { RequestControlOptions, SolrClassicFacetOptions, SolrFacetDateOptions, SolrFacetFieldOptions, SolrFacetRangeOptions, SolrFilter, SolrQuery, SolrQueryParamValue } from "../types.js";

function serializeFilter(filter: SolrFilter): string {
  return typeof filter === "string" ? filter : solrFilter(filter.query, filter);
}


function setFacetSettings(params: Record<string, unknown>, prefix: string, options: SolrFacetFieldOptions): void {
  if (options.limit !== undefined) params[`${prefix}.limit`] = options.limit;
  if (options.offset !== undefined) params[`${prefix}.offset`] = options.offset;
  if (options.sort !== undefined) params[`${prefix}.sort`] = options.sort;
  if (options.minCount !== undefined) params[`${prefix}.mincount`] = options.minCount;
  if (options.missing !== undefined) params[`${prefix}.missing`] = options.missing;
  if (options.prefix !== undefined) params[`${prefix}.prefix`] = options.prefix;
  if (options.method !== undefined) params[`${prefix}.method`] = options.method;
}

function setDateOrRangeOptions(
  params: Record<string, unknown>,
  prefix: string,
  options: SolrFacetDateOptions | SolrFacetRangeOptions
): void {
  params[`${prefix}.start`] = options.start;
  params[`${prefix}.end`] = options.end;
  params[`${prefix}.gap`] = options.gap;
  if (options.hardEnd !== undefined) params[`${prefix}.hardend`] = options.hardEnd;
  if (options.other !== undefined) params[`${prefix}.other`] = options.other;
  if (options.include !== undefined) params[`${prefix}.include`] = options.include;
}

function applyClassicFacets(params: Record<string, unknown>, facets: SolrClassicFacetOptions): void {
  params.facet = facets.enabled ?? true;
  if (facets.enabled === false) return;

  if (facets.limit !== undefined) params["facet.limit"] = facets.limit;
  if (facets.offset !== undefined) params["facet.offset"] = facets.offset;
  if (facets.sort !== undefined) params["facet.sort"] = facets.sort;
  if (facets.minCount !== undefined) params["facet.mincount"] = facets.minCount;
  if (facets.missing !== undefined) params["facet.missing"] = facets.missing;
  if (facets.prefix !== undefined) params["facet.prefix"] = facets.prefix;
  if (facets.method !== undefined) params["facet.method"] = facets.method;

  if (facets.fields !== undefined) {
    const fields = typeof facets.fields === "string" ? [facets.fields] : facets.fields;
    params["facet.field"] = fields.map(field => {
      if (typeof field === "string") return field;
      setFacetSettings(params, `f.${field.field}.facet`, field);
      return field.field;
    });
  }
  if (facets.queries !== undefined) {
    params["facet.query"] = typeof facets.queries === "string" ? [facets.queries] : facets.queries;
  }
  if (facets.dates !== undefined) {
    const dates = typeof facets.dates === "string" ? [{ field: facets.dates, start: "", end: "", gap: "" }] : facets.dates;
    params["facet.date"] = dates.map(date => date.field);
    for (const date of dates) {
      setDateOrRangeOptions(params, `f.${date.field}.facet.date`, date);
    }
  }
  if (facets.ranges !== undefined) {
    const ranges = typeof facets.ranges === "string" ? [{ field: facets.ranges, start: 0, end: 0, gap: 1 }] : facets.ranges;
    params["facet.range"] = ranges.map(range => range.field);
    for (const range of ranges) {
      setDateOrRangeOptions(params, `f.${range.field}.facet.range`, range);
    }
  }
}

export function query<T>(client: SolrTransport, path: string, query: SolrQuery, requestOptions: RequestControlOptions = {}): Promise<T> {
  if (query.cursorMark !== undefined) {
    if (typeof query.sort !== "string" || query.sort.trim() === "") {
      throw new TypeError("cursorMark requires a non-empty sort expression");
    }
    if (query.offset !== undefined && query.offset !== 0) {
      throw new TypeError("cursorMark cannot be combined with a non-zero offset");
    }
    if (query.cursorMark.trim() === "") {
      throw new TypeError("cursorMark must be a non-empty string");
    }
  }

  const params: Record<string, unknown> = { ...(query.params ?? {}), ...query };
  if (query.query !== undefined) params.q = query.query;
  if (query.filter !== undefined) {
    params.fq = Array.isArray(query.filter)
      ? query.filter.map(filter => serializeFilter(filter))
      : serializeFilter(query.filter as SolrFilter);
  }
  if (query.fields !== undefined) params.fl = query.fields;
  if (query.limit !== undefined) params.rows = query.limit;
  if (query.offset !== undefined) params.start = query.offset;
  if (query.facets !== undefined) applyClassicFacets(params, query.facets);
  if (query.parserOptions !== undefined) {
    const { type: _parserType, ...parserOptions } = query.parserOptions;
    Object.assign(params, parserOptions);
  }
  delete params.query;
  delete params.params;
  delete params.filter;
  delete params.fields;
  delete params.limit;
  delete params.offset;
  delete params.parserOptions;
  delete params.facets;
  const flat: Record<string, SolrQueryParamValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" ||
      (Array.isArray(value) && value.every(item => typeof item === "string" || typeof item === "number"))) {
      flat[key] = value as SolrQueryParamValue;
    }
  }
  return client.request<T>(path, { ...requestOptions, method: "GET", query: flat, operation: "query" });
}

export function queryJson<T>(client: SolrTransport, path: string, request: Readonly<Record<string, unknown>>, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>(path, { ...requestOptions, method: "POST", body: request, operation: "queryJson" });
}
