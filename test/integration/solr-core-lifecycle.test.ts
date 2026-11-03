import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";
import type { CoreAdminStatusResponse } from "../../src/index.js";

integrationTest("CoreAdmin creates, reports, reloads, and cleans up an isolated core", async ({
  client,
  createCore
}) => {
  const ping = await client.ping<{ status?: string }>();
  assert.equal(ping.status, "OK");

  const name = await createCore();
  const status: CoreAdminStatusResponse = await client.coreAdmin(
    "STATUS",
    { core: name, indexInfo: true }
  );

  assert.equal(status.status?.[name]?.name, name);
  assert.equal(typeof status.status?.[name]?.instanceDir, "string");
  assert.equal(typeof status.status?.[name]?.index?.numDocs, "number");

  await client.coreAdmin("RELOAD", { core: name });
  const reloaded: CoreAdminStatusResponse = await client.coreAdmin(
    "STATUS",
    { core: name }
  );
  assert.equal(reloaded.status?.[name]?.name, name);
});
