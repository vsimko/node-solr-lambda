import type { SolrClient } from "../../src/client.js";

/**
 * Fetch Solr's experimental self-description for one V2 resource.
 * The result is intentionally open-ended: introspection is discovery evidence,
 * not a source from which this package generates public TypeScript declarations.
 */
export interface SolrV2IntrospectionDocument {
  readonly [key: string]: unknown;
}

export async function fetchV2Introspection(
  client: Pick<SolrClient, "v2">,
  apiPath: `/api/${string}`
): Promise<SolrV2IntrospectionDocument> {
  const resourcePath = apiPath.replace(/\/+$/, "");
  if (resourcePath === "/api") {
    throw new TypeError("A V2 resource path below /api is required for introspection");
  }
  return client.v2.request<SolrV2IntrospectionDocument>(
    `${resourcePath}/_introspect` as `/api/${string}`
  );
}
