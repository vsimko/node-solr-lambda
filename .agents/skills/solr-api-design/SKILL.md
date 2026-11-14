---
name: solr-api-design
description: Use when adding, changing, or reviewing Solr endpoint support, API modules, request serialization, or client facade methods.
---

# Solr API design

## Canonical documentation

- [Client architecture](../../../docs/architecture.md)
- [Endpoint inventory](../../../docs/endpoint-inventory.md)
- [API coverage](../../../docs/api-coverage.md) and [machine-readable inventory](../../../docs/api-inventory.json)
- The endpoint-specific guide linked from [the documentation index](../../../docs/index.md)

## Procedure

1. Identify the exact Solr endpoint, HTTP method, path, parameters, body contract, response shape, and version-specific behavior from authoritative Solr documentation or verified fixtures.
2. Determine whether the operation belongs in an existing API module. Keep domain request construction in `src/apis/` and public delegation/types in the established client/type structure.
3. Reuse the shared transport. JSON requests use the shared JSON request path; raw/streaming responses use the raw transport only when the endpoint genuinely requires it.
4. Follow existing endpoint naming and method conventions. Do not add a second transport or endpoint-specific Fetch implementation.
5. Prefer a dedicated typed method for stable, commonly used Solr functionality. Keep `request()` / `requestRaw()` as deliberate escape hatches for uncommon or unsupported handlers.
6. Keep endpoint-specific parameters and response contracts accurate. Do not present arbitrary plugin-defined fields as standardized Solr fields.
7. Make behavior differences across Solr versions explicit. A shared method may expose a common contract only when the semantics are genuinely compatible.
8. Preserve request controls, cancellation, timeout, custom headers, and error handling through the shared transport.
9. Consider security, destructive effects, SolrCloud routing, and whether an operation must be opt-in or restricted to disposable test infrastructure.

## Implementation checklist

- [ ] Confirm endpoint contract and version scope.
- [ ] Add/extend the correct API module.
- [ ] Delegate through the public client facade.
- [ ] Export named public types where consumers need them.
- [ ] Reuse shared transport and request controls.
- [ ] Test exact path, method, query parameters, body, response, and errors.
- [ ] Add type-level consumer fixtures.
- [ ] Add integration coverage or explicitly record unverified behavior.
- [ ] Update endpoint inventory, API coverage, compatibility docs, and roadmap as applicable.

## Avoid

- Treating raw-request support as dedicated typed endpoint support.
- Claiming an endpoint is supported merely because it can be called.
- Adding broad `any` or index signatures to avoid modeling stable fields.
- Duplicating transport concerns inside an API module.
