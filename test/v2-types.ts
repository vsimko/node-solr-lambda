import { createSolrClient, SolrV2Client } from "../src/index.js";
import type { RequestOptions } from "../src/index.js";

const client = createSolrClient();
const namespace: SolrV2Client = client.v2;
const requestOptions: RequestOptions = { method: "POST", body: { create: { name: "books" } } };
const response: Promise<{ responseHeader?: { status?: number } }> =
  namespace.request("/api/cores", requestOptions);
const rawResponse: Promise<Response> = namespace.requestRaw("/api/cores", { method: "GET" });
void [response, rawResponse];

// @ts-expect-error V2 routes must use the explicit /api/ prefix.
void namespace.request("/solr/admin/cores");
// @ts-expect-error Only the HTTP methods supported by the shared transport are accepted.
void namespace.request("/api/cores", { method: "PATCH" });

import type {
  SolrV2CoreOperationResponse,
  SolrV2CoreStatusResponse,
  SolrV2CoreRenameParams,
  SolrV2CoreUnloadParams
} from "../src/index.js";

const v2Status: Promise<SolrV2CoreStatusResponse> = client.v2.coreAdmin.list({ indexInfo: false });
const oneCore: Promise<SolrV2CoreStatusResponse> = client.v2.coreAdmin.status("books");
const reloaded: Promise<SolrV2CoreOperationResponse> = client.v2.coreAdmin.reload("books");
const renameParams: SolrV2CoreRenameParams = { to: "books-archive" };
const renamed: Promise<SolrV2CoreOperationResponse> = client.v2.coreAdmin.rename("books", renameParams);
const unloadParams: SolrV2CoreUnloadParams = { deleteIndex: true };
const unloaded: Promise<SolrV2CoreOperationResponse> = client.v2.coreAdmin.unload("books", unloadParams);
void [v2Status, oneCore, reloaded, renamed, unloaded];

// @ts-expect-error rename requires the V2 to field.
void client.v2.coreAdmin.rename("books", {});
// @ts-expect-error indexInfo is boolean.
void client.v2.coreAdmin.list({ indexInfo: "false" });

import type {
  SolrV2CollectionListResponse,
  SolrV2CollectionStatusOptions,
  SolrV2CollectionStatusResponse,
  SolrV2ClusterStatusResponse,
  SolrV2CollectionsClient,
  SolrV2ClusterClient
} from "../src/index.js";

const collectionsNamespace: SolrV2CollectionsClient = client.v2.collections;
const clusterNamespace: SolrV2ClusterClient = client.v2.cluster;
const collectionList: Promise<SolrV2CollectionListResponse> = collectionsNamespace.list();
const collectionStatusOptions: SolrV2CollectionStatusOptions = {
  coreInfo: true,
  segments: false,
  fieldInfo: true,
  sizeInfo: false
};
const collectionStatus: Promise<SolrV2CollectionStatusResponse> =
  collectionsNamespace.status("books", collectionStatusOptions);
const clusterStatus: Promise<SolrV2ClusterStatusResponse> = clusterNamespace.status();
import type {
  SolrV2CollectionCreateParams,
  SolrV2CollectionDeleteOptions,
  SolrV2CollectionOperationResponse
} from "../src/index.js";
const createParams: SolrV2CollectionCreateParams = {
  name: "books", config: "books-config", numShards: 2, replicationFactor: 2
};
const deleteOptions: SolrV2CollectionDeleteOptions = { deleteIndex: true };
const createdCollection: Promise<SolrV2CollectionOperationResponse> =
  collectionsNamespace.create(createParams);
const deletedCollection: Promise<SolrV2CollectionOperationResponse> =
  collectionsNamespace.delete("books", deleteOptions);
const reloadedCollection: Promise<SolrV2CollectionOperationResponse> =
  collectionsNamespace.reload("books");
void [createdCollection, deletedCollection, reloadedCollection];
// @ts-expect-error Collection creation requires a configset name.
void collectionsNamespace.create({ name: "books" });
// @ts-expect-error Destructive directory flags are boolean.
void collectionsNamespace.delete("books", { deleteIndex: "true" });

void [collectionList, collectionStatus, clusterStatus];

// @ts-expect-error Collection status flags are booleans.
void collectionsNamespace.status("books", { coreInfo: "true" });

import type { SolrV2AliasesClient, SolrV2AliasListResponse, SolrV2AliasStatusResponse } from "../src/index.js";
const aliasesNamespace: SolrV2AliasesClient = client.v2.aliases;
const aliases: Promise<SolrV2AliasListResponse> = aliasesNamespace.list();
const alias: Promise<SolrV2AliasStatusResponse> = aliasesNamespace.status("books_alias");
void [aliases, alias];
// @ts-expect-error Alias names must be strings.
void aliasesNamespace.status(123);
import type {
  SolrV2AliasCreateParams,
  SolrV2AliasMutationOptions,
  SolrV2AliasOperationResponse,
  SolrV2AliasPropertiesResponse,
  SolrV2AliasPropertyResponse,
  SolrV2AliasPropertyValue,
  SolrV2AliasSetPropertiesParams,
  SolrV2AliasSetPropertyParams
} from "../src/index.js";
const aliasCreateParams: SolrV2AliasCreateParams = { name: "books_alias", collections: ["books", "archive"] };
const aliasMutationOptions: SolrV2AliasMutationOptions = { async: "alias-task-1" };
const aliasPropertyValue: SolrV2AliasPropertyValue = "integration";
const aliasProperties: SolrV2AliasSetPropertiesParams = { properties: { owner: "tests", generation: 2 } };
const aliasProperty: SolrV2AliasSetPropertyParams = { value: "tests" };
const createdAlias: Promise<SolrV2AliasOperationResponse> = aliasesNamespace.create(aliasCreateParams, aliasMutationOptions);
const deletedAlias: Promise<SolrV2AliasOperationResponse> = aliasesNamespace.delete("books_alias", aliasMutationOptions);
const aliasPropertiesResponse: Promise<SolrV2AliasPropertiesResponse> = aliasesNamespace.getProperties("books_alias");
const aliasPropertyResponse: Promise<SolrV2AliasPropertyResponse> = aliasesNamespace.getProperty("books_alias", "owner");
const setAliasProperties: Promise<SolrV2AliasOperationResponse> = aliasesNamespace.setProperties("books_alias", aliasProperties.properties, aliasMutationOptions);
const setAliasProperty: Promise<SolrV2AliasOperationResponse> = aliasesNamespace.setProperty("books_alias", "owner", aliasProperty.value);
const deleteAliasProperty: Promise<SolrV2AliasOperationResponse> = aliasesNamespace.deleteProperty("books_alias", "owner", aliasMutationOptions);
void [createdAlias, deletedAlias, aliasPropertiesResponse, aliasPropertyResponse, setAliasProperties, setAliasProperty, deleteAliasProperty, aliasPropertyValue];
// @ts-expect-error Standard alias creation requires at least one collection.
void aliasesNamespace.create({ name: "books_alias", collections: [] });
// @ts-expect-error Property values are limited to JSON scalar values.
void aliasesNamespace.setProperty("books_alias", "owner", {});
// @ts-expect-error Async request identifiers must be strings.
void aliasesNamespace.delete("books_alias", { async: 1 });
