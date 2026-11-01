import assert from "node:assert/strict";
import { cloudIntegrationTest } from "./fixtures.js";

cloudIntegrationTest("Collections API creates, lists, and cleans up an isolated collection", async ({
  client,
  createCollection
}) => {
  const name = await createCollection();
  const result = await client.collections<{ collections?: string[] }>("LIST");

  assert.ok(result.collections?.includes(name), `collection list should contain ${name}`);
});
