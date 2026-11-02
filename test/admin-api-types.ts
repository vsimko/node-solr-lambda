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
  SolrConfigPropertyMap,
  SolrConfigCommandResponse,
  SolrConfigReadResponse,
  SolrConfigOverlayResponse,
  SolrConfigValue,
  CoreAdminParams,
  CollectionAdminParams
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

const setProperty: SolrConfigCommand = { "set-property": { "query.timeout": 10_000 } };
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

const knownProperties: SolrConfigPropertyMap = {
  "query.filterCache.size": 512,
  "query.filterCache.autowarmCount": "128",
  "query.maxBooleanClauses": 2_048,
  "updateHandler.autoCommit.maxTime": 15_000,
  "updateHandler.autoCommit.openSearcher": false,
  "updateHandler.autoSoftCommit.maxTime": 1_000
};
const configCommandResponse: Promise<SolrConfigCommandResponse> = client.config({ "set-property": knownProperties });
const effectiveConfig: Promise<SolrConfigReadResponse> = client.request<SolrConfigReadResponse>("/solr/catalog/config");
const overlayConfig: Promise<SolrConfigOverlayResponse> = client.request<SolrConfigOverlayResponse>("/solr/catalog/config/overlay");
void configCommandResponse;
void effectiveConfig.then(result => {
  const maxTime: number | undefined = result.config?.updateHandler?.autoCommit?.maxTime;
  const cacheSize: number | undefined = result.config?.query?.filterCache?.size;
  void [maxTime, cacheSize];
});
void overlayConfig.then(result => {
  const overlayCacheSize: number | undefined = result.overlay?.props?.query?.filterCache?.size;
  const userProperty: SolrConfigValue | undefined = result.overlay?.userProps?.["tenant.name"];
  void [overlayCacheSize, userProperty];
});
// @ts-expect-error Cache sizes are numeric configuration values.
const invalidCacheSize: SolrConfigPropertyMap = { "query.filterCache.size": "large" };
void invalidCacheSize;

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
// @ts-expect-error set-property values must be valid JSON-compatible configuration values.
const invalidProperty: SolrConfigCommand = { "set-property": { "query.timeout": () => 5 } };
void [invalidSchema, invalidField, invalidReplaceField, invalidDeleteField, invalidHandler, invalidProperty];

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
  "collection.configName": "_default",
  waitForFinalState: true
};
const createAlias: CollectionAdminParams<"CREATEALIAS"> = {
  name: "catalog-current",
  collections: ["catalog-v1", "catalog-v2"]
};
void client.collections("CREATE", createCollection);
void client.collections("CREATEALIAS", createAlias);
void client.collections("ADDREPLICA", { collection: "catalog", shard: "shard1", type: "nrt" });
void client.collections("LIST");

// @ts-expect-error Unknown collection creation options are rejected.
const invalidCollection: CollectionAdminParams<"CREATE"> = { name: "catalog", numShards: "two" };
// @ts-expect-error Alias creation requires its target collection list.
const invalidAlias: CollectionAdminParams<"CREATEALIAS"> = { name: "catalog-current" };
// @ts-expect-error Invalid replica types are rejected.
void client.collections("ADDREPLICA", { collection: "catalog", type: "replica" });
void [invalidCollection, invalidAlias];

// @ts-expect-error CREATE requires a parameter object with a core name.
void client.coreAdmin("CREATE");
// @ts-expect-error Collections CREATE requires a parameter object with a collection name.
void client.collections("CREATE");
