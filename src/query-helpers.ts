import type { SolrFilterQuery } from "./types.js";

/** Sort direction accepted by Solr. Raw Solr sort expressions remain supported. */
export type SolrSortDirection = "asc" | "desc";

/** One structured sort criterion. Use expression for fields or Solr function expressions. */
export interface SolrSortClause {
  expression: string;
  direction: SolrSortDirection;
}

export type SolrSortInput = string | SolrSortClause;

/** A field-list item can be raw Solr syntax or an aliased expression. */
export type SolrFieldListEntry = string | {
  expression: string;
  alias?: string;
};

export type SolrLocalParamValue = string | number | boolean;
export type SolrFunctionArgument = string | number;

/**
 * Build a comma-separated Solr sort expression.
 * Raw strings are passed through unchanged for advanced Solr syntax.
 */
export function solrSort(...clauses: readonly SolrSortInput[]): string {
  return clauses.map(clause => typeof clause === "string"
    ? clause
    : `${clause.expression} ${clause.direction}`).join(", ");
}

/** Build a Solr field alias in the form displayName:expression. */
export function solrFieldAlias(alias: string, expression: string): string {
  return `${alias}:${expression}`;
}

/**
 * Build a comma-separated Solr field list.
 * Raw strings support wildcards, transformers, and any Solr field-list syntax.
 */
export function solrFields(...entries: readonly SolrFieldListEntry[]): string {
  return entries.map(entry => {
    if (typeof entry === "string") return entry;
    return entry.alias === undefined
      ? entry.expression
      : solrFieldAlias(entry.alias, entry.expression);
  }).join(",");
}

/** Build a Solr function call, allowing nested function expressions as string arguments. */
export function solrFunction(name: string, ...args: readonly SolrFunctionArgument[]): string {
  return `${name}(${args.join(",")})`;
}

function formatLocalParamValue(value: SolrLocalParamValue): string {
  const text = String(value);
  if (!/[\s"'\\]/.test(text)) return text;
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Build a local-params prefix, optionally followed by the parameter value. */
export function solrLocalParams(
  params: Readonly<Record<string, SolrLocalParamValue>>,
  value?: string
): string {
  const entries = Object.entries(params);
  if (entries.length === 0) throw new TypeError("At least one Solr local parameter is required");
  const prefix = `{!${entries.map(([key, item]) => `${key}=${formatLocalParamValue(item)}`).join(" ")}}`;
  return value === undefined ? prefix : prefix + value;
}

/** Join one or more Solr filter tags for use in an excludeTags parameter. */
export function solrExcludeTags(...tags: readonly string[]): string {
  return tags.join(",");
}

/** Build a tagged/cached filter query while preserving unrestricted raw filter syntax. */
export function solrFilter(query: string, options: Omit<SolrFilterQuery, "query"> = {}): string {
  const localParams: Record<string, SolrLocalParamValue> = { ...(options.localParams ?? {}) };
  if (options.tag !== undefined) {
    localParams.tag = Array.isArray(options.tag) ? options.tag.join(",") : options.tag as string;
  }
  if (options.cache !== undefined) localParams.cache = options.cache;
  if (options.cost !== undefined) localParams.cost = options.cost;
  return Object.keys(localParams).length === 0 ? query : solrLocalParams(localParams, query);
}


function assertNonEmpty(name: string, value: string): void {
  if (value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
}

/** Common options for Solr's geofilt and bbox query parsers. */
export interface SolrSpatialFilterOptions {
  field: string;
  /** Center point; use latitude,longitude for geodetic fields. */
  point: string;
  /** Radius in the field's configured distance units. */
  distance: number;
  cache?: boolean;
  cost?: number;
  localParams?: Readonly<Record<string, SolrLocalParamValue>>;
}

function spatialFilter(parser: "geofilt" | "bbox", options: SolrSpatialFilterOptions): string {
  assertNonEmpty("spatial field", options.field);
  assertNonEmpty("spatial point", options.point);
  if (!Number.isFinite(options.distance) || options.distance < 0) {
    throw new TypeError("spatial distance must be a non-negative finite number");
  }
  const params: Record<string, SolrLocalParamValue> = { ...(options.localParams ?? {}), sfield: options.field };
  if (options.cache !== undefined) params.cache = options.cache;
  if (options.cost !== undefined) params.cost = options.cost;
  const serialized = Object.entries(params).map(([key, value]) => `${key}=${formatLocalParamValue(value)}`).join(" ");
  return `{!${parser} ${serialized} pt=${formatLocalParamValue(options.point)} d=${options.distance}}`;
}

/** Build Solr's circular geofilt filter expression. */
export function solrGeofilt(options: SolrSpatialFilterOptions): string {
  return spatialFilter("geofilt", options);
}

/** Build Solr's bbox rectangular-approximation filter expression. */
export function solrBbox(options: SolrSpatialFilterOptions): string {
  return spatialFilter("bbox", options);
}

/** Build Solr's geodist function expression for sorting or scoring. */
export function solrGeoDistance(field?: string, latitude?: number, longitude?: number): string {
  if (field !== undefined) assertNonEmpty("spatial field", field);
  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new TypeError("latitude and longitude must be supplied together");
  }
  if (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    throw new TypeError("latitude must be between -90 and 90");
  }
  if (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    throw new TypeError("longitude must be between -180 and 180");
  }
  const args = [field, latitude, longitude].filter(value => value !== undefined);
  return `geodist(${args.join(",")})`;
}
