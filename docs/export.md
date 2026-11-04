# Export API

The Export Handler streams a fully sorted result set and is intended for large exports. Unlike a normal query response, the client does not buffer the complete result: `export()` returns the raw Fetch `Response`, whose body is a backpressure-aware `ReadableStream`. Use `exportStream()` when only the byte stream is needed.

## Typed request

Both `fl` and `sort` are required by Solr. Filter queries may be supplied as a string or an array; arrays are sent as repeated `fq` parameters. Sort criteria can use raw Solr syntax or structured field/direction clauses.

```ts
const response = await solr.export({
  q: "status:published",
  fq: ["tenant:one", "active:true"],
  fl: ["id", "price_d", "created_at_dt"],
  sort: [
    { field: "price_d", direction: "asc" },
    { field: "id", direction: "desc" }
  ],
  batchSize: 1000,
  wt: "json"
});

if (!response.ok) throw new Error(`Export failed: ${response.status}`);
for await (const chunk of response.body!) {
  // Process each Uint8Array chunk without buffering the full export.
}
```

For a Web Streams reader, call `response.body.getReader()`. To obtain the body directly:

```ts
const stream = await solr.exportStream({
  fl: "id,title_s",
  sort: "id asc"
});
```

The stream supports normal Web Streams backpressure and cancellation. Request timeout and AbortSignal controls remain active while the body is consumed.

## Field and sort requirements

- Sort fields must be single-valued and have `docValues=true`.
- Sortable field types are `int`, `long`, `float`, `double`, and `string`.
- The field list additionally supports `date` and `boolean`; fields may be single- or multi-valued.
- By default, fields in `fl` need docValues. Solr 10.1 adds `includeStoredFields=true` for stored-only fields; sort fields still require docValues.
- Export does not return scores. Multi-valued docValues may be returned in sorted order rather than insertion order, and duplicate values may be collapsed for sorted-set docValues.

The field type union is descriptive metadata for application schemas; the client cannot infer a field's configured Solr type, cardinality, or docValues setting. Solr validates those properties at request time.

## Parameters and compatibility

`q`, `fq`, `fl`, `sort`, `batchSize`, `expr`, and `wt` are represented explicitly. `customParams` is an escape hatch for additional parameters supported by the target Solr release; it cannot override named properties.

The supported Export writers are `json` and `javabin`; legacy `xsort` is accepted as an alias for JSON. Local `expr` processing must use `input()` as its source. Distributed export requires Streaming Expressions.

The live integration test exercises a raw Export response with a docValues sort field on Solr 8.11.4, 9.11.0, and 10.1.0. A separate Solr 10.1-only test creates a stored-only field and verifies that `includeStoredFields=true` returns its value (PR #261 / CI #648). This option is not claimed for Solr 8/9. Typed parameter serialization and incremental stream consumption have unit coverage.
