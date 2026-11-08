# Solr V2 introspection fixtures

Raw Core Admin V2 introspection documents are captured by the standalone integration job on the exact pinned Solr image. The CI workflow uploads one artifact for each version where V2 Core Admin is documented and exercised:

- `v2-core-admin-introspection-9.11.0`
- `v2-core-admin-introspection-10.1.0`

The JSON file contains capture metadata and the unmodified introspection documents for list, single-core status, reload, rename, and unload. After a successful CI run, copy each artifact's `cores.json` into this directory as `solr-{version}-core-admin.json`.

Do not synthesize or normalize these documents. They are experimental discovery evidence, not a stable schema and not a source for generated public TypeScript declarations. Solr 8.11.4 is intentionally omitted because its CoreAdmin guide documents V1 only; V2 Core Admin behavior remains unverified on that baseline.
