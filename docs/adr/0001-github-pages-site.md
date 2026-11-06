# ADR 0001: GitHub Pages site architecture

- Status: Accepted
- Date: 2026-11-06
- Decision owners: repository maintainers

## Context

The project needs a public, low-maintenance website for TypeScript onboarding and trustworthy project status. The site must not change the npm runtime or package contents. Operation-level compatibility claims must retain their evidence and uncertainty; configured CI matrices are not execution results.

## Decision

Build a dependency-free static website in `website/`, using semantic HTML, CSS, and small browser-native JavaScript modules. Generate its data at build time with Node.js built-ins from canonical repository files and normalized external snapshots. Publish the generated static output through a dedicated GitHub Pages workflow.

- Keep authored page content and styles in `website/`.
- Keep deterministic generators and validators in `scripts/site/`.
- Keep the versioned data contract and JSON Schema in `docs/site-data-contract.md` and `docs/site-data.schema.json`.
- Write generated model and built output only to ignored `build/site-data.json` and `dist-site/` directories.
- Use a repository-path-aware base URL supplied at build time; all internal links and assets must pass through one base-path helper.
- Core navigation, page headings, and essential content are server/build-rendered static HTML. JavaScript is progressive enhancement for filters, search, and dashboards.
- External data is fetched at build time and normalized into fixtures/data snapshots before validation. The public site never makes token-bearing API calls from the browser.

## Source-of-truth ownership

| Domain | Authoritative source | Site responsibility |
| --- | --- | --- |
| Product narrative and quick start | `README.md`, canonical `docs/*.md` | Link and summarize only; do not fork technical instructions |
| API operation/type/test evidence | `docs/api-inventory.json`, `docs/api-coverage.md`, `docs/compatibility.md`, `docs/collections-api-coverage.md` | Preserve operation- and version-level distinctions and evidence links |
| Configured CI matrix | `.github/workflows/ci.yml` | Describe configured dimensions only |
| Actual CI outcomes | GitHub Actions workflow runs/jobs | Show observed run state, commit, ref, timestamps, and source URL |
| Roadmap priority/dependencies | `docs/roadmap.md` | Render intended priority and dependency rationale |
| Live issue/PR state | GitHub Issues and Pull Requests | Enrich roadmap references with current state; never write state back into roadmap |
| Published package metadata/downloads | npm Registry metadata and downloads API | Label source, retrieval time, and exact download window |
| Published releases | GitHub Releases/tags and npm Registry | Distinguish actual publication from repository intent |
| Unreleased changes | `CHANGELOG.md` | Keep Unreleased separate from published releases |
| Draft v4 release notes | `docs/release-notes-v4.0.0.md` | Always label as draft until publication |
| Documentation catalogue | `docs/index.md` | Generate navigation links to canonical documents |
| Upstream Solr releases (P2) | Official Apache Solr sources | Report upstream releases, never client compatibility |
| Public TypeScript API (P2) | Built public declaration entry points and package exports | Generate reference from public exports only |
| Historical CI (P2) | GitHub Actions run/job history | Report bounded observations, not compatibility certification |

## Data semantics

Every generated factual record carries a source reference and observation/generation timestamp. Distinguish authored, fetched, and derived data. Missing, stale, partial, unavailable, unknown, unverified, unsupported, failed, and valid zero/empty values are not interchangeable. No family-level CI pass may be promoted to operation-level runtime evidence.

The JSON Schema in `site-data.schema.json` is the machine-readable contract. Its `schemaVersion` is independent of the package version. Breaking field or semantic changes require a schema-version decision and migration note.

## Build and deployment

- Local commands are introduced with the implementation in Issues #275 and #276.
- The build is deterministic for identical repository inputs, normalized snapshots, and explicit build parameters.
- Pull requests run build and validation but never deploy.
- The default branch workflow builds, validates, uploads a Pages artifact, and deploys with least-privilege permissions.
- External feeds are cached as build inputs with explicit retrieval timestamps; rate limits or outages yield stale/unavailable metadata, never invented success or zero.
- P2 feeds and generators are optional and cannot block P1 build/deployment.

## Alternatives considered

1. **Full framework/static-site generator:** rejected for the initial site because the project needs a small set of data-driven pages and should avoid a second dependency stack.
2. **Client-side calls to GitHub/npm/Apache:** rejected because GitHub access would require credentials or be rate-limited, and client-visible data would be difficult to validate and cache consistently.
3. **Hand-maintained dashboard facts:** rejected because it duplicates canonical documentation and quickly becomes stale.
4. **Server-rendered application:** rejected because GitHub Pages is static hosting and a runtime service is unnecessary.

## Consequences

The site is intentionally static and build-time driven. New data sources require normalized snapshots, provenance, deterministic fixtures, and explicit failure semantics. The website tooling remains outside package runtime dependencies and npm publication contents.
