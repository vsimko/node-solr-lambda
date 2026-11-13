# ADR 0007: Project identity migration

- **Status:** Proposed; identity not yet selected
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

The following are candidates for further screening only. No candidate is approved or claimed to be available on npm, GitHub, as a domain, or as a trademark.

| Candidate | Rationale | Known concern / next check |
|---|---|---|
| `solr-client-ts` | Clear client and TypeScript positioning | Verify exact npm package, GitHub repository, domain and trademark |
| `solr-ts-client` | Shorter TypeScript-oriented alternative | Verify exact npm package, GitHub repository, domain and trademark |
| `solr-fetch-client` | Highlights the Fetch-based transport | Transport may be an implementation detail rather than enduring identity |
| `node-solr-client-ts` | Explicit Node.js and TypeScript positioning | Long; verify exact npm package, GitHub repository, domain and trademark |
| `solr-http-client` | Broad, understandable description | Generic and potentially crowded; verify all namespaces |

Previously identified names requiring exclusion or careful collision review include `solr-client`, `solrkit`, `solr-node-client`, `solrcraft`, and `solrbridge`. The npm registry API could not be queried successfully during this pass, so registry availability remains **unverified**. GitHub search results are not proof of npm or domain availability.

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

## Current status and open work

- [x] Maintainer selected full repository + package rename direction.
- [x] Existing release workflow and release documentation inspected.
- [x] Initial candidate set and known collisions recorded.
- [ ] Verify exact npm availability (registry endpoint inaccessible in current research pass).
- [ ] Verify GitHub namespace and domain availability for finalists.
- [ ] Complete searchable repository-wide reference inventory.
- [ ] Select final names and obtain explicit approval.
- [ ] Prepare migration PR and execute only after go/no-go approval.
