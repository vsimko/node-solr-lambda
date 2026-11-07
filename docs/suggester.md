# Suggester query options

Solr's Suggester is an optional Search Component that returns autocomplete candidates from one or more dictionaries configured on the server. This client models the request parameters and JSON response; it does not install the component, create dictionaries, configure lookup implementations, or mutate Solr configuration.

## Query through the existing query API

The Suggester is a component, not a fixed endpoint. A Solr administrator attaches it to a SearchHandler, which may be `/select`, `/suggest`, or another deployment-specific path. The typed API therefore exposes Suggester options on `query()` rather than assuming that every core has a `/suggest` handler.

```ts
const result = await solr.query<Product>({
  query: "*:*",
  suggest: {
    enabled: true,
    dictionary: "products",
    query: "lap",
    count: 5
  }
});

const suggestions = result.suggest?.products?.lap?.suggestions;
```

When a `suggest` object is supplied, `enabled` defaults to `true`. The dictionary name must match a suggester configured on the selected SearchHandler, unless the handler defines a default dictionary. If `suggest.query` is omitted, Solr uses the original `q` parameter.

## Request options

| TypeScript option | Solr parameter | Notes |
| --- | --- | --- |
| `enabled` | `suggest` | Defaults to `true`; set false to suppress dependent options |
| `dictionary` | `suggest.dictionary` | One or more configured dictionary names; repeated parameter |
| `query` | `suggest.q` | Defaults to the query's `q` value |
| `count` | `suggest.count` | Positive integer; Solr default is 1 |
| `contextFilterQuery` | `suggest.cfq` | Only supported by selected lookup implementations and document dictionaries |
| `build` | `suggest.build` | Build the selected dictionary before lookup |
| `reload` | `suggest.reload` | Reload the selected dictionary |
| `buildAll` | `suggest.buildAll` | Build all configured dictionaries |
| `reloadAll` | `suggest.reloadAll` | Reload all configured dictionaries |

Build and reload flags change server-side dictionary state. They are exposed as explicit opt-in request controls, not as automatic client behavior. Do not set them on every user keystroke; manage dictionary lifecycle according to the Solr deployment's indexing and refresh strategy.

Unknown and plugin-specific parameters remain available through the existing `params` object. Lookup implementation and dictionary configuration are intentionally outside the typed request model.

## Response

The JSON response is keyed by dictionary name and then by the lookup text:

```ts
interface SolrSuggesterResponse {
  [dictionaryName: string]: {
    [queryText: string]: {
      numFound?: number;
      suggestions?: readonly {
        term: string;
        weight?: number;
        payload?: string;
        [key: string]: unknown;
      }[];
    };
  };
}
```

The public type preserves unknown server fields because payloads and extra metadata can depend on the configured dictionary implementation. Use `params: { "json.nl": "map" }` when a map-shaped JSON NamedList response is preferable.

## Server configuration boundary

The selected SearchHandler must include `solr.SuggestComponent` and at least one configured suggester dictionary. A typical server-side configuration chooses a lookup implementation, dictionary implementation, source field, and optional weight/payload/context fields. Those settings are deployment-specific and are not created or modified by this client.

The default Solr `/select` handler does not necessarily include Suggester. If the component is attached to another handler, use the generic request escape hatch with that handler path; the typed query component serializer remains the same.

## Compatibility and verification

The typed request parameters are based on the Suggester Search Component and Suggest Request Handler documented in the Solr 8.11, 9.11, and 10.1 guides. The isolated integration test configures a disposable SearchHandler and dictionary, indexes deterministic terms, builds the dictionary explicitly, and verifies returned suggestions on the pinned Solr 8.11.4, 9.11.0, and 10.1.0 images. Runtime certification remains operation/version-specific and is recorded in the compatibility matrix.

## Solr references

- [Solr 8.11 Suggester guide](https://solr.apache.org/guide/8_11/query-guide/suggester.html)
- [Solr 9.11 Suggester guide](https://solr.apache.org/guide/solr/9_11/query-guide/suggester.html)
- [Solr 10.1 Suggester guide](https://solr.apache.org/guide/solr/10_1/query-guide/suggester.html)
