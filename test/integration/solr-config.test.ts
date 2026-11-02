import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";
import type { SolrConfigOverlayResponse } from "../../src/index.js";

integrationTest("Config API sets and unsets a typed cache property with overlay read-back", async ({ client }) => {
  const core = process.env.SOLR_CORE;
  const overlayPath = `/${core}/config/overlay`;
  const property = "query.filterCache.size";
  const readOverlay = () => client.request<SolrConfigOverlayResponse>(overlayPath, { method: "GET" });
  const before = await readOverlay();
  const previousSize = before.overlay?.props?.query?.filterCache?.size;
  let changed = false;

  try {
    const set = await client.config({ "set-property": { [property]: 333 } });
    changed = true;
    assert.equal(set.responseHeader?.status, 0);

    const afterSet = await readOverlay();
    assert.equal(String(afterSet.overlay?.props?.query?.filterCache?.size), "333");

    const unset = await client.config({ "unset-property": property });
    changed = false;
    assert.equal(unset.responseHeader?.status, 0);

    const afterUnset = await readOverlay();
    assert.equal(afterUnset.overlay?.props?.query?.filterCache?.size, undefined);

    if (previousSize !== undefined) {
      await client.config({ "set-property": { [property]: Number(previousSize) } });
    }
  } finally {
    if (changed) {
      if (previousSize === undefined) {
        await client.config({ "unset-property": property });
      } else {
        await client.config({ "set-property": { [property]: Number(previousSize) } });
      }
    }
  }
});
