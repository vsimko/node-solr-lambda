import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions, SolrMetricsParams } from "../types.js";

export function metrics<T>(
  client: SolrTransport,
  params: SolrMetricsParams = {},
  requestOptions: RequestControlOptions = {}
): Promise<T> {
  const { customParams, ...filters } = params;
  return client.request<T>("/solr/admin/metrics", {
    ...requestOptions,
    query: { ...filters, ...customParams },
    operation: "metrics"
  });
}
