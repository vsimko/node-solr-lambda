# Website data contract

The website consumes a deterministic, versioned JSON document generated during the site build. This contract is separate from the npm package version and from GitHub Pages deployment metadata.

## Model envelope

The top-level object has:

- `schemaVersion`: integer contract version; initial value `1`.
- `generatedAt`: UTC ISO-8601 timestamp supplied explicitly by the build.
- `package`: repository package identity and source metadata; not a substitute for published npm state.
- `sources`: provenance/freshness records for every source used.
- `apiCoverage`, `ci`, `roadmap`, `npm`, `releases`, and `documentation`: P1 domains.
- `upstreamSolr`, `typescriptApi`, and `ciHistory`: optional P2 domains.

The initial JSON Schema is [site-data.schema.json](site-data.schema.json).

## Provenance and freshness

Every source record contains a stable `id`, `kind` (`repository`, `github`, `npm`, or `apache`), canonical `url`, `retrievedAt`, and `status` (`available`, `stale`, or `unavailable`). Optional `revision` identifies a commit, tag, workflow run, registry version, or snapshot. A derived claim references one or more source IDs and, where applicable, a canonical repository path and JSON pointer.

The generated document distinguishes:
- authored facts copied from canonical repository sources;
- fetched facts from external services;
- derived facts calculated from those inputs.

A timestamp is never fabricated. A failed fetch must preserve the last successful snapshot only when its retrieval time is retained and its status is marked stale. Without a usable snapshot, represent the domain as unavailable. Do not convert missing metrics to zero.

## P1 domain semantics

### API coverage and compatibility

Operation records retain stable inventory IDs and evidence at operation/version granularity. Implementation, type coverage, unit-test presence, integration-test status, and per-version runtime verification remain independent fields. Allowed semantic states include `verified`, `partial`, `unverified`, `unsupported`, and `unknown`. Collections actions retain their own matrix/evidence. A Solr major-level label is not an operation certification.

### GitHub Actions

Configured matrix dimensions are sourced from workflow YAML and stored separately from observed runs in `ci.configuredMatrix`, each with a dimension, values, and source path. Run records include run ID, workflow, URL, event, ref, commit SHA, status/conclusion, and timestamps. In-progress, cancelled, skipped, failure, and unavailable are distinct. A configured matrix entry never implies a successful run.

### Roadmap and tracked work

Priority and dependency rationale come from `docs/roadmap.md`; live state, labels, milestone, merge state, and URLs come from GitHub. GitHub wins for current issue/PR state. The roadmap remains authoritative for intended priority and rationale. Missing/deleted/private/unavailable tracked items must not silently become open or closed.

### npm

Published version, dist-tags, publication metadata, and download counts come from npm Registry APIs. Download counts include an explicit named window and start/end dates. Repository `package.json`, prerelease tags, and draft notes are separate facts from publication.

### Releases

Published release/tag and npm publication state are external published facts. The `releases.unreleased` object carries a separately sourced excerpt of the `CHANGELOG.md` Unreleased section; draft release notes remain explicitly labelled draft. `CHANGELOG.md` Unreleased remains unreleased. `docs/release-notes-v4.0.0.md` remains draft until a corresponding actual release is confirmed.

### Documentation

Catalogue entries originate from `docs/index.md` and link to canonical Markdown/API reference files. The generated catalogue must not copy complete guide prose or become a competing specification.

## P2 domain semantics

- Apache Solr release information must use official Apache sources and be labelled upstream-only, separate from this client's compatibility matrix.
- TypeScript API reference generation reads package public exports/declarations and excludes private/internal declarations.
- Historical CI trends use an explicit bounded retention window, stable run/job identity, and explicit duration units. Missing history is unknown, not zero; trend data is informational and not compatibility certification.

## Determinism and security

- Normalize remote responses into checked-in or otherwise immutable build snapshots before validation.
- Inject the reference time; validators must not read the wall clock or access the network.
- Sort records and diagnostics by stable keys.
- Treat all external and repository text as untrusted data; escape it in HTML and never execute it.
- Never include secrets, credentials, environment values, or unredacted logs.
- External API failures/rate limits must produce stale/unavailable states and a visible last-updated/source note.
- P2 domains are optional and must not gate P1 generation, validation, or deployment.

## Change policy

A change that alters field meaning or required fields updates the schema, fixtures, generator, validator, and this document in one PR. Additive optional fields may remain within schema version 1. Breaking changes require a schema-version increment and migration note.
