import type {
  SolrClient,
  SolrSchemaCommand,
  SolrSchemaFieldType,
  SolrSchemaDynamicField,
  SolrSchemaCopyField,
  SolrSchemaCommandResponse,
  SolrSchemaReadResponse,
  SolrSchemaFieldsResponse,
  SolrSchemaDynamicFieldsResponse,
  SolrSchemaFieldTypesResponse,
  SolrSchemaCopyFieldsResponse,
  SolrSchemaNameResponse,
  SolrSchemaVersionResponse,
  SolrSchemaUniqueKeyResponse,
  SolrSchemaSimilarityResponse,
  SolrConfigCommand,
  SolrConfigPropertyName,
  SolrConfigReadResponse,
  SolrConfigOverlayResponse,
  SolrConfigCommandResponse,
  SolrConfigParameterMap,
  SolrConfigRequestHandlerParams,
  SolrConfigRequestHandlerSettings,
  SolrConfigResponseWriterSettings,
  SolrConfigListenerSettings,
  SolrConfigListenerEvent,
  CoreAdminParams,
  CoreRequestStatusParams,
  CoreRequestRecoveryParams,
  CoreAdminStatusResponse,
  CollectionAdminParams,
  CollectionAdminResponse,
  SolrCollectionListResponse,
  SolrCollectionAdminResponse,
  SolrCollectionReplicaResponse,
  SolrCollectionRoleResponse,
  SolrMetricValue,
  SolrMetricsRegistry,
  SolrMetricsJsonResponse,
  SolrMetricsResponse
} from "../src/index.js";

declare const client: SolrClient;

const addField: SolrSchemaCommand = {
  "add-field": { name: "sku", type: "string", stored: true, indexed: true, docValues: true }
};
const replaceField: SolrSchemaCommand = {
  "replace-field": { name: "price_d", type: "pdouble", stored: true, docValues: true }
};
const addFieldType: SolrSchemaCommand = {
  "add-field-type": {
    name: "text_en",
    class: "solr.TextField",
    analyzer: {
      tokenizer: { class: "solr.StandardTokenizerFactory" },
      filters: [{ class: "solr.LowerCaseFilterFactory" }]
    }
  }
};
void client.schema(addField);
void client.schema(replaceField);
void client.schema(addFieldType);

const replaceFieldType: SolrSchemaCommand = {
  "replace-field-type": {
    name: "text_en",
    class: "solr.TextField",
    indexAnalyzer: { tokenizer: { class: "solr.StandardTokenizerFactory" } },
    queryAnalyzer: { tokenizer: { class: "solr.KeywordTokenizerFactory" } },
    similarity: { class: "solr.SchemaSimilarityFactory" }
  }
};
const deleteFieldType: SolrSchemaCommand = { "delete-field-type": { name: "text_en" } };
void client.schema(replaceFieldType);
void client.schema(deleteFieldType);
const fieldTypeDefinition: SolrSchemaFieldType = {
  name: "text_de",
  class: "solr.TextField",
  analyzer: {
    tokenizer: { class: "solr.StandardTokenizerFactory" },
    filters: [{ class: "solr.LowerCaseFilterFactory" }]
  }
};
void client.schema({ "add-field-type": fieldTypeDefinition });
// @ts-expect-error Analyzer tokenizers require a plugin class.
const invalidFieldType: SolrSchemaCommand = { "add-field-type": { name: "invalid_text", class: "solr.TextField", analyzer: { tokenizer: {} } } };
void invalidFieldType;

const addDynamicField: SolrSchemaCommand = {
  "add-dynamic-field": { name: "*_sku", type: "string", stored: true, indexed: true }
};
const addCopyField: SolrSchemaCommand = {
  "add-copy-field": { source: "title", dest: ["text", "catchall"], maxChars: 256 }
};
void client.schema(addDynamicField);
void client.schema(addCopyField);

