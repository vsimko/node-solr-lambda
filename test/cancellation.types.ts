import { createSolrClient } from "../src/index.js";
import type { RequestControlOptions, SolrDeleteOptions, SolrOptimizeOptions, SolrUpdateOptions } from "../src/index.js";

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
void client.optimize(optimizeOptions, controls);
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
