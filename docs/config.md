# Config API

Use `config()` with the exported `SolrConfigCommand` discriminated union. Command names select their payload models, and common plugin settings are available through IDE completion.

```ts
await solr.config({
  "set-property": { "query.timeout": 10_000 }
});

await solr.config({
  "add-requesthandler": {
    name: "/select",
    class: "solr.SearchHandler",
    startup: "lazy",
    defaults: { rows: 20, wt: "json" }
  }
});
```

Typed command families include set/unset properties, request handlers, search components, query response writers, init params, query parsers, value-source parsers, transformers, update processors, query converters, listeners, and expressible components. Cache settings are configured through `set-property` (for example, `query.filterCache.size`), not through a separate cache command. Plugin-specific properties can be supplied through the explicit `customOptions` escape hatch, which is flattened into the native component definition. Plugin-specific settings and values remain subject to the Solr Config API and installed plugin implementation. Check the documentation for the target Solr version before applying configuration changes.