const replaceDynamicField: SolrSchemaCommand = {
  "replace-dynamic-field": { name: "*_sku", type: "text_general", stored: true, indexed: true }
};
const deleteDynamicField: SolrSchemaCommand = { "delete-dynamic-field": { name: "*_sku" } };
const deleteCopyField: SolrSchemaCommand = {
  "delete-copy-field": { source: "title", dest: "text" }
};
const dynamicFieldDefinition: SolrSchemaDynamicField = {
  name: "sku_*",
  type: "string",
  stored: true,
  indexed: true
};
const copyFieldDefinition: SolrSchemaCopyField = {
  source: "title",
  dest: ["text", "catchall"],
  maxChars: 128
};
void client.schema(replaceDynamicField);
void client.schema(deleteDynamicField);
void client.schema(deleteCopyField);
void client.schema({ "add-dynamic-field": dynamicFieldDefinition });
void client.schema({ "add-copy-field": copyFieldDefinition });
// @ts-expect-error Dynamic field definitions require a matching pattern and field type.
const invalidDynamicField: SolrSchemaCommand = { "add-dynamic-field": { name: "sku_*" } };
// @ts-expect-error Copy-field deletion requires both source and destination.
const invalidCopyDelete: SolrSchemaCommand = { "delete-copy-field": { source: "title" } };
void [invalidDynamicField, invalidCopyDelete];

const commandResponse: Promise<SolrSchemaCommandResponse> = client.schema(addField);
void commandResponse.then(result => {
  const status: number | undefined = result.responseHeader?.status;
  const qTime: number | undefined = result.responseHeader?.QTime;
  void [status, qTime];
});

const fullSchema: Promise<SolrSchemaReadResponse> = client.request<SolrSchemaReadResponse>("/solr/catalog/schema");
const fields: Promise<SolrSchemaFieldsResponse> = client.request<SolrSchemaFieldsResponse>("/solr/catalog/schema/fields");
const dynamicFields: Promise<SolrSchemaDynamicFieldsResponse> = client.request<SolrSchemaDynamicFieldsResponse>("/solr/catalog/schema/dynamicfields");
const fieldTypes: Promise<SolrSchemaFieldTypesResponse> = client.request<SolrSchemaFieldTypesResponse>("/solr/catalog/schema/fieldtypes");
const copyFields: Promise<SolrSchemaCopyFieldsResponse> = client.request<SolrSchemaCopyFieldsResponse>("/solr/catalog/schema/copyfields");
const schemaName: Promise<SolrSchemaNameResponse> = client.request<SolrSchemaNameResponse>("/solr/catalog/schema/name");
const schemaVersion: Promise<SolrSchemaVersionResponse> = client.request<SolrSchemaVersionResponse>("/solr/catalog/schema/version");
const uniqueKey: Promise<SolrSchemaUniqueKeyResponse> = client.request<SolrSchemaUniqueKeyResponse>("/solr/catalog/schema/uniquekey");
const similarity: Promise<SolrSchemaSimilarityResponse> = client.request<SolrSchemaSimilarityResponse>("/solr/catalog/schema/similarity");
void [fullSchema, fields, dynamicFields, fieldTypes, copyFields, schemaName, schemaVersion, uniqueKey, similarity];

