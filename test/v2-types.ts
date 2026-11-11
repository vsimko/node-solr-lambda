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
void [collectionList, collectionStatus, clusterStatus];

// @ts-expect-error Collection status flags are booleans.
void collectionsNamespace.status("books", { coreInfo: "true" });
