# RealTime Get API

Use `get()` to retrieve the latest version of a document by its unique key through Solr's implicit `/get` handler. Unlike `query()`, RealTime Get reads from the update log and can return a recently indexed document before a searcher has reopened. This is useful for read-after-write workflows; it does not replace normal search queries.

## Single document

A single-ID request returns a `doc` property. Supply the document shape as the generic type argument:

```ts
interface Product {
  id: string;
  title: string;
  price: number;
}

const result = await solr.get<Product>({
  id: "book-42",
  fields: ["id", "title", "price"]
});

const product: Product | null | undefined = result.doc;
```

## Multiple documents

A multi-ID request uses an `ids` tuple containing at least two unique keys. Solr returns the query-shaped `response.docs` structure for multi-ID requests:

```ts
const result = await solr.get<Product>({
  ids: ["book-42", "book-43"],
  fields: ["id", "title"]
});

const products: Product[] | undefined = result.response?.docs;
```

The single-ID and multi-ID forms are mutually exclusive. The multi-ID form is serialized as Solr's comma-separated `ids` parameter; IDs containing commas are rejected rather than being interpreted ambiguously.

## Filters, fields, and custom parameters

- `fields` maps to `fl` and accepts one field or a list of fields.
- `filter` maps to one or more `fq` parameters. Filters are useful when the caller needs an additional server-side constraint, including an application-specific authorization filter.
- `params` carries other scalar or repeated Solr parameters. The reserved `id`, `ids`, `fl`, and `fq` parameters must use their typed properties and cannot be overridden through `params`.
- The second argument accepts the same request controls as other client methods, including cancellation, timeout, and configured input/output validation.

The handler is addressed through the configured core or collection path: `/solr/{core-or-collection}/get`.

## RealTime Get versus query

A successful `add()` or `update()` does not necessarily make a document visible to `query()` immediately; search visibility depends on a commit or searcher reopen. RealTime Get can retrieve the latest document version through the update log without that searcher reopen. The feature relies on Solr's update log. Do not disable the `/get` handler in SolrCloud: Solr documents that it is used during replica synchronization and recovery as well as direct reads.

This client models the documented single-ID and multi-ID response shapes separately. It does not claim that every optional handler parameter or every custom request-handler configuration is runtime-certified.

## Solr references

- [Solr 8.11 Reference Guide](https://solr.apache.org/guide/8_11/index.html) — Configuration Guide, RealTime Get.
- [Solr 9.11 Reference Guide](https://solr.apache.org/guide/solr/9_11/index.html) — Configuration Guide, RealTime Get.
- [Solr 10.1 RealTime Get](https://solr.apache.org/guide/solr/10_1/configuration-guide/realtime-get.html).

## Verification

The isolated integration test in `test/integration/solr-get.test.ts` inserts unique disposable documents without an immediate searcher reopen, confirms that `query()` cannot see the single-ID fixture yet, then verifies direct single-ID and multi-ID read-back through `get()`. This test runs in the pinned Solr 8.11.4, 9.11.0, and 10.1.0 integration matrix; compatibility claims remain limited to the operations and parameters asserted by that test.
