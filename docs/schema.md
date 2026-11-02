# Schema API

Use `schema()` with the exported `SolrSchemaCommand` discriminated union. The command name selects the payload shape, and the field/type/analyzer properties are discoverable in TypeScript. The method returns a typed `SolrSchemaCommandResponse` by default; supply a generic only when an application needs a narrower server-specific response.

## Add, replace, and delete fields

The three field operations are typed individually. `replace-field` requires the full replacement definition rather than a partial patch; `delete-field` requires the exact field name and fails if a copy-field rule still references it.

```ts
await solr.schema({ "add-field": { name: "sku", type: "string", stored: true, indexed: true } });
await solr.schema({ "replace-field": { name: "sku", type: "text_general", stored: true, indexed: true } });
await solr.schema({ "delete-field": { name: "sku" } });
```

## Add, replace, and delete field types

Field types support a shared analyzer or separate index/query analyzers. Tokenizers, filters, char filters, and similarity configuration are represented explicitly where common, with an extension index for plugin-specific options.

```ts
await solr.schema({
  "add-field-type": {
    name: "text_en",
    class: "solr.TextField",
    analyzer: {
      tokenizer: { class: "solr.StandardTokenizerFactory" },
      filters: [{ class: "solr.LowerCaseFilterFactory" }]
    },
    similarity: { class: "solr.SchemaSimilarityFactory" }
  }
});

await solr.schema({
  "replace-field-type": {
    name: "text_en",
    class: "solr.TextField",
    indexAnalyzer: { tokenizer: { class: "solr.StandardTokenizerFactory" } },
    queryAnalyzer: { tokenizer: { class: "solr.KeywordTokenizerFactory" } }
  }
});

await solr.schema({ "delete-field-type": { name: "text_en" } });
```

The replace operation requires a complete field type definition. Analyzer plugin class names and parameters must exist on the target Solr distribution; TypeScript cannot validate server-side plugin availability.

## Add, replace, and delete dynamic fields

Dynamic field rules use a single wildcard in the name. Add and replace commands require the complete rule definition; delete requires the exact wildcard pattern.

```ts
await solr.schema({ "add-dynamic-field": { name: "*_sku", type: "string", stored: true, indexed: true } });
await solr.schema({ "replace-dynamic-field": { name: "*_sku", type: "text_general", stored: true, indexed: true } });
await solr.schema({ "delete-dynamic-field": { name: "*_sku" } });
```

## Add and delete copy-field rules

Copy-field add supports one or multiple destinations. Solr does not define a `replace-copy-field` command; replace a rule by deleting the old source/destination pair and adding the new rule. Delete requires one exact source/destination pair, including when an add command originally supplied multiple destinations.

```ts
await solr.schema({ "add-copy-field": { source: "title", dest: ["text", "catchall"], maxChars: 128 } });
await solr.schema({ "delete-copy-field": { source: "title", dest: "text" } });
await solr.schema({ "add-copy-field": { source: "title", dest: "search_text", maxChars: 128 } });
```

```ts
const added = await solr.schema({
  "add-field": {
    name: "sku",
    type: "string",
    stored: true,
    indexed: true,
    docValues: true
  }
});
console.log(added.responseHeader?.status, added.responseHeader?.QTime);

await solr.schema({
  "add-dynamic-field": {
    name: "*_sku",
    type: "string",
    stored: true,
    indexed: true
  }
});

await solr.schema({
  "add-field-type": {
    name: "text_en",
    class: "solr.TextField",
    analyzer: {
      tokenizer: { class: "solr.StandardTokenizerFactory" },
      filters: [{ class: "solr.LowerCaseFilterFactory" }]
    }
  }
});

await solr.schema({
  "add-copy-field": {
    source: "title",
    dest: ["text", "catchall"],
    maxChars: 256
  }
});
```

The command union covers add/replace/delete for fields, dynamic fields, field types, and copy-field rules. A copy-field add command accepts one or more destinations; deleting a copy-field rule requires one exact source/destination pair. Analyzer, tokenizer, filter, and similarity settings retain an explicit extensibility boundary because plugin parameters vary by implementation.

Schema mutation responses contain the standard `responseHeader` with numeric `status` and optional `QTime`; they do not return the complete updated schema. HTTP failures are surfaced as `SolrHttpError`, not as a successful Schema response with a non-zero status.

## Read schema definitions

The client exposes raw `request<T>()` for Schema API read endpoints that do not mutate the schema. Use the named response models to type those payloads:

```ts
import type {
  SolrSchemaReadResponse,
  SolrSchemaFieldsResponse,
  SolrSchemaFieldTypesResponse,
  SolrSchemaUniqueKeyResponse
} from "node-solr-lambda";

const fullSchema = await solr.request<SolrSchemaReadResponse>("/solr/books/schema");
const fields = await solr.request<SolrSchemaFieldsResponse>("/solr/books/schema/fields");
const fieldTypes = await solr.request<SolrSchemaFieldTypesResponse>("/solr/books/schema/fieldtypes");
const uniqueKey = await solr.request<SolrSchemaUniqueKeyResponse>("/solr/books/schema/uniquekey");

const schemaName = fullSchema.schema?.name;
const schemaVersion = fullSchema.schema?.version;
const keyField = fullSchema.schema?.uniqueKey ?? uniqueKey.uniqueKey;
const firstField = fields.fields?.[0];
const firstFieldType = fieldTypes.fieldTypes?.[0];
void [schemaName, schemaVersion, keyField, firstField, firstFieldType];
```

Additional response models cover dynamic fields, copy fields, schema name, schema version, and global similarity. These read types reflect the JSON response envelopes; they do not imply that this client provides dedicated convenience methods for each read path. Use the documented `/schema` read paths with `request<T>()`.

## Compatibility and operational behavior

The v1 Schema API command names and JSON response envelope are documented across the Solr 8.11, 9.x, and 10.1 guides. Add/replace/delete field and field-type mutations, including analyzer/tokenizer/filter configuration and response headers, are integration-tested against pinned Solr 8.11.4, 9.11.0, and 10.1.0 images. Dynamic-field and copy-field mutation families, similarity plugin settings, and other plugin-specific analyzer options currently have type/serialization coverage only; do not infer server compatibility from compilation alone.

Schema changes trigger a core reload so the new definitions apply to subsequent indexing. Existing indexed documents are not rewritten: reindex when a schema change alters how existing data is interpreted. In SolrCloud, schema changes propagate to replicas; without a replica update timeout, other replicas may apply the change asynchronously.

Official references:
- [Solr 8.11 Schema API](https://solr.apache.org/guide/8_11/indexing-guide/schema-api.html)
- [Solr 9.9 Schema API](https://solr.apache.org/guide/solr/9_9/indexing-guide/schema-api.html)
- [Solr 10.1 Schema API](https://solr.apache.org/guide/solr/10_1/indexing-guide/schema-api.html)
