import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";
import type { SolrSchemaReadResponse, SolrSchemaNameResponse, SolrSchemaVersionResponse, SolrSchemaUniqueKeyResponse, SolrSchemaSimilarityResponse } from "../../src/index.js";

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

integrationTest("Schema API adds, replaces, and deletes a dynamic field rule", async ({
  client,
  createId,
  addSchemaDynamicField,
  deleteSchemaDynamicField
}) => {
  const name = `*_${createId("dynamic_field")}`;
  const added = await addSchemaDynamicField({ name, type: "string", stored: true, indexed: true });
  assert.equal(added.responseHeader?.status, 0);

  const readDynamicFields = () => client.request<{
    dynamicFields?: Array<{ name?: string; type?: string; stored?: boolean; indexed?: boolean }>;
  }>(`/${process.env.SOLR_CORE}/schema/dynamicfields`, { method: "GET" });

  const initial = await readDynamicFields();
  const initialField = initial.dynamicFields?.find(field => field.name === name);
  assert.ok(initialField, `schema should contain dynamic field ${name}`);
  assert.equal(initialField.type, "string");

  const replaced = await client.schema({
    "replace-dynamic-field": { name, type: "text_general", stored: true, indexed: true }
  });
  assert.equal(replaced.responseHeader?.status, 0);

  const afterReplace = await readDynamicFields();
  const replacedField = afterReplace.dynamicFields?.find(field => field.name === name);
  assert.ok(replacedField, `schema should contain replaced dynamic field ${name}`);
  assert.equal(replacedField.type, "text_general");

  const deleted = await deleteSchemaDynamicField(name);
  assert.equal(deleted.responseHeader?.status, 0);
  const afterDelete = await readDynamicFields();
  assert.equal(afterDelete.dynamicFields?.some(field => field.name === name), false);
});

integrationTest("Schema API adds, replaces, and deletes copy-field rules", async ({
  client,
  createId,
  addSchemaField,
  addSchemaCopyField,
  deleteSchemaCopyField
}) => {
  const source = createId("copy_source");
  const firstDestination = createId("copy_first");
  const oldDestination = createId("copy_old");
  const newDestination = createId("copy_new");
  await addSchemaField(source);
  await addSchemaField(firstDestination);
  await addSchemaField(oldDestination);
  await addSchemaField(newDestination);

  const added = await addSchemaCopyField({ source, dest: [firstDestination, oldDestination], maxChars: 128 });
  assert.equal(added.responseHeader?.status, 0);

  const readCopyFields = () => client.request<{
    copyFields?: Array<{ source?: string; dest?: string; maxChars?: number }>;
  }>(`/${process.env.SOLR_CORE}/schema/copyfields`, { method: "GET" });

  const initial = await readCopyFields();
  assert.ok(initial.copyFields?.some(rule => rule.source === source && rule.dest === firstDestination));
  assert.ok(initial.copyFields?.some(rule => rule.source === source && rule.dest === oldDestination));

  // Solr has no replace-copy-field command: replacement is delete + add.
  const removed = await deleteSchemaCopyField(source, oldDestination);
  assert.equal(removed.responseHeader?.status, 0);
  const replaced = await addSchemaCopyField({ source, dest: newDestination, maxChars: 64 });
  assert.equal(replaced.responseHeader?.status, 0);

  const afterReplace = await readCopyFields();
  assert.ok(afterReplace.copyFields?.some(rule => rule.source === source && rule.dest === firstDestination));
  assert.equal(afterReplace.copyFields?.some(rule => rule.source === source && rule.dest === oldDestination), false);
  assert.ok(afterReplace.copyFields?.some(rule => rule.source === source && rule.dest === newDestination));

  const deleted = await deleteSchemaCopyField(source, firstDestination);
  assert.equal(deleted.responseHeader?.status, 0);
  await deleteSchemaCopyField(source, newDestination);
  const afterDelete = await readCopyFields();
  assert.equal(afterDelete.copyFields?.some(rule => rule.source === source), false);
});

integrationTest("Schema API read endpoints expose consistent metadata response envelopes", async ({ client }) => {
  const basePath = `/${process.env.SOLR_CORE}/schema`;
  const [full, name, version, uniqueKey, similarity] = await Promise.all([
    client.request<SolrSchemaReadResponse>(basePath, { method: "GET" }),
    client.request<SolrSchemaNameResponse>(`${basePath}/name`, { method: "GET" }),
    client.request<SolrSchemaVersionResponse>(`${basePath}/version`, { method: "GET" }),
    client.request<SolrSchemaUniqueKeyResponse>(`${basePath}/uniquekey`, { method: "GET" }),
    client.request<SolrSchemaSimilarityResponse>(`${basePath}/similarity`, { method: "GET" })
  ]);

  assert.equal(full.responseHeader?.status, 0);
  assert.equal(name.responseHeader?.status, 0);
  assert.equal(version.responseHeader?.status, 0);
  assert.equal(uniqueKey.responseHeader?.status, 0);
  assert.equal(similarity.responseHeader?.status, 0);

  assert.ok(full.schema?.name);
  assert.equal(name.name, full.schema?.name);
  assert.ok(typeof full.schema?.version === "number");
  assert.equal(version.version, full.schema?.version);
  assert.ok(full.schema?.uniqueKey);
  assert.equal(uniqueKey.uniqueKey, full.schema?.uniqueKey);
  assert.ok(similarity.similarity);
});