const setProperty: SolrConfigCommand = { "set-property": { "query.maxBooleanClauses": 10_000, "updateHandler.autoCommit.openSearcher": false, "query.filterCache.autowarmCount": "25%" } };
const unsetProperty: SolrConfigCommand = { "unset-property": ["query.maxBooleanClauses", "updateHandler.autoCommit.maxTime"] };
const setUserProperty: SolrConfigCommand = { "set-user-property": { "tenant.default": "public", "tenant.options": { enabled: true, aliases: ["books", "journals"] } } };
const configRead: Promise<SolrConfigReadResponse> = client.request<SolrConfigReadResponse>("/solr/catalog/config");
const overlayRead: Promise<SolrConfigOverlayResponse> = client.request<SolrConfigOverlayResponse>("/solr/catalog/config/overlay");
const commandResult: Promise<SolrConfigCommandResponse> = client.config(setProperty);
void [unsetProperty, setUserProperty, configRead, overlayRead, commandResult];
void configRead.then(result => {
  const maxDocs: number | undefined = result.config?.updateHandler?.autoCommit?.maxDocs;
  const cacheSize: number | undefined = result.config?.query?.filterCache?.size;
  const handlerClass: string | undefined = result.config?.requestHandler?.["/select"]?.class;
  void [maxDocs, cacheSize, handlerClass];
});
const commonProperty: SolrConfigPropertyName = "query.maxBooleanClauses";
const handlerParams: SolrConfigRequestHandlerParams = {
  q: "*:*",
  fq: ["tenant:public", "status:active"],
  fl: "id,title",
  rows: 25,
  start: 0,
  wt: "json",
  echoParams: "explicit",
  customPluginParam: { enabled: true }
};
const openPluginParams: SolrConfigParameterMap = { pluginFlag: true, pluginOptions: ["one", "two"] };
const requestHandlerRead: SolrConfigRequestHandlerSettings = {
  class: "solr.SearchHandler",
  defaults: handlerParams,
  components: ["query", "facet"]
};
const responseWriterRead: SolrConfigResponseWriterSettings = {
  class: "solr.JSONResponseWriter",
  contentType: "application/json",
  charset: "UTF-8"
};
const listenerRead: SolrConfigListenerSettings = {
  class: "solr.QuerySenderListener",
  event: "postCommit"
};
const listenerEvent: SolrConfigListenerEvent = "newSearcher";
void [commonProperty, handlerParams, openPluginParams, requestHandlerRead, responseWriterRead, listenerRead, listenerEvent];
// @ts-expect-error Common property names are a documented allow-list; misspellings are rejected.
const invalidConfigProperty: SolrConfigCommand = { "set-property": { "query.maxBooleanClause": 100 } };
// @ts-expect-error Numeric Config API properties do not accept booleans.
const invalidConfigValue: SolrConfigCommand = { "set-property": { "query.maxBooleanClauses": true } };
// @ts-expect-error unset-property only accepts known common Config API property names.
const invalidUnsetProperty: SolrConfigCommand = { "unset-property": "query.notARealSetting" };
void [invalidConfigProperty, invalidConfigValue, invalidUnsetProperty];
const addHandler: SolrConfigCommand = {
  "add-requesthandler": {
    name: "/select",
    class: "solr.SearchHandler",
    startup: "lazy",
    defaults: { rows: 20, wt: "json" },
    appends: { fq: "tenant:public" },
    useParams: ["public-search"]
  }
};
const addListener: SolrConfigCommand = {
  "add-listener": {
    name: "reload-listener",
    event: "newSearcher",
    class: "example.ReloadListener",
    customOptions: { enabled: true, priority: 10 }
  }
};
const addInitParams: SolrConfigCommand = {
  "add-initparams": { name: "shared-search-params", path: ["/select", "/query"], defaults: { rows: 20, wt: "json" } }
};
void client.config(setProperty);
void client.config(addHandler);
void client.config(addListener);
void client.config(addInitParams);

// @ts-expect-error Unknown Schema API command names are rejected.
const invalidSchema: SolrSchemaCommand = { "add-feld": { name: "sku", type: "string" } };
// @ts-expect-error Field names and types are required for add-field.
const invalidField: SolrSchemaCommand = { "add-field": { name: "sku" } };
// @ts-expect-error replace-field also requires the complete field definition.
const invalidReplaceField: SolrSchemaCommand = { "replace-field": { name: "sku", stored: false } };
// @ts-expect-error delete-field requires a field name.
const invalidDeleteField: SolrSchemaCommand = { "delete-field": {} };
// @ts-expect-error Config plugin startup values are constrained.
const invalidHandler: SolrConfigCommand = { "add-requesthandler": { name: "/select", class: "solr.SearchHandler", startup: "sometimes" } };
// @ts-expect-error Common request-handler row limits are numeric.
const invalidHandlerRows: SolrConfigCommand = { "add-requesthandler": { name: "/select", class: "solr.SearchHandler", defaults: { rows: "many" } } };
// @ts-expect-error Standard echoParams values are constrained.
const invalidEchoParams: SolrConfigRequestHandlerParams = { echoParams: "sometimes" };
// @ts-expect-error set-property values must be valid JSON-compatible configuration values.
const invalidProperty: SolrConfigCommand = { "set-property": { "query.timeout": () => 5 } };
void [invalidSchema, invalidField, invalidReplaceField, invalidDeleteField, invalidHandler, invalidHandlerRows, invalidEchoParams, invalidProperty];

