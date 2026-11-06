# ADR 0001: GitHub Pages site architecture

- Status: Accepted
- Date: 2026-11-06
- Decision owners: repository maintainers

## Context

The project needs a public, low-maintenance website for TypeScript onboarding and trustworthy project status. The site must not change the npm runtime or package contents. Operation-level compatibility claims must retain their evidence and uncertainty; configured CI matrices are not execution results.

The site also needs isolated pull-request previews and production deployment that does not invalidate previews belonging to other open pull requests.

## Decision

Build a dependency-free static website in `website/`, using semantic HTML, CSS, and small browser-native JavaScript modules. Generate its data at build time with Node.js built-ins from canonical repository files and normalized external snapshots.

- Keep authored page content and styles in `website/`.
- Keep deterministic generators and validators in `scripts/site/`.
- Keep the versioned data contract and JSON Schema in `docs/site-data-contract.md` and `docs/site-data.schema.json`.
- Write generated model and built output only to ignored `build/site-data.json` and `dist-site/` directories.
- Use a repository-path-aware base URL supplied at build time. The static shell centralizes relative asset, navigation, and JSON URLs through `<base href="./">`, so the same artifact works at the repository Pages path and in local preview.
- Core navigation, page headings, and essential content are static HTML. JavaScript is progressive enhancement for filters, search, and dashboards.
- External data is fetched at build time and normalized into snapshots before validation. The public site never makes token-bearing API calls from the browser.
- Keep website tooling outside package runtime dependencies and npm publication contents.

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

## Build and deployment lifecycle

### Pull-request previews

- `.github/workflows/pr-preview.yml` handles `opened`, `reopened`, `synchronize`, and `closed` pull-request events.
- Each PR has an isolated preview at `/pr-preview/<number>/`.
- New commits rebuild and replace only that PR's preview.
- The workflow posts a PR comment containing the preview URL.
- Closing a PR removes its preview.
- Write-enabled preview publishing runs only when the PR head repository is this repository. Fork PRs remain covered by ordinary read-only CI/build checks and receive no write credentials.
- Preview jobs are serialized per PR and cancel superseded builds.

### Production deployment

- A push to `master` builds and validates the site, then publishes `dist-site/` to the root of the `gh-pages` branch.
- Production synchronization explicitly excludes `pr-preview/`; it must never delete or overwrite active previews.
- Production deployments are serialized and do not cancel an in-progress deployment.
- GitHub Pages must publish from the `gh-pages` branch root.
- Production publishing must not run for PR events or non-`master` refs.

### Shared requirements

- Production and preview use the same `npm run build:site` generator, validator, fixtures, and static assembly pipeline.
- The build is deterministic for identical repository inputs, normalized snapshots, and explicit build parameters.
- External feeds are cached as build inputs with explicit retrieval timestamps; rate limits or outages yield stale/unavailable metadata, never invented success or zero.
- P2 feeds and generators are optional and cannot block P1 build/deployment.
- Treat all external and repository text as untrusted; escape it in HTML and never execute it.

## Alternatives considered

1. **Full framework/static-site generator:** rejected for the initial site because it would add an unnecessary second dependency stack.
2. **Client-side calls to GitHub/npm/Apache:** rejected because data would be difficult to authenticate, cache, validate, and rate-limit consistently.
3. **Hand-maintained dashboard facts:** rejected because they duplicate canonical documentation and become stale.
4. **Separate Pages deployment per PR:** rejected because it replaces the single public site and complicates preview lifecycle management.
5. **Production synchronization without preserving preview paths:** rejected because each production deployment would erase active previews.

## Consequences

The `gh-pages` branch contains the production site at its root and active previews below `pr-preview/`. GitHub Pages must be configured to publish from the `gh-pages` branch root. The site remains static and build-time driven; new data sources require normalized snapshots, provenance, deterministic fixtures, and explicit failure semantics. Website tooling remains outside package runtime dependencies and npm publication contents.
