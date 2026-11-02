import type { SolrTransport } from "../transport.js";
import { solrFilter } from "../query-helpers.js";
import type { RequestControlOptions, SolrClassicFacetOptions, SolrCollapseOptions, SolrExpandOptions, SolrFacetFieldOptions, SolrFacetRangeOptions, SolrFieldHighlightOptions, SolrHighlightingOptions, SolrGroupingOptions, SolrStatsFieldOptions, SolrStatsOptions, SolrMoreLikeThisOptions, SolrFilter, SolrQuery, SolrQueryParamValue } from "../types.js";

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



function quoteStatsLocalParam(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function serializeStatsField(options: SolrStatsFieldOptions): string {
  if (options.field.trim() === "") throw new TypeError("stats field must be a non-empty string");
  if (options.percentiles?.some(value => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new TypeError("stats percentiles must be between 0 and 100");
  }
  if (typeof options.cardinality === "number" && (!Number.isFinite(options.cardinality) || options.cardinality < 0 || options.cardinality > 1)) {
    throw new TypeError("stats cardinality accuracy must be between 0 and 1");
  }
  if (options.tdigestCompression !== undefined && (!Number.isFinite(options.tdigestCompression) || options.tdigestCompression <= 0)) {
    throw new TypeError("stats tdigest compression must be a positive number");
  }

  const localParams: string[] = [];
  if (options.key !== undefined) localParams.push(`key=${quoteStatsLocalParam(options.key)}`);
  if (options.tag !== undefined) localParams.push(`tag=${quoteStatsLocalParam(typeof options.tag === "string" ? options.tag : options.tag.join(","))}`);
  if (options.excludeTags !== undefined) localParams.push(`ex=${quoteStatsLocalParam(typeof options.excludeTags === "string" ? options.excludeTags : options.excludeTags.join(","))}`);

  const flags = ["min", "max", "sum", "count", "missing", "sumOfSquares", "mean", "stddev", "distinctValues", "countDistinct"] as const;
  for (const flag of flags) {
    if (options[flag] !== undefined) localParams.push(`${flag}=${options[flag]}`);
  }
  if (options.percentiles !== undefined) localParams.push(`percentiles=${quoteStatsLocalParam(options.percentiles.join(","))}`);
  if (options.cardinality !== undefined) localParams.push(`cardinality=${options.cardinality}`);
  if (options.tdigestCompression !== undefined) localParams.push(`tdigestCompression=${options.tdigestCompression}`);

  return localParams.length === 0
    ? options.field
    : `{!${localParams.join(" ")}}${options.field}`;
}

function applyStats(params: Record<string, unknown>, stats: SolrStatsOptions): void {
  params.stats = stats.enabled ?? true;
  if (stats.enabled === false) return;
  if (stats.fields !== undefined) {
    const fields = typeof stats.fields === "string" ? [stats.fields] : stats.fields;
    params["stats.field"] = fields.map(field => typeof field === "string" ? field : serializeStatsField(field));
  }
  if (stats.facets !== undefined) params["stats.facet"] = stats.facets;
  if (stats.calcDistinct !== undefined) params["stats.calcdistinct"] = stats.calcDistinct;
}

function applyMoreLikeThis(params: Record<string, unknown>, options: SolrMoreLikeThisOptions): void {
  params.mlt = options.enabled ?? true;
  if (options.enabled === false) return;
  if (options.fields !== undefined) params["mlt.fl"] = options.fields;
  const integerOptions = [
    ["count", options.count],
    ["minTermFrequency", options.minTermFrequency],
    ["minDocumentFrequency", options.minDocumentFrequency],
    ["maxDocumentFrequency", options.maxDocumentFrequency],
    ["minWordLength", options.minWordLength],
    ["maxWordLength", options.maxWordLength],
    ["maxQueryTerms", options.maxQueryTerms],
    ["maxParsedTokens", options.maxParsedTokens]
  ] as const;
  for (const [name, value] of integerOptions) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      throw new TypeError(`MoreLikeThis ${name} must be a non-negative integer`);
    }
  }
  if (options.count !== undefined) params["mlt.count"] = options.count;
  if (options.minTermFrequency !== undefined) params["mlt.mintf"] = options.minTermFrequency;
  if (options.minDocumentFrequency !== undefined) params["mlt.mindf"] = options.minDocumentFrequency;
  if (options.maxDocumentFrequency !== undefined) params["mlt.maxdf"] = options.maxDocumentFrequency;
  if (options.maxDocumentFrequencyPercent !== undefined) {
    if (!Number.isInteger(options.maxDocumentFrequencyPercent) || options.maxDocumentFrequencyPercent < 0 || options.maxDocumentFrequencyPercent > 100) {
      throw new TypeError("MoreLikeThis maxDocumentFrequencyPercent must be an integer between 0 and 100");
    }
    params["mlt.maxdfpct"] = options.maxDocumentFrequencyPercent;
  }
  if (options.minWordLength !== undefined) params["mlt.minwl"] = options.minWordLength;
  if (options.maxWordLength !== undefined) params["mlt.maxwl"] = options.maxWordLength;
  if (options.maxQueryTerms !== undefined) params["mlt.maxqt"] = options.maxQueryTerms;
  if (options.maxParsedTokens !== undefined) params["mlt.maxntp"] = options.maxParsedTokens;
  if (options.boost !== undefined) params["mlt.boost"] = options.boost;
  if (options.queryFields !== undefined) params["mlt.qf"] = options.queryFields;
  if (options.interestingTerms !== undefined) params["mlt.interestingTerms"] = options.interestingTerms;
}

