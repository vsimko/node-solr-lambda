# ADR 0004: Model Suggester as a query component

- Status: Accepted
- Date: 2026-11-07
- Issue: [#293](https://github.com/vsimko/node-solr-lambda/issues/293)

## Context

Apache Solr's Suggester is implemented as the `SuggestComponent`, attached to a configured SearchHandler. The handler path is deployment-specific; `/suggest` is a common example, not a universal endpoint. A handler may expose the component at `/select` or at a custom path. The server also owns dictionary definitions, lookup implementations, source fields, weight/payload fields, context support, and dictionary build lifecycle.

The client already has a standard typed `query()` API that serializes query components over the shared Fetch transport and preserves custom parameters and request controls.

## Decision

Expose Suggester as an optional typed component on the existing `query()` options, rather than adding a dedicated `SolrClient.suggest()` method or assuming a `/suggest` endpoint.

Model only the stable request parameters documented across the pinned Solr 8.11, 9.11, and 10.1 baselines:

- `suggest` enable/disable;
- repeatable `suggest.dictionary`;
- `suggest.q` and `suggest.count`;
- `suggest.cfq` context filter query;
- explicit `suggest.build`, `suggest.reload`, `suggest.buildAll`, and `suggest.reloadAll` lifecycle controls.

Model the JSON response by dictionary name and lookup text, including `numFound`, suggestion `term`, optional `weight` and `payload`, and unknown server fields. Keep dictionary/lookup configuration out of the client API; preserve custom parameters through the existing `params` escape hatch.

## Alternatives considered

1. **Dedicated `client.suggest()` targeting `/suggest`: rejected.** The path is not universal and the component can be attached to any SearchHandler. Such a method would imply a server configuration that the client cannot guarantee.
2. **Dedicated `client.suggest({ handlerPath })`: rejected.** This duplicates the generic request path mechanism and creates a second query execution API without adding a distinct transport capability.
3. **Only generic request parameters: rejected.** This loses autocomplete, parameter validation, response typing, and discoverability for a common workflow.
4. **Typed wrapper for lookup and dictionary configuration: rejected.** These are server-side deployment concerns with implementation-specific parameter sets and should not be coupled to client query execution.

## Consequences

- Consumers must configure `SuggestComponent` and a dictionary on the SearchHandler they query.
- The client does not create handlers, build dictionaries automatically, or guarantee that a configured dictionary exists.
- Build/reload controls are explicit and can be expensive; applications should not trigger them on every keystroke.
- Runtime compatibility is certified only for the configured-handler request/response flow exercised on each pinned Solr version.
- Custom handlers remain accessible through the generic request escape hatch while reusing the same typed query component serializer.

## Verification

Unit tests cover repeatable dictionary serialization, option validation, disable semantics, and response parsing. Consumer type fixtures cover autocomplete and typed response access. An isolated integration test configures a disposable handler/dictionary, indexes deterministic terms, builds the dictionary explicitly, and reads suggestions back on Solr 8.11.4, 9.11.0, and 10.1.0.
