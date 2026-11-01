import type { SolrAuth, SolrClientConfig, SolrRequestDefaults, SolrRetryPolicy } from "../src/index.js";

const basicAuth: SolrAuth = { type: "basic", username: "reader", password: "secret" };
const bearerAuth: SolrAuth = { type: "bearer", token: "token" };
const defaults: SolrRequestDefaults = {
  params: { wt: "json", rows: 20, fq: ["active:true", "public:true"] },
  headers: { "x-client": "catalog" }
};
const retry: SolrRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 1000,
  retryableStatuses: [429, 503],
  methods: ["GET", "PUT"],
  retryNetworkErrors: true
};
const config: SolrClientConfig = {
  baseUrl: "https://solr.example/proxy/solr",
  collection: "catalog",
  auth: bearerAuth,
  requestDefaults: defaults,
  retry,
  timeoutMs: 5000
};

void basicAuth;
void config;