const createCore: CoreAdminParams<"CREATE"> = {
  name: "catalog",
  instanceDir: "catalog",
  configSet: "_default",
  dataDir: "data/catalog",
  customParams: { loadOnStartup: true }
};
const splitCore: CoreAdminParams<"SPLIT"> = {
  core: "catalog",
  splitKey: "tenant!books",
  ranges: "80000000-ffffffff"
};
void client.coreAdmin("CREATE", createCore);
void client.coreAdmin("SPLIT", splitCore);
void client.coreAdmin("STATUS", { core: "catalog", indexInfo: true });

// @ts-expect-error Core CREATE requires the core name.
const invalidCore: CoreAdminParams<"CREATE"> = { instanceDir: "catalog" };
// @ts-expect-error Core action options are action-specific.
const invalidReload: CoreAdminParams<"RELOAD"> = { core: "catalog", other: "other" };
void [invalidCore, invalidReload];

const createCollection: CollectionAdminParams<"CREATE"> = {
  name: "catalog",
  numShards: 2,
  replicationFactor: 2,
  "router.name": "compositeId",
  "router.field": "tenant_s",
  "collection.configName": "_default",
  nrtReplicas: 2,
  tlogReplicas: 1,
  pullReplicas: 1,
  createNodeSet: "node1,node2",
  "createNodeSet.shuffle": false,
  perReplicaState: true,
  waitForFinalState: true,
  alias: "catalog-current",
  customParams: { "property.dataDir": "/var/solr/catalog" }
};
const implicitCollection: CollectionAdminParams<"CREATE"> = {
  name: "catalog-implicit",
  "router.name": "implicit",
  shards: ["catalog-a", "catalog-b"],
  replicationFactor: 0,
  createNodeSet: "EMPTY"
};
// Solr 8.11 legacy placement options; not supported by Solr 9+.
const legacyPlacementCollection: CollectionAdminParams<"CREATE"> = {
  name: "catalog-legacy-placement",
  numShards: 1,
  rule: ["replica:<2", "freedisk:>10"],
  snitch: ["class:example.ZoneSnitch"],
  policy: "legacy-policy",
  withCollection: "catalog-metadata"
};
const createAlias: CollectionAdminParams<"CREATEALIAS"> = {
  name: "catalog-current",
  collections: ["catalog-v1", "catalog-v2"]
};
void client.collections("CREATE", createCollection);
void client.collections("CREATE", implicitCollection);
void client.collections("CREATE", legacyPlacementCollection);
void client.collections("CREATEALIAS", createAlias);
void client.collections("ADDREPLICA", { collection: "catalog", shard: "shard1", type: "nrt" });
void client.collections("LIST");
const collectionListResponse: Promise<SolrCollectionListResponse> = client.collections("LIST");
const collectionListNames: Promise<readonly string[] | undefined> = collectionListResponse.then(result => result.collections);
const collectionCreateResponse: Promise<SolrCollectionAdminResponse> = client.collections("CREATE", { name: "typed-catalog" });
const collectionDeleteResponse: Promise<SolrCollectionAdminResponse> = client.collections("DELETE", { name: "typed-catalog" });
const replicaAddResponse: Promise<SolrCollectionReplicaResponse> = client.collections("ADDREPLICA", { collection: "catalog", shard: "shard1", type: "nrt" });
const replicaMoveResponse: Promise<SolrCollectionReplicaResponse> = client.collections("MOVEREPLICA", { collection: "catalog", replica: "core_node2", targetNode: "node2:8983_solr" });
const roleAddResponse: Promise<SolrCollectionRoleResponse> = client.collections("ADDROLE", { node: "node1:8983_solr", role: "overseer" });
const listActionResponse: Promise<CollectionAdminResponse<"LIST">> = client.collections("LIST");
void [collectionListNames, collectionCreateResponse, collectionDeleteResponse, replicaAddResponse, replicaMoveResponse, roleAddResponse, listActionResponse];

