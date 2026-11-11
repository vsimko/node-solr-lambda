import assert from "node:assert/strict";
import test from "node:test";
import { cloudIntegrationTest } from "./fixtures.js";

cloudIntegrationTest(
  "V2 alias list and get read a disposable alias mapping",
  async ({ client, createCollection, createAlias }) => {
    const collection = await createCollection("v2_alias");
    const alias = await createAlias(collection);

    const listed = await client.v2.aliases.list();
    assert.equal(listed.aliases?.[alias], collection,
      "GET /api/aliases must include the alias-to-collection mapping");

    const detail = await client.v2.aliases.get(alias);
    assert.equal(detail.name, alias);
    assert.deepEqual(detail.collections, [collection]);
  },
  false,
  false,
  ["9.11.0", "10.1.0"].includes(process.env.SOLR_VERSION ?? "")
    ? undefined
    : "The intuitive /api/aliases routes are documented from Solr 9.2; the pinned 8.11 line is not claimed"
);
