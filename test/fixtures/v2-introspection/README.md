# Solr V2 introspection fixtures

The standalone integration suite captures the raw Solr responses for these resource-level introspection endpoints on the exact pinned images:

- `/api/cores/_introspect` — list/create resource
- `/api/cores/{core}/_introspect` — per-core status and command resource

The CI workflow uploads one version-labelled artifact per pinned image:

- `v2-core-admin-introspection-8.11.4`
- `v2-core-admin-introspection-9.11.0`
- `v2-core-admin-introspection-10.1.0`

After the capture job passes, copy each artifact's `cores.json` into this directory as `solr-{version}-core-admin.json`. The `introspection.list` and `introspection.status` values are the unmodified JSON response bodies returned by Solr. The surrounding metadata records the exact image, endpoint paths, and capture time.

Do not append `/_introspect` to the lifecycle action subroutes. Solr returns 404 for those paths on the pinned 9.11.0 and 10.1.0 images; the supported reload/rename/unload routes are instead verified by executing the actual operations. On Solr 8.11.4, the per-core introspection document describes reload/rename/unload as command names on `POST /api/cores/{core}`, not the post-9.3 subroutes used by this client. Those lifecycle methods therefore do not claim 8.11.4 support.

Introspection is experimental discovery evidence, not a stable schema and not a source for generated public TypeScript declarations. Runtime request tests remain authoritative for operation support.
