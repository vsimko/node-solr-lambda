# SpellCheck query options

The SpellCheck Search Component is an optional Solr server feature. This client models its request parameters and response data; it does not install dictionaries, add request handlers, load plugins, or mutate Solr configuration. The selected request handler must include a configured SpellCheck component.

## Enable suggestions

```ts
const result = await solr.query<SolrQueryResponse<Product>>({
  query: "title:solr",
  spellcheck: {
    enabled: true,
    query: "solr clent",
    count: 5,
    dictionary: "default",
    extendedResults: true
  }
});

const spellcheck = result.spellcheck;
```

When a `spellcheck` object is supplied, `enabled` defaults to `true`. Set it to `false` to explicitly disable the component for one request. If `spellcheck.query` is omitted, Solr uses the original `q` value.

## Suggestions, frequencies, and collations

`SolrQueryResponse<TDocument>.spellcheck` exposes:

- `suggestions`: term results with offsets, `numFound`, `origFreq`, and alternatives. Solr can serialize NamedList values as a map or as alternating name/value arrays; the response type accepts both.
- `correctlySpelled`: returned when the configured component and extended-results mode provide it.
- `collations`: corrected query candidates, including `collationQuery`, hit counts, and misspelling/correction pairs when extended collation results are enabled.

With `extendedResults: true`, Solr may represent an alternative as a word/frequency tuple or an extended object. The public type models both forms. Set `params: { "json.nl": "map" }` when an object-shaped NamedList response is preferable.

```ts
const result = await solr.query<Product>({
  query: "*:*",
  spellcheck: {
    enabled: true,
    query: "solr clent",
    count: 5,
    extendedResults: true,
    collate: true,
    collateExtendedResults: true,
    maxCollations: 3,
    maxCollationTries: 10,
    collateParams: { "q.op": "AND", mm: "100%" }
  },
  params: { "json.nl": "map" }
});

const suggestions = result.spellcheck?.suggestions;
const collations = result.spellcheck?.collations;
```

A collation is a suggested query string; Solr does not execute that corrected query automatically. The application must decide whether to present or execute it.

## Supported request parameters

The typed options cover the common request surface documented across the pinned Solr 8.11, 9.11, and 10.1 lines:

| TypeScript option | Solr parameter |
| --- | --- |
| `enabled` | `spellcheck` |
| `query` | `spellcheck.q` |
| `count` | `spellcheck.count` |
| `dictionary` | `spellcheck.dictionary` (repeatable) |
| `onlyMorePopular` | `spellcheck.onlyMorePopular` |
| `extendedResults` | `spellcheck.extendedResults` |
| `collate` | `spellcheck.collate` |
| `maxCollations` | `spellcheck.maxCollations` |
| `maxCollationTries` | `spellcheck.maxCollationTries` |
| `maxCollationEvaluations` | `spellcheck.maxCollationEvaluations` |
| `collateExtendedResults` | `spellcheck.collateExtendedResults` |
| `collateMaxCollectDocs` | `spellcheck.collateMaxCollectDocs` |
| `maxResultsForSuggest` | `spellcheck.maxResultsForSuggest` |
| `alternativeTermCount` | `spellcheck.alternativeTermCount` |
| `accuracy` | `spellcheck.accuracy` |
| `queryAnalyzerFieldType` | `spellcheck.queryAnalyzerFieldType` |
| `collateParams` | `spellcheck.collateParam.*` |

Numeric bounds are checked before sending a request: counts are positive integers, maximums are non-negative integers, and accuracy is between 0 and 1. Custom request parameters remain available through `params`; use this for checker-specific or future Solr parameters not modelled here.

Dictionary build/reload controls are deliberately not exposed as ordinary query options. They change server-side dictionary state and should be managed by the Solr operator, not hidden inside a search request.

## Version-specific parameters

The common options above are available across the three pinned Solr lines, so the public type does not fork by version. Parameters added by a future Solr release or by a custom SpellCheck implementation can be passed through `params`; callers remain responsible for checking that the server version and configured component support them.

## Solr references

- [Solr 8.11 Spell Checking guide](https://solr.apache.org/guide/8_11/spell-checking.html)
- [Solr 9.11 SpellCheckComponent API](https://solr.apache.org/docs/9_11_0/core/org/apache/solr/handler/component/SpellCheckComponent.html) and [9.x Spell Checking guide](https://solr.apache.org/guide/solr/9_5/query-guide/spell-checking.html)
- [Solr 10.1 Spell Checking guide](https://solr.apache.org/guide/solr/10_1/query-guide/spell-checking.html)
