import type {
  SolrClient,
  SolrSchemaCommand,
  SolrConfigCommand,
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
const addCache: SolrConfigCommand = {
  "add-cache": { name: "filterCache", class: "solr.CaffeineCache", size: 512, autowarmCount: "10%" }
};
void client.config(setProperty);
void client.config(addHandler);
void client.config(addCache);

// @ts-expect-error Unknown Schema API command names are rejected.
const invalidSchema: SolrSchemaCommand = { "add-feld": { name: "sku", type: "string" } };
// @ts-expect-error Field names and types are required for add-field.
const invalidField: SolrSchemaCommand = { "add-field": { name: "sku" } };
// @ts-expect-error Config plugin startup values are constrained.
const invalidHandler: SolrConfigCommand = { "add-requesthandler": { name: "/select", class: "solr.SearchHandler", startup: "sometimes" } };
// @ts-expect-error set-property values must be valid JSON-compatible configuration values.
const invalidProperty: SolrConfigCommand = { "set-property": { "query.timeout": () => 5 } };
void [invalidSchema, invalidField, invalidHandler, invalidProperty];

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
  routerName: "compositeId",
  configName: "_default",
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
