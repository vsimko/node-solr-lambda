import type { SolrTransport } from "../transport.js";
import type { RequestControlOptions } from "../types.js";

export function systemInfo<T>(client: SolrTransport, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>("/solr/admin/info/system", { ...requestOptions, operation: "systemInfo" });
}


export function systemProperties<T>(client: SolrTransport, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>("/solr/admin/info/properties", { ...requestOptions, operation: "systemProperties" });
}

export function systemThreads<T>(client: SolrTransport, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>("/solr/admin/info/threads", { ...requestOptions, operation: "systemThreads" });
}

export function systemLogging<T>(client: SolrTransport, requestOptions: RequestControlOptions = {}): Promise<T> {
  return client.request<T>("/solr/admin/info/logging", { ...requestOptions, operation: "systemLogging" });
}
