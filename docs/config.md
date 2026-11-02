# Config API

Use `config()` with the exported `SolrConfigCommand` discriminated union. Common `set-property` names and their value types are modelled explicitly for the pinned Solr 8.11, 9.11, and 10.1 baselines. The method returns a typed `SolrConfigCommandResponse` by default; use `SolrConfigReadResponse` and `SolrConfigOverlayResponse` with `request<T>()` for GET reads.

```ts
await solr.config({
  "set-property": { "query.maxBooleanClauses": 10_000 }
});

await solr.config({
  "add-requesthandler": {
    name: "/select",
    class: "solr.SearchHandler",
    startup: "lazy",
    defaults: { rows: 20, wt: "json" }
  }
});
```

Typed command families include set/unset properties, request handlers, search components, query response writers, init params, query parsers, value-source parsers, transformers, update processors, query converters, listeners, and expressible components. Cache settings are configured through `set-property` (for example, `query.filterCache.size`), not through a separate cache command. Plugin-specific properties can be supplied through the explicit `customOptions` escape hatch, which is flattened into the native component definition. Plugin-specific settings and values remain subject to the Solr Config API and installed plugin implementation. Check the documentation for the target Solr version before applying configuration changes.

## Common properties and response types

`set-property` and `unset-property` accept the common property names documented across the supported Solr baselines. Their value types are specific to each property (for example, cache sizes and commit limits are numbers, while `openSearcher` and `commitWithin.softCommit` are booleans). Solr-version-specific properties that are not shared by all three pinned baselines are deliberately not included in this cross-version union.

`set-user-property` remains open to arbitrary user-defined names and JSON-compatible values. Plugin-specific options remain available through `customOptions` because plugin configuration is implementation-dependent.

The typed read models expose the common sections returned by GET `/config`: query caches and sizing settings, update-handler commit settings, request-dispatcher parser settings, request handlers, search components, response writers, init params, listeners, directory factories, index configuration, and codec factories. Unmodelled plugin-specific response fields remain `unknown` rather than being treated as validated data.

```ts
import type {
  SolrConfigCommandResponse,
  SolrConfigReadResponse,
  SolrConfigOverlayResponse
} from "node-solr-lambda";

const mutation: Promise<SolrConfigCommandResponse> = solr.config({
  "set-property": {
    "query.filterCache.size": 512,
    "updateHandler.autoCommit.openSearcher": false
  }
});

const effectiveConfig: Promise<SolrConfigReadResponse> =
  solr.request<SolrConfigReadResponse>("/solr/catalog/config");

const overlay: Promise<SolrConfigOverlayResponse> =
  solr.request<SolrConfigOverlayResponse>("/solr/catalog/config/overlay");
```
