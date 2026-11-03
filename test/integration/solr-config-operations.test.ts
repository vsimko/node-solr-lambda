import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";
import type { SolrConfigReadResponse } from "../../src/index.js";

integrationTest("Config API adds, reads, updates, and deletes an isolated request handler", async ({
  client,
  createId
}) => {
  const name = `/integration_${createId("handler")}`;
  const readConfig = () => client.getConfig<SolrConfigReadResponse>();
  let created = false;

  try {
    const added = await client.config({
      "add-requesthandler": {
        name,
        class: "solr.SearchHandler",
        defaults: { rows: 3, wt: "json" }
      }
    });
    created = true;
    assert.equal(added.responseHeader?.status, 0);

    const afterAdd = await readConfig();
    assert.equal(afterAdd.config?.requestHandler?.[name]?.class, "solr.SearchHandler");
    assert.equal(afterAdd.config?.requestHandler?.[name]?.defaults?.rows, 3);

    const updated = await client.config({
      "update-requesthandler": {
        name,
        class: "solr.SearchHandler",
        defaults: { rows: 7, wt: "json" }
      }
    });
    assert.equal(updated.responseHeader?.status, 0);

    const afterUpdate = await readConfig();
    assert.equal(afterUpdate.config?.requestHandler?.[name]?.defaults?.rows, 7);

    const deleted = await client.config({ "delete-requesthandler": name });
    created = false;
    assert.equal(deleted.responseHeader?.status, 0);

    const afterDelete = await readConfig();
    assert.equal(afterDelete.config?.requestHandler?.[name], undefined);
  } finally {
    if (created) {
      await client.config({ "delete-requesthandler": name });
    }
  }
});

integrationTest("Config API adds, reads, and deletes an isolated search component", async ({
  client,
  createId
}) => {
  const name = createId("terms_component");
  const readConfig = () => client.getConfig<SolrConfigReadResponse>();
  let created = false;

  try {
    const added = await client.config({
      "add-searchcomponent": {
        name,
        class: "solr.TermsComponent"
      }
    });
    created = true;
    assert.equal(added.responseHeader?.status, 0);

    const afterAdd = await readConfig();
    assert.equal(afterAdd.config?.searchComponent?.[name]?.class, "solr.TermsComponent");

    const deleted = await client.config({ "delete-searchcomponent": name });
    created = false;
    assert.equal(deleted.responseHeader?.status, 0);

    const afterDelete = await readConfig();
    assert.equal(afterDelete.config?.searchComponent?.[name], undefined);
  } finally {
    if (created) {
      await client.config({ "delete-searchcomponent": name });
    }
  }
});
