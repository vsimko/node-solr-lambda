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

/**
 * Build a local-params prefix, optionally followed by the parameter value.
 * Values containing whitespace, quotes, or backslashes are quoted and escaped.
 */
export function solrLocalParams(
  params: Readonly<Record<string, SolrLocalParamValue>>,
  value?: string
): string {
  const entries = Object.entries(params);
  if (entries.length === 0) throw new TypeError("At least one Solr local parameter is required");
  const prefix = `{!${entries.map(([key, item]) => `${key}=${formatLocalParamValue(item)}`).join(" ")}}`;
  return value === undefined ? prefix : prefix + value;
}
