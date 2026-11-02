# Config API

Use `config()` with the exported `SolrConfigCommand` discriminated union. Command names select their payload models. Known common and version-specific property paths have dedicated value types and editor completion through `SolrConfigPropertyMap`. Unknown property names are rejected rather than silently disabling typo detection; use `requestRaw()` for Config API properties that are not modelled yet.

## Common properties: caches, query settings, and update handlers

```ts
const changed = await solr.config({
  "set-property": {
    "query.filterCache.size": 512,
    "query.filterCache.autowarmCount": "128",
    "query.maxBooleanClauses": 2_048,
    "updateHandler.autoCommit.maxTime": 15_000,
    "updateHandler.autoCommit.openSearcher": false,
    "updateHandler.autoSoftCommit.maxTime": 1_000
  }
});
console.log(changed.responseHeader?.status, changed.responseHeader?.QTime);

await solr.config({
  "unset-property": [
    "query.filterCache.size",
    "updateHandler.autoCommit.maxTime"
  ]
});
```

The property map includes common update-handler commit settings, filter/query-result/document/field-value cache settings, query sizing and circuit-breaker settings, and request-parser controls. Some entries are version-specific: circuit-breaker names differ between Solr 9 and 10, and request-dispatcher options vary by release. Solr still validates property names and values at runtime; select properties documented for the server version you operate.

## Components and plugin configuration

```ts
await solr.config({
  "add-requesthandler": {
    name: "/select",
    class: "solr.SearchHandler",
    startup: "lazy",
    defaults: { rows: 20, wt: "json" }
  }
});

await solr.config({
  "update-requesthandler": {
    name: "/select",
    class: "solr.SearchHandler",
    defaults: { rows: 50, wt: "json" }
  }
});

await solr.config({ "delete-requesthandler": "/select" });
```

Typed command families include set/unset properties, request handlers, search components, query response writers, init params, query parsers, value-source parsers, transformers, update processors, query converters, listeners, and expressible components. Cache settings are configured through `set-property`, not through a separate cache command. Plugin-specific component properties can be supplied through the explicit `customOptions` escape hatch, which is flattened into the native component definition.

## Read effective config and overlay responses

The default mutation return type is `SolrConfigCommandResponse`. For read endpoints, use the typed response models with the raw request method:

```ts
import type { SolrConfigReadResponse, SolrConfigOverlayResponse } from "node-solr-lambda";

const effective = await solr.request<SolrConfigReadResponse>("/solr/books/config");
const overlay = await solr.request<SolrConfigOverlayResponse>("/solr/books/config/overlay");

const maxCommitTime = effective.config?.updateHandler?.autoCommit?.maxTime;
const cacheSize = effective.config?.query?.filterCache?.size;
const overlayCacheSize = overlay.overlay?.props?.query?.filterCache?.size;
const tenantProperty = overlay.overlay?.userProps?.["tenant.name"];
void [maxCommitTime, cacheSize, overlayCacheSize, tenantProperty];
```

`GET /config` returns the effective configuration merged from the underlying `solrconfig.xml` and JSON overlay. `GET /config/overlay` returns only settings stored in `configoverlay.json`, including the ZooKeeper node version, common properties, and user properties. These models cover common settings and documented component groups; custom plugin sections remain extensible.

## Behavior and compatibility

Config API writes update `configoverlay.json`; they do not edit `solrconfig.xml`. In SolrCloud, cores watch the configset in ZooKeeper and apply updates when the configset changes. Most config overlay updates trigger a core reload; request-parameter set changes are handled separately by the Request Parameters API. Avoid writing directly to config files while a core is active.

The V1 Config API is used by `config()` at `/solr/{core-or-collection}/config`. Solr 10.1 also documents V2 routes, but this client does not claim support for those V2 routes. The common cache property `query.filterCache.size` is integration-tested with set, overlay read-back, and unset on pinned Solr 8.11.4, 9.11.0, and 10.1.0 images. Other component-specific settings and plugin values are type/serialization-covered but require target-version integration tests before claiming runtime compatibility.

Official references:
- [Solr 8.11 Config API (draft reference guide)](https://solr.apache.org/guide/8_11/config-api.html)
- [Solr 9.5 Config API](https://solr.apache.org/guide/solr/9_11/configuration-guide/config-api.html)
- [Solr 10.1 Config API](https://solr.apache.org/guide/solr/10_1/configuration-guide/config-api.html)