// @ts-expect-error Unknown collection creation options are rejected.
const invalidCollection: CollectionAdminParams<"CREATE"> = { name: "catalog", numShards: "two" };
// @ts-expect-error The V1 createNodeSet.shuffle option is boolean.
const invalidShuffle: CollectionAdminParams<"CREATE"> = { name: "catalog", "createNodeSet.shuffle": "false" };
// @ts-expect-error Alias creation requires its target collection list.
const invalidAlias: CollectionAdminParams<"CREATEALIAS"> = { name: "catalog-current" };
// @ts-expect-error Invalid replica types are rejected.
void client.collections("ADDREPLICA", { collection: "catalog", type: "replica" });
void [invalidCollection, invalidShuffle, invalidAlias];

// @ts-expect-error CREATE requires a parameter object with a core name.
void client.coreAdmin("CREATE");
// @ts-expect-error Collections CREATE requires a parameter object with a collection name.
void client.collections("CREATE");


const typedConfigRead: Promise<SolrConfigReadResponse> = client.getConfig();
const typedConfigOverlay: Promise<SolrConfigOverlayResponse> = client.getConfigOverlay();
void [typedConfigRead, typedConfigOverlay];

const minimalCoreStatus: CoreAdminStatusResponse = {
  status: { catalog: { name: "catalog" } }
};
const detailedCoreStatus: CoreAdminStatusResponse = {
  responseHeader: { status: 0, QTime: 1 },
  initFailures: {},
  status: {
    catalog: {
      name: "catalog",
      instanceDir: "/var/solr/catalog",
      dataDir: "/var/solr/catalog/data",
      config: "solrconfig.xml",
      schema: "managed-schema",
      startTime: "2026-11-03T05:00:00Z",
      uptime: 1000,
      index: { numDocs: 10, maxDoc: 10, numSegments: 1, sizeInBytes: 1024 },
      extraMetadata: "forward-compatible"
    }
  }
};
const statusRequest: Promise<CoreAdminStatusResponse> = client.coreAdmin("STATUS", { core: "catalog", indexInfo: true });
const coreCreateResponse = client.coreAdmin("CREATE", { name: "catalog" });
const coreReloadResponse = client.coreAdmin("RELOAD", { core: "catalog" });
const coreCommandResponse: Promise<import("../src/index.js").CoreAdminCommandResponse> = coreCreateResponse;
void [coreReloadResponse, coreCommandResponse];
void statusRequest.then(result => {
  const coreName: string | undefined = result.status?.catalog?.name;
  const dataDir: string | undefined = result.status?.catalog?.dataDir;
  const documentCount: number | undefined = result.status?.catalog?.index?.numDocs;
  void [coreName, dataDir, documentCount];
});
void [minimalCoreStatus, detailedCoreStatus];


const coreRequestStatus: CoreRequestStatusParams = { requestid: "core-job-42" };
const coreRequestRecovery: CoreRequestRecoveryParams = { core: "catalog_shard1_replica1" };
void client.coreAdmin("REQUESTSTATUS", coreRequestStatus);
void client.coreAdmin("REQUESTRECOVERY", coreRequestRecovery);
// @ts-expect-error REQUESTSTATUS requires the asynchronous request ID.
void client.coreAdmin("REQUESTSTATUS", {});
// @ts-expect-error REQUESTRECOVERY requires a core name.
void client.coreAdmin("REQUESTRECOVERY", {});


const metricsJson: Promise<SolrMetricsResponse> = client.metrics({ group: ["jvm", "node"], registry: "solr.core.catalog", prefix: "QUERY", regex: ".*requests.*" });
const metricsText: Promise<string> = client.metrics<string>({ group: "jvm", wt: "prometheus" });
const metricValue: SolrMetricValue = { count: 2, samples: [1, 2], active: true };
const metricRegistry: SolrMetricsRegistry = { "QUERY./select.requests": metricValue };
const metricsEnvelope: SolrMetricsJsonResponse = { metrics: { "solr.core.catalog": metricRegistry } };
const metricNames: string[] = Object.keys(metricsEnvelope.metrics?.["solr.core.catalog"] ?? {});
void [metricsJson, metricsText, metricValue, metricRegistry, metricNames];

// @ts-expect-error Metrics groups are strings or arrays of strings.
void client.metrics({ group: 42 });
// @ts-expect-error The Metrics API writer is JSON or Prometheus.
void client.metrics({ wt: "xml" });


