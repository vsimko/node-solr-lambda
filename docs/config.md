# Config API

Use `config()` to send a Config API command.

```ts
await solr.config({ "set-property": { "query.timeout": 10000 } });
```

The command body follows the Solr Config API. Some settings are not available in every Solr version.
