# Schema API

Use `schema()` to send a Schema API command.

```ts
await solr.schema({ "add-field": { name: "sku", type: "string", stored: true, indexed: true } });
```

The command body follows the Solr Schema API. Confirm field properties against the documentation for your Solr major version.