import type { SolrSystemInfoResponse, SolrSystemPropertiesResponse, SolrSystemThreadsResponse, SolrSystemLoggingResponse } from "../src/index.js";
const systemInfo: Promise<SolrSystemInfoResponse> = client.systemInfo();
const systemProperties: Promise<SolrSystemPropertiesResponse> = client.systemProperties();
const systemThreads: Promise<SolrSystemThreadsResponse> = client.systemThreads();
const systemLogging: Promise<SolrSystemLoggingResponse> = client.systemLogging();
void Promise.all([systemInfo, systemProperties, systemThreads, systemLogging]).then(([info, properties, threads, logging]) => {
  const mode: string | undefined = info.mode;
  const javaVersion: string | number | boolean | null | undefined = properties.properties?.["java.version"];
  const dump = threads.system?.threadDump;
  const loggers = logging.loggers;
  void [mode, javaVersion, dump, loggers];
});

import type { SolrAuthorizationCommand, SolrAuthorizationPermission, SolrAuthorizationResponse } from "../src/index.js";
declare const authorizationClient: SolrClient;
const authorizationRead: Promise<SolrAuthorizationResponse> = authorizationClient.security("authorization");
void authorizationRead.then(result => {
  const pluginClass: string | undefined = result.authorization?.class;
  const role: string | readonly string[] | undefined = result.authorization?.["user-role"]?.alice;
  const permission: SolrAuthorizationPermission | undefined = result.authorization?.permissions?.[0];
  const permissionName: string | undefined = permission?.name;
  void [pluginClass, role, permissionName];
});
const setRoles: SolrAuthorizationCommand = { "set-user-role": { alice: ["admin", "dev"], guest: null } };
const setPermission: SolrAuthorizationCommand = { "set-permission": { name: "catalog-read", collection: "catalog", path: ["/select", "/query"], method: ["GET", "POST"], params: { action: ["LIST", "CLUSTERSTATUS"] }, role: ["admin", "reader"], pluginExtension: { enabled: true } } };
const updatePermission: SolrAuthorizationCommand = { "update-permission": { index: 1, role: "admin" } };
const deletePermission: SolrAuthorizationCommand = { "delete-permission": 3 };
void [setRoles, setPermission, updatePermission, deletePermission];
void authorizationClient.security("authorization", setRoles);
void authorizationClient.security("authorization", setPermission);
void authorizationClient.security("authorization", updatePermission);
void authorizationClient.security("authorization", deletePermission);
void authorizationClient.security("authentication", { "set-property": { realm: "Solr" } });
// @ts-expect-error Permission updates require a numeric index.
const invalidPermissionUpdate: SolrAuthorizationCommand = { "update-permission": { role: "admin" } };
// @ts-expect-error User roles are strings, arrays of strings, or null to clear a user mapping.
const invalidRoleMapping: SolrAuthorizationCommand = { "set-user-role": { alice: 42 } };
// @ts-expect-error Permission deletion uses the existing permission numeric index.
const invalidPermissionDelete: SolrAuthorizationCommand = { "delete-permission": "read" };
// @ts-expect-error Built-in permission creation requires an explicit role assignment.
const invalidPermission: SolrAuthorizationCommand = { "set-permission": { name: "catalog-read" } };
void [invalidPermissionUpdate, invalidRoleMapping, invalidPermissionDelete, invalidPermission];

