# Document API

Use `add()` to add one document or a list of documents. Use `update()` for the same Solr update endpoint. Solr atomic update commands are document field values such as `{ set: value }`.

```ts
await solr.add({ id: "item-1", title: "First item" });
await solr.update({ id: "item-1", title: { set: "Updated title" } });
await solr.commit();
```

Use `delete()` with an ID, an ID command, or a query command.

```ts
await solr.delete("item-1");
await solr.delete({ id: "item-2" });
await solr.delete({ query: "status:expired" });
```

Use `softCommit()` for a soft commit. Use `optimize()` to merge index segments. Use `rollback()` to cancel uncommitted update operations.
