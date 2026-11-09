import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { integrationTest } from "./fixtures.js";
import { fetchV2Introspection } from "../helpers/v2-introspection.js";

integrationTest("Solr supports basic add, commit, query, and delete operations", async ({
  client,
  createId,
  addDocuments,
  commit
}) => {
  const id = createId("integration");

  await addDocuments([{ id }]);
  await commit();

  const result = await client.query<{ response?: { docs?: Array<{ id: string }> } }>({
    query: `id:${id}`,
    fields: ["id"],
    limit: 10
  });

  assert.deepEqual(result.response?.docs?.map(document => document.id), [id]);
});

integrationTest("V2 query introspection and GET query work on the pinned Solr version", async ({ client }) => {
  const introspection = await fetchV2Introspection(client, "/api/cores/integration/select");
  assert.equal(typeof introspection, "object");
  assert.notEqual(introspection, null);
  assert.ok(Object.keys(introspection).length > 0, "Solr must return a non-empty V2 introspection document");

  const solrVersion = process.env.SOLR_VERSION;
  assert.ok(solrVersion === "8.11.4" || solrVersion === "9.11.0" || solrVersion === "10.1.0",
    `Unexpected Solr version for V2 fixture: ${solrVersion ?? "unset"}`);
  const expected = JSON.parse(readFileSync(
    new URL(`../fixtures/v2-introspection/${solrVersion}/cores-integration-select.json`, import.meta.url),
    "utf8"
  )) as Record<string, unknown>;
  const withoutQueryTime = (document: Record<string, unknown>): Record<string, unknown> => {
    const copy = structuredClone(document);
    const responseHeader = copy.responseHeader as Record<string, unknown> | undefined;
    if (responseHeader) delete responseHeader.QTime;
    return copy;
  };
  assert.deepEqual(withoutQueryTime(introspection), withoutQueryTime(expected),
    "Solr V2 introspection must match the original version-labelled fixture");

  const response = await client.v2.request<{ response?: { numFound?: number } }>(
    "/api/cores/integration/select",
    { method: "GET", query: { q: "*:*", rows: 0 } }
  );
  assert.equal(typeof response.response?.numFound, "number");
});
