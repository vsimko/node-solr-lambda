---
name: release-management
description: Use when preparing versions, changelogs, npm packages, prereleases, publication, or release verification.
---

# Release management

## Read first

- `docs/release-process.md`
- `docs/release-notes-v4.0.0.md` when relevant
- `CHANGELOG.md`
- `package.json`
- `scripts/release-policy.mjs`, `scripts/stage-publish.mjs`, and `scripts/publish.mjs`

## Safety rules

- Do not publish, unpublish, tag a release, or change npm dist-tags unless explicitly asked.
- Do not assume a PR merge publishes the package; the repository documents manual release publication.
- Follow the release process as written, including version and dist-tag policy.
- Do not bypass packed-tarball verification or release checks.
- Preserve the package's ESM and CommonJS exports, declaration files, supported Node.js engines, and optional Zod peer dependency.
- Never put credentials or tokens in committed files, logs, command output, or release notes.

## Preparation workflow

1. Review merged changes since the last release and identify user-visible changes.
2. Classify breaking changes, features, fixes, deprecations, and compatibility notes.
3. Update changelog/release notes using the project's established format.
4. Verify package name, version, exports, files allowlist, engines, and peer dependency metadata.
5. Run the required validation from `docs/release-process.md`, including the package's release checks.
6. Inspect `npm pack --dry-run` output and verify the package contents.
7. Report readiness and any remaining blockers. Stop before publication unless explicitly authorized.

## Required project checks

The package defines `npm run release:check` and a `prepublishOnly` validation sequence. Consult current scripts and release documentation rather than assuming the commands are unchanged.

## Completion checklist

- [ ] Release scope and version are justified.
- [ ] Changelog/release notes are accurate.
- [ ] Type, unit, build, docs, inventory, consumer, benchmark, and pack checks required by policy are addressed.
- [ ] Package contents and metadata are inspected.
- [ ] No publication or tag mutation occurred without explicit authorization.
