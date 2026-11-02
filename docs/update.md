# Update API

The client exposes typed wrappers for Solr's Update Request Handler. Add and full-document replacement accept one document or a list of documents; delete accepts either a unique-key ID or a query.

## Add and replace documents

```ts
import { createSolrClient } from "node-solr-lambda";

const solr = createSolrClient({ baseUrl: "http://localhost:8983", collection: "catalog" });

await solr.add(
  { id: "book-1", title: "Solr in Action" },
  { overwrite: true, commitWithin: 5_000, route: "tenant-a" }
);

await solr.update(
  [{ id: "book-2", title: "Lucene Guide" }],
  { overwrite: false, route: "tenant-b" }
);
```

`SolrUpdateOptions` exposes:

- `overwrite`: whether a document with the same unique key is replaced.
- `commitWithin`: the maximum delay in whole milliseconds before the document is committed.
- `route`: a SolrCloud shard-routing value; serialized as the `_route_` request parameter.
- `boost`: retained as a legacy option for source compatibility.

`update()` is an alias for full-document replacement through the same add command. Atomic/partial document updates use a different command shape and are tracked separately in [Issue #61](https://github.com/vsimko/node-solr-lambda/issues/61).

## Atomic and partial document updates

Use `atomicUpdate<TDocument>()` when changing only selected fields. The unique-key field (by default `id`) remains a plain value; every changed field must use exactly one Solr modifier.

```ts
interface Product {
  id: string;
  title: string;
  price: number;
  tags: string[];
}

await solr.atomicUpdate<Product>({
  id: "book-1",
  title: { set: "Revised title" },
  price: { inc: 2.5 },
  tags: { "add-distinct": "featured" }
});
```

The field-specific `SolrAtomicUpdateOperation<TValue>` model supports:

- `set`: replace a field value (or clear it with `null`).
- `add`, `add-distinct`, and `remove`: operate on fields modelled as arrays.
- `removeregex`: remove values matching a regular expression from a string-array field (this is Solr's exact wire spelling).
- `inc`: increment or decrement a numeric field.

A custom unique-key field can be supplied as the second generic parameter when that key exists on the document type, for example `interface ProductWithSku extends Product { sku: string; }` followed by `SolrAtomicUpdateDocument<ProductWithSku, "sku">`. For nested documents, include `_root_` and, where needed, pass the root ID using the existing `route` option.

Atomic updates require Solr schema fields to be stored or docValues-backed (subject to Solr's documented copyField/derived-field exceptions). The client validates that each update has one unique-key value and at least one valid modifier, and rejects malformed modifier objects before sending the request.

## Atomic and partial document updates

Use `atomicUpdate<TDocument>()` when changing selected fields without replacing the full document. The unique-key field (by default `id`) remains a plain value; every changed field must use exactly one Solr modifier.

```ts
interface Product {
  id: string;
  title: string;
  price: number;
  tags: string[];
}

await solr.atomicUpdate<Product>({
  id: "book-1",
  title: { set: "Revised title" },
  price: { inc: 2.5 },
  tags: { "add-distinct": "featured" }
});
```

The field-specific `SolrAtomicUpdateOperation<TValue>` model supports:

- `set`: replace a field value (or clear it with `null`).
- `add`, `add-distinct`, and `remove`: operate on fields modelled as arrays.
- `removeregex`: remove matching values from a string-array field (this is Solr's exact wire spelling).
- `inc`: increment or decrement a numeric field.

A custom unique-key field can be supplied as the second generic parameter, for example `SolrAtomicUpdateDocument<Product, "sku">`. For nested documents, include `_root_` and, where needed, pass the root ID using the existing `route` option.

Atomic updates require schema fields to be stored or docValues-backed, subject to Solr's documented copyField and derived-field exceptions. The client validates that each update contains one unique-key value and at least one valid modifier, and rejects malformed modifier objects before sending the request.

## Delete by ID or query

```ts
await solr.delete("book-1", { route: "tenant-a", commitWithin: 1_000 });
await solr.delete({ query: "status:expired" }, { route: "tenant-b" });
```

`SolrDeleteOptions` accepts `route` and `commitWithin`, plus the usual request controls (`signal`, `timeoutMs`, and `headers`). Solr ignores `commitWithin` for delete-by-query, so use it only with delete-by-ID.

## Commit, optimize, and rollback

```ts
await solr.commit({ waitSearcher: true });
await solr.softCommit();
await solr.optimize({ maxSegments: 2, waitSearcher: false });
// Or preserve the numeric shorthand:
await solr.optimize(2);
await solr.rollback();
```

- `commit()` sends a commit command with the supplied `CommitOptions`.
- `softCommit()` sends `softCommit: true` and `waitSearcher: false`.
- `optimize()` accepts either a `SolrOptimizeOptions` object or the legacy numeric `maxSegments` shorthand. Omit `maxSegments` to leave the merge target to Solr.
- `rollback()` discards uncommitted updates since the last commit.

## Compatibility

The base add, full-document update, delete-by-ID, hard/soft commit, optimize, and rollback operations have integration coverage on pinned Solr 8.11.4, 9.11.0, and 10.1.0 images. Unit and consumer type tests cover the new request-option serialization and validation. The `_route_` and `commitWithin` options introduced in this typed interface remain runtime-unverified on those three versions; do not infer runtime support from their TypeScript types alone.

The request shapes follow the official [Solr 10.1 Indexing with Update Handlers guide](https://solr.apache.org/guide/solr/10_1/indexing-guide/indexing-with-update-handlers.html). The guide documents JSON add/delete commands, `overwrite`, `commitWithin`, and commit/optimize behavior. SolrCloud routing uses the documented `_route_` request parameter.

