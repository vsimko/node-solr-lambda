import { createSolrClient } from "../src/index.js";
import { SolrHttpError } from "../src/index.js";
import type { RequestControlOptions, SolrAtomicUpdateDocument, SolrCommitOptions, SolrDeleteOptions, SolrErrorResponse, SolrJsonUpdateCommands, SolrOptimizeOptions, SolrSoftCommitOptions, SolrUpdateOptions, SolrUpdateResponse } from "../src/index.js";

const controller = new AbortController();
const controls: RequestControlOptions = { signal: controller.signal, timeoutMs: 5000 };

const client = createSolrClient({ core: "catalog", timeoutMs: 30_000 });
void client.query({ query: "*:*" }, controls);
void client.queryJson({ query: "*:*" }, controls);
const updateOptions: SolrUpdateOptions = { overwrite: false, commitWithin: 250, route: "tenant-a" };
const deleteOptions: SolrDeleteOptions = { route: "tenant-a", commitWithin: 250, signal: controller.signal };
const optimizeOptions: SolrOptimizeOptions = { maxSegments: 2, waitSearcher: false };
void client.add({ id: "one" }, updateOptions, controls);
void client.update({ id: "two" }, { route: "tenant-b" }, controls);
void client.delete("one", deleteOptions);
void client.optimize({ ...optimizeOptions, openSearcher: false }, controls);
const commitOptions: SolrCommitOptions = { waitSearcher: false, openSearcher: true, expungeDeletes: true };
const softCommitOptions: SolrSoftCommitOptions = { waitSearcher: true, openSearcher: false };
void client.commit(commitOptions, controls);
void client.softCommit(softCommitOptions, controls);
void client.softCommit(controls);
// @ts-expect-error expungeDeletes is not supported on soft commits.
void client.commit({ softCommit: true, expungeDeletes: true });
// @ts-expect-error maxSegments is an optimize-only option.
void client.commit({ maxSegments: 2 });
interface AtomicProduct { id: string; title: string; price: number; tags: string[]; }
const atomicProduct: SolrAtomicUpdateDocument<AtomicProduct> = {
  id: "p-1",
  title: { set: "Updated" },
  price: { inc: 2 },
  tags: { "add-distinct": "new" }
};
void client.atomicUpdate<AtomicProduct>(atomicProduct);
const jsonCommands: SolrJsonUpdateCommands = {
  add: { doc: { id: "p-1" }, overwrite: false, commitWithin: 1000 },
  delete: { query: "status:expired" },
  commit: { waitSearcher: false }
};
void client.updateCommands(jsonCommands);
const addResponse: Promise<SolrUpdateResponse> = client.add({ id: "response-1" });
const updateResponse: Promise<SolrUpdateResponse> = client.update({ id: "response-2" });
const atomicResponse: Promise<SolrUpdateResponse> = client.atomicUpdate<AtomicProduct>(atomicProduct);
const deleteResponse: Promise<SolrUpdateResponse> = client.delete("response-1");
const commitResponse: Promise<SolrUpdateResponse> = client.commit();
const softCommitResponse: Promise<SolrUpdateResponse> = client.softCommit();
const optimizeResponse: Promise<SolrUpdateResponse> = client.optimize();
const rollbackResponse: Promise<SolrUpdateResponse> = client.rollback();
const commandsResponse: Promise<SolrUpdateResponse> = client.updateCommands({ commit: {} });
void addResponse; void updateResponse; void atomicResponse; void deleteResponse; void commitResponse;
void softCommitResponse; void optimizeResponse; void rollbackResponse; void commandsResponse;
const solrError: SolrErrorResponse = { error: { code: 400, msg: "bad request" } };
void solrError;
function inspectSolrError(error: unknown): void {
  if (error instanceof SolrHttpError) {
    const detail = error.errorResponse?.error;
    if (detail && typeof detail !== "string") {
      const code: number | undefined = detail.code;
      void code;
    }
  }
}
void inspectSolrError;
void client.add({ id: "single" });
void client.add([{ id: "one" }, { id: "two" }]);
// @ts-expect-error JSON add command requires a document object.
void client.updateCommands({ add: { doc: "not a document" } });
// @ts-expect-error Unknown JSON update commands are rejected.
void client.updateCommands({ replace: { id: "one" } });
// @ts-expect-error Delete command must be an ID, ID list, or query.
void client.updateCommands({ delete: { id: "one", query: "*:*" } });
interface ProductWithSku extends AtomicProduct { sku: string; }
const customKeyUpdate: SolrAtomicUpdateDocument<ProductWithSku, "sku"> = {
  sku: "SKU-1",
  title: { set: "Updated by custom key" }
};
void client.atomicUpdate<ProductWithSku, "sku">(customKeyUpdate);
// @ts-expect-error Increment is valid only for numeric fields.
void client.atomicUpdate<AtomicProduct>({ id: "p-1", title: { inc: 1 } });
// @ts-expect-error add requires a multi-valued field in the document model.
void client.atomicUpdate<AtomicProduct>({ id: "p-1", price: { add: 2 } });
// @ts-expect-error Unknown atomic modifiers are rejected.
void client.atomicUpdate<AtomicProduct>({ id: "p-1", title: { replace: "new" } });
// @ts-expect-error Field values must match the document's field type.
void client.atomicUpdate<AtomicProduct>({ id: "p-1", title: { set: 42 } });
// @ts-expect-error SolrCloud route values must be strings.
void client.add({ id: "bad" }, { route: 42 });
// @ts-expect-error maxSegments must be numeric.
void client.optimize({ maxSegments: "two" });
void client.update({ id: "one" }, {}, controls);
void client.delete("one", controls);
void client.commit({}, controls);
void client.softCommit(controls);
void client.optimize(1, controls);
void client.rollback(controls);
void client.ping(controls);
void client.schema({}, controls);
void client.config({}, controls);
void client.coreAdmin("STATUS", {}, controls);
void client.collections("LIST", {}, controls);
void client.systemInfo(controls);
void client.metrics({}, controls);
void client.security("authentication", undefined, controls);
void client.stream("search(catalog, q=*:*)", controls);
void client.export({ fl: "id" }, controls);
