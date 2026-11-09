# Solr V2 introspection fixtures

Versioned Core Admin V2 introspection captures from the pinned standalone Solr images are committed here:

- `solr-8.11.4-core-admin.json`
- `solr-9.11.0-core-admin.json`
- `solr-10.1.0-core-admin.json`

Each fixture records the image tag, the two valid resource-level introspection paths, capture timestamp, and the `responseHeader`/`spec`/experimental warning returned for the list and per-core resources. The 8.11.4 server also returns a large `availableSubPaths` map containing dynamically generated per-core routes; that volatile map is intentionally omitted from the committed fixture. The operation and command definitions in `spec` are retained as captured.

The CI workflow uploads one version-labelled artifact per pinned image:

- `v2-core-admin-introspection-8.11.4`
- `v2-core-admin-introspection-9.11.0`
- `v2-core-admin-introspection-10.1.0`

Only these resource-level endpoints are introspected:

- `/api/cores/_introspect` — list/create resource
- `/api/cores/{core}/_introspect` — per-core status and command resource

Do not append `/_introspect` to lifecycle action subroutes. Solr returns 404 for those paths on the pinned 9.11.0 and 10.1.0 images; support for reload/rename/unload is instead verified by executing the actual operations. On Solr 8.11.4, the per-core introspection document describes reload/rename/unload as command names on `POST /api/cores/{core}`, not the post-9.3 subroutes used by this client. Those lifecycle methods therefore do not claim 8.11.4 support.

Introspection is experimental discovery evidence, not a stable schema and not a source for generated public TypeScript declarations. Runtime request tests remain authoritative for operation support.
