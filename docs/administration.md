# Core and collection administration

Use `ping()` to check a core or collection.

```ts
const status = await solr.ping();
```

Core Admin and Collections APIs use different endpoint paths and request models. The current v4 implementation exposes core-scoped ping. The full administrative API is tracked in the API coverage matrix. Do not use a core endpoint to manage a SolrCloud collection.