import type { SolrAuthenticationCommand, SolrAuthenticationResponse, SolrBasicAuthConfig } from "../src/index.js";
declare const authenticationClient: SolrClient;
const authenticationRead: Promise<SolrAuthenticationResponse> = authenticationClient.security("authentication");
void authenticationRead.then(result => {
  const pluginClass: string | undefined = result.authentication?.class;
  const realm: string | undefined = result.authentication?.realm;
  const blocked: boolean | undefined = result.authentication?.blockUnknown;
  const hashedCredential: string | undefined = result.authentication?.credentials?.admin;
  const config: SolrBasicAuthConfig | undefined = result.authentication;
  void [pluginClass, realm, blocked, hashedCredential, config];
});
const setUsers: SolrAuthenticationCommand = { "set-user": { alice: "password-1", bob: "password-2" } };
const deleteUsers: SolrAuthenticationCommand = { "delete-user": ["alice", "bob"] };
const setProperties: SolrAuthenticationCommand = { "set-property": { blockUnknown: true, realm: "Solr", forwardCredentials: false } };
const multiAuthUser: SolrAuthenticationCommand = { "set-user": { basic: { alice: "password-1" } } };
const multiAuthProperty: SolrAuthenticationCommand = { "set-property": { basic: { realm: "Basic realm" } } };
void [setUsers, deleteUsers, setProperties, multiAuthUser, multiAuthProperty];
void authenticationClient.security("authentication", setUsers);
void authenticationClient.security("authentication", deleteUsers);
void authenticationClient.security("authentication", setProperties);
// @ts-expect-error set-user values must be passwords or MultiAuth scheme maps.
const invalidSetUser: SolrAuthenticationCommand = { "set-user": { alice: 42 } };
// @ts-expect-error delete-user requires a list of user IDs.
const invalidDeleteUser: SolrAuthenticationCommand = { "delete-user": "alice" };
// @ts-expect-error BasicAuth blockUnknown is boolean.
const invalidAuthProperty: SolrAuthenticationCommand = { "set-property": { blockUnknown: "yes" } };
void [invalidSetUser, invalidDeleteUser, invalidAuthProperty];

import type { SolrClusterStatusResponse, SolrCollectionAliasesResponse, SolrCollectionAliasResponse } from "../src/index.js";
declare const collectionClient: SolrClient;
const aliasList: Promise<SolrCollectionAliasesResponse> = collectionClient.collections("LISTALIASES");
const clusterStatus: Promise<SolrClusterStatusResponse> = collectionClient.collections("CLUSTERSTATUS", { collection: "books" });
const aliasCreate: Promise<SolrCollectionAliasResponse> = collectionClient.collections("CREATEALIAS", { name: "books-current", collections: ["books-v1", "books-v2"] });
const aliasDelete: Promise<SolrCollectionAliasResponse> = collectionClient.collections("DELETEALIAS", { name: "books-current" });
void [aliasList, clusterStatus, aliasCreate, aliasDelete];
void clusterStatus.then(result => {
  const liveNodes: readonly string[] | undefined = result.cluster?.live_nodes;
  const aliases: Readonly<Record<string, string>> | undefined = result.cluster?.aliases;
  const replicaState: string | undefined = result.cluster?.collections?.books?.shards?.shard1?.replicas?.core_node1?.state;
  const leader: boolean | string | undefined = result.cluster?.collections?.books?.shards?.shard1?.replicas?.core_node1?.leader;
  void [liveNodes, aliases, replicaState, leader];
});
// @ts-expect-error CREATEALIAS requires both the alias name and target collections.
void collectionClient.collections("CREATEALIAS", { name: "books-current" });
// @ts-expect-error CLUSTERSTATUS collection filters must be strings.
void collectionClient.collections("CLUSTERSTATUS", { collection: 42 });

const collectionReload = collectionClient.collections("RELOAD", { name: "books" });
const collectionModify = collectionClient.collections("MODIFYCOLLECTION", {
  collection: "books",
  replicationFactor: 2,
  readOnly: true,
  autoAddReplicas: false,
  maxShardsPerNode: 4
});
const addNodeRole = collectionClient.collections("ADDROLE", { node: "solr-node-1:8983_solr", role: "overseer" });
const removeNodeRole = collectionClient.collections("REMOVEROLE", { node: "solr-node-1:8983_solr", role: "overseer" });
void [collectionReload, collectionModify, addNodeRole, removeNodeRole];
// @ts-expect-error RELOAD requires a collection name.
void collectionClient.collections("RELOAD", {});
// @ts-expect-error MODIFYCOLLECTION replicationFactor must be numeric.
void collectionClient.collections("MODIFYCOLLECTION", { collection: "books", replicationFactor: "two" });
// @ts-expect-error ADDROLE requires a string role.
void collectionClient.collections("ADDROLE", { node: "solr-node-1:8983_solr", role: 42 });
// @ts-expect-error REMOVEROLE requires a node.
void collectionClient.collections("REMOVEROLE", { role: "overseer" });
