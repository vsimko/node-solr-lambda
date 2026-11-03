# Update API

The client exposes typed wrappers for Solr's Update Request Handler. Add and full-document replacement accept one document or a list of documents; delete accepts either a unique-key ID or a query. The examples in this guide are mirrored by the compile-only consumer fixture `test/update-doc-examples.ts`; `npm run test:types` checks the valid request shapes and representative invalid options in every Node.js CI job.

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

## XML update requests: deliberate exclusion

There is no XML-specific convenience API. The typed update surface uses Solr's JSON formats; XML support would duplicate the command models and serializer without adding capabilities that are unavailable through the raw transport.

When an existing integration requires XML, use `requestRaw()` with a string body and set the content type explicitly:

```ts
const response = await solr.requestRaw("/solr/catalog/update", {
  method: "POST",
  body: "<add><doc><field name=\"id\">book-1</field></doc></add>",
  headers: { "content-type": "text/xml" }
});
```

String bodies passed to `requestRaw()` are sent unchanged. Non-string bodies retain the existing JSON serialization behavior. The XML request path is a generic transport escape hatch, not a typed XML command API; XML runtime compatibility is not certified by the Solr 8/9/10 integration matrix.

## JSON update request forms

`add()` and `update()` accept either one document or an array:

- A single document is sent as a top-level JSON object to `/update/json/docs`, which selects Solr's JSON-document mode.
- An array is sent as a top-level JSON array to `/update`.
- `updateCommands()` sends a typed command object to `/update/json`.

```ts
await solr.add({ id: "book-1", title: "Single document" });

await solr.add([
  { id: "book-2", title: "First in a batch" },
  { id: "book-3", title: "Second in a batch" }
]);

await solr.updateCommands({
  add: {
    doc: { id: "book-4", title: "Command document" },
    overwrite: true,
    commitWithin: 5_000
  },
  delete: { query: "status:expired" },
  commit: { waitSearcher: true }
});
```

`SolrJsonUpdateCommands` supports `add`, `delete`, `commit`, `optimize`, and `rollback`. Delete accepts a single ID, an ID array, `{ id, _version_? }`, or `{ query }`. The command object permits one `add` command because JavaScript objects cannot preserve duplicate JSON keys; use `add()` with an array for multiple documents. Request-level `overwrite`, `commitWithin`, and SolrCloud `route` options remain available through the existing `SolrUpdateOptions`.

