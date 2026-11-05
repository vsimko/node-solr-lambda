# Document API overview

> This page is a concise introduction with examples. The canonical, detailed reference for document writes, atomic updates, update commands, and commit behavior is the [Update and Document API guide](update.md).

Use `add()` to add one document or a list of documents. Use `update()` for full-document replacement. Use `atomicUpdate<TDocument>()` for field-specific partial updates with typed Solr modifiers.

```ts
await solr.add({ id: "item-1", title: "First item" });
interface Item { id: string; title: string; count: number; tags: string[]; }
await solr.atomicUpdate<Item>({
  id: "item-1",
  title: { set: "Updated title" },
  count: { inc: 1 },
  tags: { "add-distinct": "featured" }
});
await solr.commit();
```

Use `delete()` with an ID, an ID command, or a query command.

```ts
await solr.delete("item-1");
await solr.delete({ id: "item-2" });
await solr.delete({ query: "status:expired" });
```

Use `softCommit()` for a soft commit. Use `optimize()` to merge index segments. Use `rollback()` to cancel uncommitted update operations.
