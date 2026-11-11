# Solr V2 introspection fixtures

This directory keeps two distinct representations of the Core Admin V2 introspection evidence for the pinned standalone Solr images.

## Original CI captures

The files under `raw/` are compacted JSON payloads extracted from the original `cores.json` members of GitHub Actions CI run #971:

- `raw/solr-8.11.4-core-admin.json`
- `raw/solr-9.11.0-core-admin.json`
- `raw/solr-10.1.0-core-admin.json`

Compaction removes insignificant JSON whitespace only; it does not normalize, omit, rename, or otherwise rewrite payload fields. The SHA-256 assertions in `test/v2-introspection.test.ts` are calculated from the compacted original artifact members, independently of the committed fixture files. The original ZIP artifacts remain available in GitHub Actions as the byte-level source captures.

The snapshots retain the capture metadata, dynamically generated per-core resource path, full response structure, experimental warning, and (on 8.11.4) the complete `availableSubPaths` map. The generated core name and its subpaths are instance-specific and must not be used to infer stable route support.

## Curated fixtures

The files at this directory's root are curated, normalized extracts used by semantic tests:

- `solr-8.11.4-core-admin.json`
- `solr-9.11.0-core-admin.json`
- `solr-10.1.0-core-admin.json`

They preserve the version-specific route and command evidence needed by the tests, but are not complete server captures. Their metadata endpoint paths use the stable `/api/cores/{core}/_introspect` placeholder. Verbose schema descriptions and generated per-core route details may be reduced or omitted in these curated files. Use the `raw/` files whenever the complete original server response is required.

## CI artifact provenance

The CI workflow uploads one version-labelled artifact per pinned image:

- `v2-core-admin-introspection-8.11.4`
- `v2-core-admin-introspection-9.11.0`
- `v2-core-admin-introspection-10.1.0`

Only these resource-level endpoints are introspected:

- `/api/cores/_introspect` — list/create resource
- `/api/cores/{core}/_introspect` — per-core status and command resource

Do not append `/_introspect` to lifecycle action subroutes. Solr returns 404 for those paths on the pinned 9.11.0 and 10.1.0 images; support for reload/rename/unload is instead verified by executing the actual operations. On Solr 8.11.4, the per-core introspection document describes reload/rename/unload as command names on `POST /api/cores/{core}`, not the post-9.3 subroutes used by this client. Those lifecycle methods therefore do not claim 8.11.4 support.

Introspection is experimental discovery evidence, not a stable schema and not a source for generated public TypeScript declarations. Runtime request tests remain authoritative for operation support.
