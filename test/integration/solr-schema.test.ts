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

integrationTest("Schema API adds, replaces, and deletes an isolated field", async ({
  client,
  createId,
  addSchemaField,
  deleteSchemaField
}) => {
  const name = createId("schema_field_ops");
  const added = await addSchemaField(name, "string");
  assert.equal(added.responseHeader?.status, 0);

  const replaced = await client.schema({
    "replace-field": { name, type: "text_general", stored: true, indexed: true }
  });
  assert.equal(replaced.responseHeader?.status, 0);

  const afterReplace = await client.request<{
    fields?: Array<{ name?: string; type?: string; stored?: boolean; indexed?: boolean }>;
  }>(`/${process.env.SOLR_CORE}/schema/fields`, { method: "GET" });
  const field = afterReplace.fields?.find(candidate => candidate.name === name);
  assert.ok(field, `schema should contain replaced field ${name}`);
  assert.equal(field.type, "text_general");
  assert.equal(field.stored, true);
  assert.equal(field.indexed, true);

  const deleted = await deleteSchemaField(name);
  assert.equal(deleted.responseHeader?.status, 0);

  const afterDelete = await client.request<{
    fields?: Array<{ name?: string }>;
  }>(`/${process.env.SOLR_CORE}/schema/fields`, { method: "GET" });
  assert.equal(afterDelete.fields?.some(candidate => candidate.name === name), false);
});

integrationTest("Schema API adds, replaces, and deletes a field type with analyzer components", async ({
  client,
  createId,
  addSchemaFieldType,
  deleteSchemaFieldType
}) => {
  const name = createId("schema_field_type");
  const added = await addSchemaFieldType({
    name,
    class: "solr.TextField",
    positionIncrementGap: 100,
    analyzer: {
      tokenizer: { class: "solr.KeywordTokenizerFactory" },
      filters: [{ class: "solr.LowerCaseFilterFactory" }]
    },
  });
  assert.equal(added.responseHeader?.status, 0);

  const readFieldTypes = () => client.request<{
    fieldTypes?: Array<{
      name?: string;
      class?: string;
      analyzer?: { tokenizer?: { class?: string }; filters?: Array<{ class?: string }> };
      indexAnalyzer?: { tokenizer?: { class?: string } };
      queryAnalyzer?: { tokenizer?: { class?: string } };
      similarity?: { class?: string };
    }>;
  }>(`/${process.env.SOLR_CORE}/schema/fieldtypes`, { method: "GET" });

  const initial = await readFieldTypes();
  const initialType = initial.fieldTypes?.find(candidate => candidate.name === name);
  assert.ok(initialType, `schema should contain field type ${name}`);
  assert.equal(initialType.class, "solr.TextField");
  assert.equal(initialType.analyzer?.tokenizer?.class, "solr.KeywordTokenizerFactory");
  assert.equal(initialType.analyzer?.filters?.[0]?.class, "solr.LowerCaseFilterFactory");

  const replaced = await client.schema({
    "replace-field-type": {
      name,
      class: "solr.TextField",
      positionIncrementGap: 200,
      indexAnalyzer: { tokenizer: { class: "solr.StandardTokenizerFactory" } },
      queryAnalyzer: { tokenizer: { class: "solr.KeywordTokenizerFactory" } }
    }
  });
  assert.equal(replaced.responseHeader?.status, 0);

  const afterReplace = await readFieldTypes();
  const replacedType = afterReplace.fieldTypes?.find(candidate => candidate.name === name);
  assert.ok(replacedType, `schema should contain replaced field type ${name}`);
  assert.equal(replacedType.indexAnalyzer?.tokenizer?.class, "solr.StandardTokenizerFactory");
  assert.equal(replacedType.queryAnalyzer?.tokenizer?.class, "solr.KeywordTokenizerFactory");

  const deleted = await deleteSchemaFieldType(name);
  assert.equal(deleted.responseHeader?.status, 0);
  const afterDelete = await readFieldTypes();
  assert.equal(afterDelete.fieldTypes?.some(candidate => candidate.name === name), false);
});
