# Release process

## Version and dist-tag policy

The package is currently on `4.0.0-beta.0`. During the v4 prerelease cycle, increment the beta prerelease (`4.0.0-beta.1`, `4.0.0-beta.2`, …) and publish it under the npm `beta` dist-tag. Do not move the `latest` tag while publishing prereleases. Release candidates use `4.0.0-rc.N` and the `rc` tag. The stable release is `4.0.0` and is published under `latest` only after the v4 release checklist (#110) is approved.

`scripts/release-policy.mjs` maps supported SemVer channels (`alpha`, `beta`, `rc`, stable) to npm dist-tags and rejects unknown prerelease identifiers. `npm run release:publish` invokes `scripts/publish.mjs`, which reads the package version and selects the correct tag. Publication is never part of CI; it requires an explicit maintainer command and valid npm credentials.

## Pre-publication verification

Run the following from a clean checkout:

```sh
npm ci
npm run typecheck
npm run test:types
npm test
npm run build
npm run release:check
```

`release:check` validates the machine-readable API inventory, documentation links, and a real packed-tarball consumer. The consumer test runs `npm pack`, checks the packed file allowlist and manifest metadata, installs the tarball into a clean temporary project, verifies ESM `import` and CommonJS `require`, compiles `.mts` and `.cts` consumers against the packed declarations, and confirms optional `zod` is not installed as a required runtime dependency. `npm pack --dry-run` provides an additional human-readable package-content listing.

The package supports Node.js 20, 22, and 24 (`engines.node` and the CI matrix must stay aligned). The package root exposes conditional ESM and CommonJS runtime entry points and matching declaration entry points. `zod` is an optional peer dependency; the core client must remain usable without it.

## Publication

1. Complete and approve the release checklist in Issue #110, including the exact release-candidate commit and full Node.js/Solr matrix.
2. Confirm `npm view node-solr-lambda dist-tags` and the current version before publication.
3. Verify the npm account has publish rights and that two-factor authentication/provenance requirements for the account and organization are satisfied.
4. Run `npm run release:publish -- --dry-run` to inspect the npm publication operation without publishing.
5. Publish explicitly with `npm run release:publish`. The script chooses `beta`, `rc`, or `latest` based on the package version; never manually override the tag without a recorded release decision.
6. Verify `npm view node-solr-lambda@<version> version dist.tarball` and the corresponding dist-tag, then install that exact version in a clean consumer and repeat the ESM/CommonJS/type smoke test.

## Rollback

If a prerelease is defective, publish a corrected higher prerelease version under the same prerelease tag and move that tag forward. Deprecate the defective version with `npm deprecate node-solr-lambda@<version> "Reason and replacement version"` so consumers receive a warning. Prefer deprecation and a replacement release over unpublishing; unpublishing is subject to npm's policy and can break downstream lockfiles. For a stable release, prepare and verify a corrected patch release, then move `latest` only after the release owner approves it. Record the affected version, replacement, dist-tag change, and consumer impact in the changelog.

## Scope and gates

This document describes package mechanics, not release approval. It does not authorize publication or certify all Solr API operations. Exact supported operations and Solr 8.11.4/9.11.0/10.1.0 evidence remain in the compatibility and API coverage matrices. Do not publish until Issue #110 is complete or every exception has an explicit release decision.