function applyGrouping(params: Record<string, unknown>, grouping: SolrGroupingOptions): void {
  params.group = grouping.enabled ?? true;
  if (grouping.enabled === false) return;
  if (grouping.fields !== undefined) params["group.field"] = grouping.fields;
  if (grouping.functions !== undefined) params["group.func"] = grouping.functions;
  if (grouping.queries !== undefined) params["group.query"] = grouping.queries;
  if (grouping.limit !== undefined) params["group.limit"] = grouping.limit;
  if (grouping.offset !== undefined) params["group.offset"] = grouping.offset;
  if (grouping.sort !== undefined) params.sort = grouping.sort;
  if (grouping.groupSort !== undefined) params["group.sort"] = grouping.groupSort;
  if (grouping.format !== undefined) params["group.format"] = grouping.format;
  if (grouping.main !== undefined) params["group.main"] = grouping.main;
  if (grouping.numGroups !== undefined) params["group.ngroups"] = grouping.numGroups;
  if (grouping.truncate !== undefined) params["group.truncate"] = grouping.truncate;
  if (grouping.facet !== undefined) params["group.facet"] = grouping.facet;
  if (grouping.facetLimit !== undefined) params["group.facet.limit"] = grouping.facetLimit;
  if (grouping.cachePercent !== undefined) params["group.cache.percent"] = grouping.cachePercent;
}

function applyExpand(params: Record<string, unknown>, expand: SolrExpandOptions): void {
  params.expand = expand.enabled ?? true;
  if (expand.enabled === false) return;
  if (expand.field !== undefined) params["expand.field"] = expand.field;
  if (expand.sort !== undefined) params["expand.sort"] = expand.sort;
  if (expand.rows !== undefined) params["expand.rows"] = expand.rows;
  if (expand.query !== undefined) params["expand.q"] = expand.query;
  if (expand.filter !== undefined) params["expand.fq"] = expand.filter;
  if (expand.nullGroup !== undefined) params["expand.nullGroup"] = expand.nullGroup;
}

function quoteLocalParam(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function serializeCollapse(options: SolrCollapseOptions): string {
  if (options.field.trim() === "") throw new TypeError("collapse field must be a non-empty string");
  const selectors = [options.min, options.max, options.sort].filter(value => value !== undefined);
  if (selectors.length > 1) throw new TypeError("collapse accepts only one of min, max, or sort");
  if (options.min !== undefined && options.min.trim() === "") throw new TypeError("collapse min must be a non-empty string");
  if (options.max !== undefined && options.max.trim() === "") throw new TypeError("collapse max must be a non-empty string");
  if (options.sort !== undefined && options.sort.trim() === "") throw new TypeError("collapse sort must be a non-empty string");
  if (options.size !== undefined && (!Number.isInteger(options.size) || options.size < 0)) {
    throw new TypeError("collapse size must be a non-negative integer");
  }
  if (options.cost !== undefined && (!Number.isFinite(options.cost) || options.cost < 0)) {
    throw new TypeError("collapse cost must be a non-negative number");
  }

  const params = [`field=${quoteLocalParam(options.field)}`];
  if (options.min !== undefined) params.push(`min=${quoteLocalParam(options.min)}`);
  if (options.max !== undefined) params.push(`max=${quoteLocalParam(options.max)}`);
  if (options.sort !== undefined) params.push(`sort=${quoteLocalParam(options.sort)}`);
  if (options.nullPolicy !== undefined) params.push(`nullPolicy=${options.nullPolicy}`);
  if (options.hint !== undefined) params.push(`hint=${options.hint}`);
  if (options.size !== undefined) params.push(`size=${options.size}`);
  if (options.cost !== undefined) params.push(`cost=${options.cost}`);
  return `{!collapse ${params.join(" ")}}`;
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
  if (query.grouping !== undefined) applyGrouping(params, query.grouping);
  if (query.stats !== undefined) applyStats(params, query.stats);
  if (query.moreLikeThis !== undefined) applyMoreLikeThis(params, query.moreLikeThis);
  if (query.expand !== undefined) applyExpand(params, query.expand);
  if (query.spatial !== undefined) {
    const { parser, field, point, distance, cache, cost } = query.spatial;
    if (field.trim() === "") throw new TypeError("spatial field must be a non-empty string");
    if (point.trim() === "") throw new TypeError("spatial point must be a non-empty string");
    if (!Number.isFinite(distance) || distance < 0) throw new TypeError("spatial distance must be a non-negative finite number");
    const localParams = `{!${parser} sfield=${field}${cache === undefined ? "" : ` cache=${cache}`}${cost === undefined ? "" : ` cost=${cost}`}}`;
    const filters = params.fq === undefined ? [] : Array.isArray(params.fq) ? [...params.fq] : [params.fq];
    filters.push(localParams);
    params.fq = filters;
    params.pt = point;
    params.d = distance;
  }
  if (query.collapse !== undefined) {
    const filters = query.filter === undefined
      ? (Array.isArray(params.fq) ? params.fq.filter((value): value is string => typeof value === "string") : typeof params.fq === "string" ? [params.fq] : [])
      : Array.isArray(query.filter) ? query.filter.map(filter => serializeFilter(filter)) : [serializeFilter(query.filter as SolrFilter)];
    filters.push(serializeCollapse(query.collapse));
    params.fq = filters.length === 1 ? filters[0] : filters;
  }
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
  delete params.grouping;
  delete params.moreLikeThis;
  delete params.collapse;
  delete params.spatial;
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
