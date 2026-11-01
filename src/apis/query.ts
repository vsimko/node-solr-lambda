import type { SolrTransport } from "../transport.js";
import { solrFilter } from "../query-helpers.js";
import type { RequestControlOptions, SolrClassicFacetOptions, SolrFacetFieldOptions, SolrFacetRangeOptions, SolrFieldHighlightOptions, SolrHighlightingOptions, SolrFilter, SolrQuery, SolrQueryParamValue } from "../types.js";

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

function setRangeOptions(
  params: Record<string, unknown>,
  prefix: string,
  options: SolrFacetRangeOptions
): void {
  params[`${prefix}.start`] = options.start;
  params[`${prefix}.end`] = options.end;
  params[`${prefix}.gap`] = options.gap;
  if (options.hardEnd !== undefined) params[`${prefix}.hardend`] = options.hardEnd;
  if (options.other !== undefined) params[`${prefix}.other`] = options.other;
  if (options.include !== undefined) params[`${prefix}.include`] = options.include;
  if (options.method !== undefined) params[`${prefix}.method`] = options.method;
}


function setFieldHighlightOptions(params: Record<string, unknown>, prefix: string, options: SolrFieldHighlightOptions): void {
  if (options.method !== undefined) params[`${prefix}.method`] = options.method;
  if (options.snippets !== undefined) params[`${prefix}.snippets`] = options.snippets;
  if (options.fragmentSize !== undefined) params[`${prefix}.fragsize`] = options.fragmentSize;
  if (options.requireFieldMatch !== undefined) params[`${prefix}.requireFieldMatch`] = options.requireFieldMatch;
  if (options.alternateField !== undefined) params[`${prefix}.alternateField`] = options.alternateField;
  if (options.maxAlternateFieldLength !== undefined) params[`${prefix}.maxAlternateFieldLength`] = options.maxAlternateFieldLength;
}

function applyHighlighting(params: Record<string, unknown>, highlighting: SolrHighlightingOptions): void {
  params.hl = highlighting.enabled ?? true;
  if (highlighting.enabled === false) return;

  if (highlighting.fields !== undefined) params["hl.fl"] = highlighting.fields;
  if (highlighting.method !== undefined) params["hl.method"] = highlighting.method;
  if (highlighting.snippets !== undefined) params["hl.snippets"] = highlighting.snippets;
  if (highlighting.fragmentSize !== undefined) params["hl.fragsize"] = highlighting.fragmentSize;
  if (highlighting.mergeContiguous !== undefined) params["hl.mergeContiguous"] = highlighting.mergeContiguous;
  if (highlighting.requireFieldMatch !== undefined) params["hl.requireFieldMatch"] = highlighting.requireFieldMatch;
  if (highlighting.maxAnalyzedChars !== undefined) params["hl.maxAnalyzedChars"] = highlighting.maxAnalyzedChars;
  if (highlighting.alternateField !== undefined) params["hl.alternateField"] = highlighting.alternateField;
  if (highlighting.maxAlternateFieldLength !== undefined) params["hl.maxAlternateFieldLength"] = highlighting.maxAlternateFieldLength;
  if (highlighting.formatter !== undefined) params["hl.formatter"] = highlighting.formatter;
  if (highlighting.tagPre !== undefined) params["hl.tag.pre"] = highlighting.tagPre;
  if (highlighting.tagPost !== undefined) params["hl.tag.post"] = highlighting.tagPost;
  if (highlighting.simplePre !== undefined) params["hl.simple.pre"] = highlighting.simplePre;
  if (highlighting.simplePost !== undefined) params["hl.simple.post"] = highlighting.simplePost;
  if (highlighting.encoder !== undefined) params["hl.encoder"] = highlighting.encoder;
  if (highlighting.highlightMultiTerm !== undefined) params["hl.highlightMultiTerm"] = highlighting.highlightMultiTerm;
  if (highlighting.usePhraseHighlighter !== undefined) params["hl.usePhraseHighlighter"] = highlighting.usePhraseHighlighter;
  if (highlighting.payloads !== undefined) params["hl.payloads"] = highlighting.payloads;
  if (highlighting.offsetSource !== undefined) params["hl.offsetSource"] = highlighting.offsetSource;
  if (highlighting.fragAlignRatio !== undefined) params["hl.fragAlignRatio"] = highlighting.fragAlignRatio;

  if (highlighting.perField !== undefined) {
    for (const [field, options] of Object.entries(highlighting.perField)) {
      setFieldHighlightOptions(params, `f.${field}.hl`, options);
    }
  }
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
  if (facets.rangeMethod !== undefined) params["facet.range.method"] = facets.rangeMethod;

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
  if (facets.ranges !== undefined) {
    const ranges = typeof facets.ranges === "string" ? [facets.ranges] : facets.ranges;
    params["facet.range"] = ranges.map(range => typeof range === "string" ? range : range.field);
    for (const range of ranges) {
      if (typeof range !== "string") setRangeOptions(params, `f.${range.field}.facet.range`, range);
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
  if (query.highlighting !== undefined) applyHighlighting(params, query.highlighting);
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
  delete params.highlighting;
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
