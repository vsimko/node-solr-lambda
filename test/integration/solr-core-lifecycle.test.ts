import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("CoreAdmin creates, reports, reloads, and cleans up an isolated core", async ({
  client,
  createCore
}) => {
  const ping = await client.ping<{ status?: string }>();
  assert.equal(ping.status, "OK");

  const name = await createCore();
  const status = await client.coreAdmin<{ status?: Record<string, { name?: string }> }>(
    "STATUS",
    { core: name }
  );

  assert.equal(status.status?.[name]?.name, name);

  await client.coreAdmin("RELOAD", { core: name });
  const reloaded = await client.coreAdmin<{ status?: Record<string, { name?: string }> }>(
    "STATUS",
    { core: name }
  );
  assert.equal(reloaded.status?.[name]?.name, name);
});
