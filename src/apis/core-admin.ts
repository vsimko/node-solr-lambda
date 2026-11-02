import type { SolrTransport } from "../transport.js";
import type { CoreAdminAction, CoreAdminParams, RequestControlOptions } from "../types.js";

/** Execute a Core Admin action with action-specific request parameters. */
export function coreAdmin<T, A extends CoreAdminAction>(
  client: SolrTransport,
  action: A,
  params: CoreAdminParams<A> = {} as CoreAdminParams<A>,
  requestOptions: RequestControlOptions = {}
): Promise<T> {
  const { customParams, ...actionParams } = params as CoreAdminParams<A> & { customParams?: Record<string, string | number | boolean> };
  return client.request<T>("/solr/admin/cores", {
    ...requestOptions,
    query: { action, ...actionParams, ...customParams },
    operation: "coreAdmin"
  });
}
