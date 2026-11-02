# Schema API

Use `schema()` with the exported `SolrSchemaCommand` discriminated union. The command name selects the payload shape, and the field/type/analyzer properties are discoverable in TypeScript.

```ts
await solr.schema({
  "add-field": {
    name: "sku",
    type: "string",
    stored: true,
    indexed: true,
    docValues: true
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
```

Supported command families include add/replace/delete field, dynamic field, field type, and copy field. Analyzer and similarity configuration remains extensible because Solr plugin parameters vary by implementation. Use a compatible Solr Schema API guide for the deployed server version; a successful TypeScript compile does not establish that a field type or analyzer is available on Solr 8, 9, and 10.
