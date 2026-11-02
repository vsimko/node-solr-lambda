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
- `commitWithin`: the maximum delay in milliseconds before the document is committed.
- `route`: a SolrCloud shard-routing value; serialized as the `_route_` request parameter.
- `boost`: retained as a legacy option for source compatibility.

`update()` is an alias for full-document replacement through the same add command. Atomic/partial document updates use a different command shape and are tracked separately in [Issue #61](https://github.com/vsimko/node-solr-lambda/issues/61).

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

