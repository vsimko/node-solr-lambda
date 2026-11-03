# Release process

## Version and dist-tag policy

The package is currently on `4.0.0-beta.0`. During the v4 prerelease cycle, increment the beta prerelease (`4.0.0-beta.1`, `4.0.0-beta.2`, …) and publish it under the npm `beta` dist-tag. Do not move the `latest` tag while publishing prereleases. Release candidates use `4.0.0-rc.N` and the `rc` tag. The stable release is `4.0.0` and is published under `latest` only after the v4 release checklist (#110) is approved.

`scripts/release-policy.mjs` maps supported SemVer channels (`alpha`, `beta`, `rc`, stable) to npm dist-tags and rejects unknown prerelease identifiers. `npm run release:publish` invokes `scripts/publish.mjs`, which reads the package version and selects the correct tag. Publication is never part of CI; it requires an explicit maintainer action.

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

## Trusted npm publishing

The repository provides a separate, manually dispatched workflow at `.github/workflows/publish.yml`. It is restricted to the `master` ref, requires an explicit `confirm_publish` input, runs the complete release checks, and publishes through npm OIDC trusted publishing. It requests only `contents: read` and `id-token: write`; no long-lived npm write token is used. The workflow uses Node.js 24 and npm 11.5.1 or later, which are required for npm trusted publishing.

Before enabling publication:

1. On npmjs.com, open the `node-solr-lambda` package settings and add a GitHub Actions trusted publisher.
2. Set the owner/user to `vsimko`, repository to `node-solr-lambda`, workflow filename to `publish.yml`, and environment to `npm-publish`.
3. Allow direct `npm publish` for this trusted publisher.
4. In GitHub repository settings, create the `npm-publish` environment and configure required reviewers / deployment protection. Restrict who can approve and dispatch releases.
5. Verify the package is public and its `package.json` repository URL exactly matches `https://github.com/vsimko/node-solr-lambda.git`.
6. Do not test this workflow by publishing a real version until the release owner explicitly approves a prerelease test. The first successful trusted publish must occur within two days of creating the npm trusted-publisher configuration; otherwise recreate the configuration.

The workflow passes `--provenance` to the existing version-aware publisher. npm trusted publishing also generates provenance automatically for public packages published from a public repository. The account's existing npm settings and the trusted-publisher configuration cannot be verified from this repository. A merged workflow alone does not mean trusted publishing is configured or that an attestation has been produced.

To publish, select the workflow on the `master` branch, set `confirm_publish` to true, and complete the `npm-publish` environment approval. Publication remains an explicit release-owner action and must only happen after Issue #110 is approved. The workflow must not be dispatched for this task or for ordinary CI validation.

## Publication

1. Complete and approve the release checklist in Issue #110, including the exact release-candidate commit and full Node.js/Solr matrix.
2. Confirm `npm view node-solr-lambda dist-tags` and the current version before publication.
3. Confirm npm trusted publishing is configured exactly as above and that the `npm-publish` environment is protected.
4. Run the `Publish to npm` workflow manually from `master`, with `confirm_publish: true`, and approve the protected environment.
5. Verify `npm view node-solr-lambda@<version> version dist.tarball`, the corresponding dist-tag, and the published provenance attestation; then install that exact version in a clean consumer and repeat the ESM/CommonJS/type smoke test.

## Rollback

If a prerelease is defective, publish a corrected higher prerelease version under the same prerelease tag and move that tag forward. Deprecate the defective version with `npm deprecate node-solr-lambda@<version> "Reason and replacement version"` so consumers receive a warning. Prefer deprecation and a replacement release over unpublishing; unpublishing is subject to npm's policy and can break downstream lockfiles. For a stable release, prepare and verify a corrected patch release, then move `latest` only after the release owner approves it. Record the affected version, replacement, dist-tag change, and consumer impact in the changelog.

## Scope and gates

This document describes package mechanics, not release approval. It does not authorize publication or certify all Solr API operations. Exact supported operations and Solr 8.11.4/9.11.0/10.1.0 evidence remain in the compatibility and API coverage matrices. Do not publish until Issue #110 is complete or every exception has an explicit release decision.
