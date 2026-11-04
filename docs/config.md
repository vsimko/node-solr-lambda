# Config API

Use `config()` with the exported `SolrConfigCommand` discriminated union. Common `set-property` names and their value types are modelled explicitly for the pinned Solr 8.11, 9.11, and 10.1 baselines. The method returns a typed `SolrConfigCommandResponse` by default. Use `getConfig()` for the effective configuration and `getConfigOverlay()` for the persisted overlay; both have typed response models.

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

Typed command families include set/unset properties, request handlers, search components, query response writers, init params, query parsers, value-source parsers, transformers, update processors, query converters, listeners, and expressible components. `SolrRequestHandlerConfig` exposes typed `handleSelect` plus `defaults`, `appends`, and `invariants` through `SolrConfigRequestHandlerParams`; common request parameters such as `q`, `fq`, `fl`, `rows`, `start`, `sort`, `wt`, `echoParams`, and time limits receive value-aware autocomplete, while the parameter map remains open for Solr extensions. Read models distinguish request handlers, search components, response writers, listeners, and init-params sets; response writers expose `contentType`/`charset`, and listeners expose standard event names with custom plugin event names still accepted. Cache settings are configured through `set-property` (for example, `query.filterCache.size`), not through a separate cache command. Search-component option maps and other plugin-defined component settings remain open; `customOptions` is the explicit flattened escape hatch for plugin-specific command properties. The library does not claim to validate every plugin's schema. Check the documentation for the target Solr version before applying configuration changes.

## Common properties and response types

`set-property` and `unset-property` accept the common property names documented across the supported Solr baselines. Their value types are specific to each property (for example, cache sizes and commit limits are numbers, while `openSearcher` and `commitWithin.softCommit` are booleans). Solr-version-specific properties that are not shared by all three pinned baselines are deliberately not included in this cross-version union.

`set-user-property` remains open to arbitrary user-defined names and JSON-compatible values. Plugin-specific options remain available through `customOptions` because plugin configuration is implementation-dependent.

The typed read models expose the common sections returned by GET `/config`: query caches and sizing settings, update-handler commit settings, request-dispatcher parser settings, request handlers, search components, response writers, init params, listeners, directory factories, index configuration, and codec factories. Unmodelled plugin-specific response fields remain `unknown` rather than being treated as validated data.

```ts
import type {
  SolrConfigCommandResponse,
  SolrConfigRequestHandlerParams,
  SolrConfigRequestHandlerSettings,
  SolrConfigResponseWriterSettings,
  SolrConfigListenerSettings,
  SolrConfigReadResponse,
  SolrConfigOverlayResponse
} from "node-solr-lambda";

const mutation: Promise<SolrConfigCommandResponse> = solr.config({
  "set-property": {
    "query.filterCache.size": 512,
    "updateHandler.autoCommit.openSearcher": false
  }
});

const effectiveConfig: Promise<SolrConfigReadResponse> = solr.getConfig();
const overlay: Promise<SolrConfigOverlayResponse> = solr.getConfigOverlay();

const handlerDefaults: SolrConfigRequestHandlerParams = {
  rows: 25,
  wt: "json",
  echoParams: "explicit",
  fq: ["status:published"]
};
void effectiveConfig.then(result => {
  const requestHandler: SolrConfigRequestHandlerSettings | undefined = result.config?.requestHandler?.["/select"];
  void requestHandler;
});
const responseWriter: SolrConfigResponseWriterSettings = {
  class: "solr.JSONResponseWriter",
  contentType: "application/json",
  charset: "UTF-8"
};
const listener: SolrConfigListenerSettings = {
  class: "solr.QuerySenderListener",
  event: "postCommit"
};
void [handlerDefaults, requestHandlers, responseWriter, listener];
```


## Read, mutation, and persistence semantics

`getConfig()` issues GET `/config` and returns the effective configuration: settings from `solrconfig.xml` together with applicable persisted overlay changes. `getConfigOverlay()` issues GET `/config/overlay` and returns only the overlay state, including user properties when present.

`config()` sends the typed command as POST `/config`. `set-property`, `unset-property`, and `set-user-property` modify the Config API overlay; they do not rewrite `solrconfig.xml`. Overlay changes are persisted by Solr and are distinct from transient runtime state. Solr may apply a configuration change immediately, but whether a component observes it without a core reload depends on the setting and Solr version. Treat a successful mutation response as confirmation that Solr accepted the command, not as proof that every affected component has reinitialized. Read back with `getConfigOverlay()` to verify persisted overlay content and `getConfig()` to inspect the effective result.

For production changes, retain the previous overlay value and plan a rollback command. Avoid claiming a setting is hot-reloadable unless the relevant Solr version and component documentation explicitly says so.
