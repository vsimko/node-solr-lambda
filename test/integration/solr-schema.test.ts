import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";

integrationTest("Schema API adds and reads an isolated field definition", async ({
  client,
  createId,
  addSchemaField
}) => {
  const name = createId("fixture_field");
  const mutation = await addSchemaField(name);
  assert.equal(mutation.responseHeader?.status, 0);

  const schema = await client.request<{ fields?: Array<{ name?: string; type?: string; stored?: boolean; indexed?: boolean }> }>(
    `/${process.env.SOLR_CORE}/schema/fields`,
    { method: "GET" }
  );

  const field = schema.fields?.find(candidate => candidate.name === name);
  assert.ok(field, `schema should contain field ${name}`);
  assert.equal(field.type, "string");
  assert.equal(field.stored, true);
  assert.equal(field.indexed, true);
});
