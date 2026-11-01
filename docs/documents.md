# Document API

Use `add()` to add one document or a list of documents.

```ts
await solr.add({ id: "item-1", title: "First item" });
await solr.add([{ id: "item-2" }, { id: "item-3" }]);
await solr.commit();
```

Use `delete()` with an ID, an ID command, or a query command.

```ts
await solr.delete("item-1");
await solr.delete({ id: "item-2" });
await solr.delete({ query: "status:expired" });
```

Use `rollback()` to cancel uncommitted update operations.
