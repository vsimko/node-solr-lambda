import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("CoreAdmin STATUS discovers an isolated core without a core filter", async ({
  client,
  createCore
}) => {
  const name = await createCore();

  const result = await client.coreAdmin<{
    status?: Record<string, { name?: string; instanceDir?: string }>;
  }>("STATUS");

  assert.equal(result.status?.[name]?.name, name);
  assert.equal(typeof result.status?.[name]?.instanceDir, "string");
});
