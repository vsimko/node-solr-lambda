---
name: release-management
description: Use when preparing versions, changelogs, npm packages, prereleases, publication, or release verification.
---

# Release management

## Canonical documentation

- [Release process](../../../docs/release-process.md)
- [Package metadata](../../../package.json)
- [Current release notes](../../../docs/release-notes-v4.0.0.md)

## Safety rules

- Do not publish, unpublish, tag a release, or change npm dist-tags unless explicitly asked.
- A pull request merge does not publish the package; publication is manual.
- Follow the release process as written, including version and dist-tag policy.
- Do not bypass packed-tarball verification or release checks.
- Preserve the package's ESM and CommonJS exports, declaration files, supported Node.js engines, and optional Zod peer dependency.
- Never put credentials or tokens in committed files, logs, command output, or release notes.

## Preparation workflow

1. Review merged changes since the last release and identify user-visible changes.
2. Classify breaking changes, features, fixes, deprecations, and compatibility notes.
3. Update changelog/release notes using the project's established format.
4. Verify package name, version, exports, files allowlist, engines, and peer dependency metadata.
5. Run the required validation from the release process, including `npm run release:check`.
6. Inspect `npm pack --dry-run` output and verify package contents.
7. Report readiness and remaining blockers. Stop before publication unless explicitly authorized.

## Completion checklist

- [ ] Release scope and version are justified.
- [ ] Changelog/release notes are accurate.
- [ ] Required type, unit, build, docs, inventory, consumer, benchmark, and pack checks are addressed.
- [ ] Package contents and metadata are inspected.
- [ ] No publication or tag mutation occurred without explicit authorization.
