# ADR 0007: Project identity migration

- **Status:** Proposed; maintainer-selected candidate identified, external availability and clearance not yet verified
- **Date:** 2026-11-13
- **Owners:** Maintainers
- **Tracking:** [#288](https://github.com/vsimko/node-solr-lambda/issues/288), [#289](https://github.com/vsimko/node-solr-lambda/issues/289), [#290](https://github.com/vsimko/node-solr-lambda/issues/290)
- **Decision direction:** Rename both the GitHub repository and the npm package (maintainer preference B)

## Context

The current identity, `node-solr-lambda`, no longer describes the product particularly well. The project is now a general, typed Apache Solr client for JavaScript, TypeScript, and Node.js. The historical `lambda` suffix is misleading, while the current package/repository name is long and does not communicate the current API direction.

The maintainer has selected a full GitHub repository and npm package rename as the preferred direction. This ADR records the migration design and gates. It does **not** authorize an immediate repository rename, npm publication, package deprecation, or domain purchase.

## Decision constraints

The final identity must:

1. Describe an Apache Solr client without implying that it is an Apache Software Foundation project or officially endorsed by Apache.
2. Be concise, pronounceable, searchable, and usable as both a GitHub repository name and npm package name (or have a clearly documented scoped-package mapping).
3. Avoid known existing package/project collisions and confusing similarity to established Solr clients.
4. Have a verified npm namespace/package path, GitHub repository name, domain strategy, and preliminary trademark review before approval.
5. Support a staged migration with a working old package path and redirecting old GitHub repository URL.

## Candidate screening (not availability claims)

The maintainer selected the following candidate on 2026-11-13 for final screening:

- **Display name:** Solr TS Client
- **Proposed GitHub repository:** `solr-ts-client`
- **Proposed npm package:** `solr-ts-client`
- **Proposed import specifier:** `solr-ts-client`
- **Intended “TS” meaning:** both TypeScript and type-safe.

This is the maintainer-selected candidate, but it is **not yet cleared for migration**. No availability or trademark claim is made. The spelling must remain **Solr** (the Apache Solr product name), not “Solar”.

### Maintainer selection and follow-up screening (2026-11-13)

The maintainer explicitly selected `solr-ts-client` as the intended GitHub repository, npm package, and import specifier.

Follow-up checks produced these results:

- Exact public GitHub repository searches for `solr-ts-client` returned zero results. This is a search result, not a namespace reservation or guarantee of availability.
- The exact npm registry metadata lookup could not be completed because network/DNS access from the research environment failed. npm package availability and ownership remain unverified.
- RDAP lookups for `solr-ts-client.com`, `solr-ts-client.dev`, and `solr-ts-client.io` could not be completed because the RDAP endpoints were inaccessible. No domain availability claim is made.
- Search-engine queries did not produce authoritative trademark-register clearance. No trademark clearance is claimed.
- The existing SolrTS project remains a close conceptual and visual neighbor and creates a discoverability/confusion risk that must be explicitly accepted or mitigated.

Accordingly, the candidate is selected by the maintainer, but the identity migration remains **NO-GO** until npm ownership/availability, domain strategy, and trademark review are verified by an authorized maintainer and the SolrTS confusion risk is resolved. This update does not authorize repository rename, package reservation/publication, deprecation, or domain purchase.

**Newly identified naming conflict:** an existing project named **SolrTS** describes itself as a TypeScript client for Solr and is associated with the GitHub repository [h-sslefree/solrts](https://github.com/h-sslefree/solrts); its documented package/import name is `solrts`. This is a close conceptual and visual neighbor to “Solr TS Client”. The distinct proposed identifier `solr-ts-client` is not thereby proven unavailable, but the overlap creates a discoverability and brand-confusion risk that must be explicitly weighed before final approval. Do not imply affiliation with that project.

| Candidate | Rationale | Known concern / next check |
|---|---|---|
| `solr-ts-client` | Short, clear client identity; “TS” intentionally conveys TypeScript and type-safe | Maintainer-preferred candidate, but close existing SolrTS project creates brand-confusion risk; verify exact npm package, global GitHub repository name, domain and trademark |
| `solr-client-ts` | Clear client and TypeScript positioning | Verify exact npm package, GitHub repository, domain and trademark |
| `solr-fetch-client` | Highlights the Fetch-based transport | Transport may be an implementation detail rather than enduring identity |
| `node-solr-client-ts` | Explicit Node.js and TypeScript positioning | Long; verify exact npm package, GitHub repository, domain and trademark |
| `solr-http-client` | Broad, understandable description | Generic and potentially crowded; verify all namespaces |

Previously identified names requiring exclusion or careful collision review include `solr-client`, `solrkit`, `solr-node-client`, `solrcraft`, and `solrbridge`. Exact npm registry availability remains **unverified**; direct registry lookup timed out in the current environment. Connected-installation GitHub searches are not global namespace checks, and no domain or trademark clearance is claimed.

## Migration strategy

### 1. Select and reserve identity

- Complete exact npm registry checks for unscoped and, if needed, scoped names.
- Check GitHub repository and organization/user namespace collisions.
- Check the desired domain and practical fallback domains.
- Perform a preliminary trademark search in relevant jurisdictions and review Apache trademark guidance.
- Record the selected GitHub repository name, npm package name, domain decision, and rationale in this ADR.
- Obtain explicit maintainer approval before any reservation, rename, or purchase that has external effects.

### 2. Prepare code and release metadata

Before renaming the repository, update all tracked references in one reviewed change set:

- `package.json`: `name`, repository, homepage, bugs, and package metadata.
- README installation/import examples and all documentation commands.
- Website source, generated website data, metadata, canonical URLs, badges, and links.
- GitHub Actions workflows, permissions, environment references, release automation, and trusted-publisher documentation.
- Tests, fixtures, package-consumer tests, scripts, lockfiles, and release notes.
- Issue templates, discussions, funding/security/contact metadata, and external integration configuration where applicable.

Do not mechanically replace historical references that are intentionally retained for migration instructions, changelog history, or old package support.

### 3. GitHub repository rename

- Schedule the rename separately from a release cut.
- Rename the existing repository rather than creating a disconnected replacement, preserving issues, PRs, stars, and GitHub's redirect behavior.
- Update local clone remotes, badges, links, Pages settings/custom domain, Actions references, and external integrations.
- Verify the old repository URL redirects and that Pages and preview deployments resolve correctly.
- Keep a record of the previous canonical URL and exact rename time.

### 4. npm package transition

- Publish the new package under the selected name only after its metadata, tarball, provenance, ESM/CommonJS exports, and consumer smoke tests pass.
- Keep the old `node-solr-lambda` package available during a compatibility window. Do not immediately unpublish it.
- Decide whether the old package receives a thin compatibility release or a deprecation notice with an explicit replacement and migration instructions. Do not promise API compatibility unless it is actually provided and tested.
- Deprecate old versions/package only after the new package is publicly installable and verified, and after explicit maintainer approval.
- Document whether future security fixes are backported to the old package during the transition.

### 5. Trusted publishing and provenance

The current publish workflow is `.github/workflows/publish.yml`, restricted to manual dispatch on `master`, with the protected `npm-publish` environment and OIDC `id-token: write` permission. After the repository and package rename:

- Update the npm Trusted Publisher owner/repository/workflow/environment tuple to the new repository and package.
- Recheck Node/npm versions required for npm trusted publishing.
- Recreate or update the GitHub `npm-publish` environment and required reviewers.
- Verify provenance points to the new public repository and exact commit.
- Run a prerelease publication only with explicit release-owner approval; do not use a stable release as a configuration test.

The current npm account settings and trusted-publisher state are not visible from repository files and must be verified by an authorized maintainer.

## Dependency order

1. Candidate screening and final name approval.
2. Complete identity-reference inventory and migration checklist.
3. Update source/docs/workflows/tests on a branch; CI and package-consumer tests pass.
4. Verify new npm package namespace and Trusted Publisher configuration plan.
5. Merge preparation PR; do not publish yet.
6. Rename GitHub repository and update external settings in a coordinated window.
7. Verify redirects, Pages, Actions, clone remotes, and provenance configuration.
8. Publish and verify the new package with explicit approval.
9. Add migration instructions and only then deprecate the old package with explicit approval.

The v4 release line and feature roadmap remain independent. Do not make the rename a prerequisite for v4.0.0 unless the release owner explicitly chooses to coordinate them.

## Rollback

- **Before GitHub rename:** close/revert the preparation PR; no external state has changed.
- **After GitHub rename:** if critical integrations fail, rename the repository back and restore the previous external settings. Preserve the redirect and communication record.
- **After new npm publication:** do not rely on unpublishing. Publish a corrected higher version if needed; leave the old package intact until the replacement path is verified. If the new name is abandoned, communicate clearly and deprecate only after an approved replacement plan.
- **Trusted publishing failure:** disable the new publish path, restore the prior trusted-publisher tuple if still valid, and do not fall back to a long-lived token without a separately reviewed security decision.

## Go / no-go gates

**Go only when all are true:**

- [ ] Maintainer approves exact GitHub and npm names.
- [ ] Exact npm registry availability and namespace ownership verified.
- [ ] GitHub name collision and domain checks completed.
- [ ] Preliminary trademark review completed; no unresolved high-risk conflict.
- [ ] Full old-name reference inventory and owners recorded.
- [ ] Migration PR passes complete CI and package-consumer tests.
- [ ] Pages, redirects, Actions, secrets/environments, and integrations have an update plan.
- [ ] npm Trusted Publisher configuration can be updated by an authorized account owner.
- [ ] Rollback owner, maintenance window, and communication plan agreed.

**No-go:** any unverified namespace, unresolved trademark concern, missing owner access, failing CI, or inability to verify trusted publishing. No external rename or publication should occur on a no-go.

## Tracked-reference inventory (2026-11-13)

A GitHub code search for the exact literal `node-solr-lambda` in this repository's default-branch index returned **42 tracked files**. A second search for the canonical old repository URL returned 27 files, all within the 42-file set. The search for the old package install command returned 12 files, also within that set. This is a searchable baseline, not a claim that external systems, unindexed files, Git history, issue/PR bodies, or third-party consumers have been inventoried.

The 42 files are grouped below by migration responsibility:

- **Package and primary entry points:** `package.json`, `package-lock.json`, `README.md`, `test/no-zod-consumer.mjs`.
- **Website and generated site data:** `website/index.html`, `website/assets/dashboard.js`, `scripts/site/generate-data.mjs`, `scripts/site/validate-data.mjs`, `docs/site-data.schema.json`, `docs/api-inventory.json`, `test/site-data-generator.test.mjs`, `test/site-data-validator.test.mjs`.
- **CI and legal metadata:** `.github/workflows/ci.yml`, `LICENSE`.
- **Release and migration documentation:** `CHANGELOG.md`, `docs/release-process.md`, `docs/migration-v3-to-v4.md`, `docs/release-notes-v4.0.0.md`.
- **Current user/developer documentation:** `docs/getting-started.md`, `docs/validation.md`, `docs/solr-client-comparison.md`, `docs/api-coverage.md`, `docs/api-reference.md`, `docs/raw-requests.md`, `docs/compatibility.md`, `docs/testing-strategy.md`, `docs/query.md`, `docs/update.md`, `docs/config.md`, `docs/benchmarking.md`, `docs/schema.md`, `docs/architecture.md`, `docs/endpoint-inventory.md`, `docs/solr-v2-api-strategy.md`, `docs/roadmap.md`.
- **Historical ADRs and audit records:** `docs/audit-2026-11-06.md`, `docs/adr/0002-solr-client-api-coverage.md`, `docs/adr/0003-cross-client-test-strategy.md`, `docs/adr/0004-suggester-query-component.md`, `docs/adr/0005-lossless-json-codec.md`, `docs/adr/0006-streaming-document-ingestion.md`, `docs/adr/0007-project-identity-migration.md`.

### Migration treatment

- Update package metadata, lockfile, README install/import instructions, current docs, website source, site-data schema/fixtures, consumer tests, and CI links as part of the reviewed migration preparation change.
- Review the LICENSE hit manually; do not change copyright or legal ownership text merely because the repository/package identity changes.
- Preserve old-name references in changelog history, the v3-to-v4 migration history, release notes describing already-published versions, and this ADR's migration context. Where useful, label these as historical rather than mechanically replacing them.
- Review older ADRs and audit snapshots individually: update stale canonical navigation links only when it does not rewrite the historical decision record.
- The literal search did not return any files under `src/`; runtime source does not appear to hard-code the old identity in the indexed default-branch content.

### Follow-up variant search (2026-11-13)

A second pass against the default-branch code-search index checked common alternate spellings and public-facing references:

- Searches for the underscore form `node_solr_lambda`, camel-case `nodeSolrLambda`, and the guessed Pages host `node-solr-lambda.vercel.app` returned no indexed files.
- The canonical GitHub URL search returned 26 indexed files in this pass (the earlier inventory recorded 27); the difference illustrates that GitHub code-search indexing/results are a discovery aid, not a stable exhaustive count.
- The exact npm package URL `npmjs.com/package/node-solr-lambda` appeared in 3 files: `website/index.html`, `scripts/site/generate-data.mjs`, and `test/site-data-validator.test.mjs`.
- The old Git remote suffix `node-solr-lambda.git` appeared in 3 files: `docs/release-process.md`, `package.json`, and `test/no-zod-consumer.mjs`.
- The old install command appeared in 11 indexed files in this pass, consistent with the earlier 12-file baseline within normal search-index/result variation.
- The broader `solr-lambda` search returned the same 42-file set as the exact old-name baseline. No additional variant-only paths were identified.

These results do not inspect Git history, issue/PR text, discussions, GitHub Pages settings, Actions variables/secrets/environments, npm Trusted Publisher configuration, npm account state, or downstream consumers. The connected GitHub search is limited to indexed repository code and cannot certify external configuration. Therefore this remains a **partial searchable inventory**, not a complete migration inventory.

### Remaining inventory work

Before marking the inventory complete, repeat the search for variants and external surfaces: case/spacing variants, old GitHub URL forms, npm package/import strings, badges and Pages URLs, GitHub Actions environment/repository identifiers, release and OIDC settings, issue/PR templates, discussions, and npm Trusted Publisher configuration. External account settings and downstream dependents require maintainer access and are not visible from this repository search.

## Current status and open work

- [x] Maintainer selected full repository + package rename direction.
- [x] Existing release workflow and release documentation inspected.
- [x] Initial candidate set and known collisions recorded.
- [ ] Verify exact npm availability/ownership for `solr-ts-client` (registry lookup unavailable from the research environment).
- [x] Run exact public GitHub repository search for `solr-ts-client` (zero results; not a reservation).
- [ ] Verify domain availability for `solr-ts-client` through an authoritative registrar/RDAP source.
- [x] Complete first-pass searchable tracked-file inventory (42 exact-literal matches); variant, historical/external and account-level checks remain open.
- [ ] Complete authoritative npm and trademark checks; explicitly resolve naming-confusion risk with existing SolrTS project and obtain final identity go/no-go approval.
- [ ] Prepare migration PR and execute only after go/no-go approval.
