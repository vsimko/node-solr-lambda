import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("Config API adds, reads, and removes an isolated request handler", async ({ client, createId }) => {
  const name = `/${createId("config_handler")}`;
  await client.config({
    "add-requesthandler": {
      name,
      class: "solr.SearchHandler",
      startup: "lazy",
      defaults: { rows: 17, wt: "json", echoParams: "explicit" }
    }
  });

  try {
    const effective = await client.getConfig();
    const handler = effective.config?.requestHandler?.[name];
    assert.ok(handler, "effective config should include the newly added request handler");
    assert.equal(handler.class, "solr.SearchHandler");
    assert.equal(handler.startup, "lazy");
    assert.equal(handler.defaults?.rows, 17);
    assert.equal(handler.defaults?.wt, "json");
    assert.equal(handler.defaults?.echoParams, "explicit");
  } finally {
    await client.config({ "delete-requesthandler": name });
  }

  const afterCleanup = await client.getConfig();
  assert.equal(afterCleanup.config?.requestHandler?.[name], undefined,
    "effective config should no longer contain the temporary request handler");
});
