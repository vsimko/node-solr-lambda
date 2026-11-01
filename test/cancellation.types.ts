import { createSolrClient } from "../src/index.js";
import type { RequestControlOptions } from "../src/index.js";

const controller = new AbortController();
const controls: RequestControlOptions = { signal: controller.signal, timeoutMs: 5000 };

const client = createSolrClient({ core: "catalog", timeoutMs: 30_000 });
void client.query({ query: "*:*" }, controls);
void client.queryJson({ query: "*:*" }, controls);
void client.add({ id: "one" }, { overwrite: true }, controls);
void client.update({ id: "one" }, {}, controls);
void client.delete("one", controls);
void client.commit({}, controls);
void client.softCommit(controls);
void client.optimize(1, controls);
void client.rollback(controls);
void client.ping(controls);
void client.schema({}), void client.config({}, controls);
void client.coreAdmin("STATUS", {}, controls);
void client.collections("LIST", {}, controls);
void client.systemInfo(controls);
void client.metrics({}, controls);
void client.security("authentication", undefined, controls);
void client.stream("search(catalog, q=*:*)", controls);
void client.export({ fl: "id" }, controls);