Solr documents these three JSON forms (single object, document array, and command map) and the `/update/json/docs` and `/update/json` convenience paths in the [Solr 8.x indexing guide (8.11 draft)](https://nightlies.apache.org/solr/draft-guides/solr-reference-guide-8.x/indexing-guide/indexing-and-basic-data-operations.html), [Solr 9.4 Update Handlers guide](https://solr.apache.org/guide/solr/9_4/indexing-guide/indexing-with-update-handlers.html), and [Solr 10.1 Update Handlers guide](https://solr.apache.org/guide/solr/10_1/indexing-guide/indexing-with-update-handlers.html). The public methods are integration-tested against Solr 8.11.4, 9.11.0, and 10.1.0. The archived 8.11 reference material is published as a draft guide; the pinned Solr 8.11.4 integration job is the compatibility evidence for that version. The JSON command-map variants are also exercised independently: delete by ID and query assert persisted deletion, optimize preserves a committed document, rollback discards a pending add, and commit options are used for searcher visibility.

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

## Delete by ID or query

```ts
await solr.delete("book-1", { route: "tenant-a", commitWithin: 1_000 });
await solr.delete({ query: "status:expired" }, { route: "tenant-b" });
```

`SolrDeleteOptions` accepts `route` and `commitWithin`, plus the usual request controls (`signal`, `timeoutMs`, and `headers`). Solr ignores `commitWithin` for delete-by-query, so use it only with delete-by-ID.

## Commit, soft commit, and optimize semantics

```ts
await solr.commit({ waitSearcher: true, openSearcher: true });
await solr.softCommit(); // waits for the new searcher by default
await solr.optimize({ maxSegments: 2, waitSearcher: true });
await solr.rollback();
```

- `SolrCommitOptions` models hard commit (`softCommit: false` or omitted), `waitSearcher`, `expungeDeletes`, and `openSearcher`. `expungeDeletes` is valid only for hard commits.
- `SolrSoftCommitOptions` exposes `waitSearcher` and `openSearcher`; `softCommit()` sets `softCommit: true` and defaults `waitSearcher` to `true`, so it waits until the new searcher is registered. A soft commit is optimized for near-real-time visibility, not hard-commit durability.
- `openSearcher` is sent as a request parameter, not inside the JSON commit/optimize command. It defaults to `true`. Set it to `false` when the commit should not open a searcher; changes will not become searchable until a later searcher is opened.
- `waitSearcher` defaults to `true`. It waits for registration of a searcher when one is opened; it does not itself cause a searcher to open.
- `expungeDeletes` removes deleted documents during a hard commit and defaults to `false`. It is rejected for soft commits.
- `optimize()` accepts `SolrOptimizeOptions` or the numeric `maxSegments` shorthand. `maxSegments` is optimize-only and defaults to Solr's unlimited merge target. Optimize can be expensive and is generally appropriate for static or low-update indexes, not as a routine substitute for commits.
- The legacy `CommitOptions` type remains deprecated for source compatibility; `maxSegments` on `commit()` is rejected. Use `SolrCommitOptions` and `SolrOptimizeOptions`.
- `rollback()` discards uncommitted updates since the last commit.

### commitWithin behavior

`commitWithin` schedules a commit within the requested number of milliseconds. Solr's configured `commitWithin` policy determines whether that scheduled commit is soft or hard; the client does not force a commit type. The default Solr policy is a soft commit, but `solrconfig.xml` can change it. This is configuration-dependent and is not asserted as a hard/soft guarantee by the client.

## Update responses and output validation

All Update Handler methods default to the exported `SolrUpdateResponse` type, which exposes the optional `responseHeader` (including `status` and `QTime`) while preserving custom response typing through the existing generic parameter.

Successful responses can be validated through `validation.outputs` using the public operation name:

```ts
import { z } from "zod";
import { createSolrClient } from "node-solr-lambda";

const client = createSolrClient({
  core: "catalog",
  validation: {
    outputs: {
      add: z.object({
        responseHeader: z.object({ status: z.literal(0), QTime: z.number().optional() })
      }),
      atomicUpdate: z.object({ responseHeader: z.object({ status: z.literal(0) }) })
    }
  }
});

const result = await client.add({ id: "book-1", title: "Typed response" });
console.log(result.responseHeader?.status);
```

Output schemas are selected by operation name: `add`, `update`, `atomicUpdate`, `updateCommands`, `delete`, `commit`, `softCommit`, `optimize`, and `rollback`. Output validation runs for successful HTTP responses. Non-success HTTP responses remain `SolrHttpError`; its `errorResponse` property exposes the typed Solr `{ error: ... }` payload, while `solrError` remains the normalized shortcut for `code`, `msg`, and `metadata`.

## Compatibility

The base add, full-document update, delete-by-ID, hard/soft commit, expungeDeletes, openSearcher=false on commit, optimize with maxSegments, and rollback operations have integration coverage on pinned Solr 8.11.4, 9.11.0, and 10.1.0 images. Add and update response headers are asserted on all three versions; the exact shape of every version-specific error payload remains unit-tested but not exhaustively integration-certified. The openSearcher=false option on optimize is unit-serialization-tested but not independently runtime-verified. Unit and consumer type tests cover the new request-option serialization and validation. The `_route_` and `commitWithin` options introduced in this typed interface remain runtime-unverified on those three versions; do not infer runtime support from their TypeScript types alone.

The request shapes follow the official [Solr 10.1 Indexing with Update Handlers guide](https://solr.apache.org/guide/solr/10_1/indexing-guide/indexing-with-update-handlers.html). The guide documents JSON add/delete commands, `overwrite`, `commitWithin`, and commit/optimize behavior. SolrCloud routing uses the documented `_route_` request parameter.

