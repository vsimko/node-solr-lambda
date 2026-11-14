# Agent instructions

This file is the repository-wide entry point for AI coding agents. Read it before project-management or implementation actions. The canonical documentation catalogue is [`docs/index.md`](docs/index.md); documentation policy is in [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md). The task-specific Agent Skills are indexed in [`.agents/skills/README.md`](.agents/skills/README.md).

## Agent skill routing

Read the matching skill before performing a task. Skills define procedures; linked project documentation remains the source of truth.

- Solr endpoint implementation or review: [`solr-api-design`](.agents/skills/solr-api-design/SKILL.md) and [client architecture](docs/architecture.md).
- Public TypeScript contracts: [`typescript-api-design`](.agents/skills/typescript-api-design/SKILL.md) and [public API review](docs/public-api-review.md).
- Unit, integration, security, SolrCloud, or benchmark tests: [`solr-testing`](.agents/skills/solr-testing/SKILL.md) and [testing strategy](docs/testing-strategy.md).
- Solr version support claims: [`solr-compatibility`](.agents/skills/solr-compatibility/SKILL.md) and [compatibility matrix](docs/compatibility.md).
- Guides, API reference, coverage, or website documentation: [`documentation`](.agents/skills/documentation/SKILL.md) and [documentation policy](docs/DOCUMENTATION.md).
- Versioning, package contents, prereleases, or npm publication: [`release-management`](.agents/skills/release-management/SKILL.md) and [release process](docs/release-process.md).
- Issues, branches, pull requests, or repository coordination: [`github-workflow`](.agents/skills/github-workflow/SKILL.md).

If a task spans multiple areas, read all matching skills. Do not treat a skill as a replacement for the linked source-of-truth documents.

## Project identity and scope

- Repository: `vsimko/solr-ts-client`.
- Package: `solr-ts-client`.
- Product: a TypeScript-first Apache Solr client for supported Node.js releases, with ESM and CommonJS builds.
- Work on a short-lived branch from `master`; link substantial implementation work to a GitHub issue and open a pull request targeting `master`.
- Do not publish packages, merge pull requests, or change release tags unless explicitly requested.

## Read before changing code

Select the relevant documents from the [documentation index](docs/index.md):

- [Client architecture](docs/architecture.md) — module boundaries, transport ownership, API design.
- [Compatibility](docs/compatibility.md), [API coverage](docs/api-coverage.md), [endpoint inventory](docs/endpoint-inventory.md), and [machine-readable inventory](docs/api-inventory.json) — support claims and evidence.
- [Testing strategy](docs/testing-strategy.md) and [cross-client test ADR](docs/adr/0003-cross-client-test-strategy.md) — test expectations.
- [Roadmap](docs/roadmap.md) and relevant [architecture decisions](docs/adr/) — product direction and accepted decisions.
- [Release process](docs/release-process.md) — versioning and publishing rules.

Treat source code, tests, current documentation, and accepted ADRs as stronger evidence than assumptions or stale conversation context. If sources conflict, report the conflict and prefer the current implementation plus an explicit ADR decision.

## Engineering principles

1. TypeScript IntelliSense is part of the public API. Prefer named interfaces, literal unions, discriminated unions, and typed helpers.
2. Avoid broad index signatures on primary option types. Keep deliberate extension points such as `params`, `customParams`, or raw requests.
3. Keep HTTP behavior in the shared transport. API modules must not create their own Fetch clients or duplicate authentication, retry, timeout, cancellation, parsing, or error handling.
4. Preserve public API compatibility unless a breaking change is intentional, justified, and documented.
5. Do not imply that a type or successful build proves Solr runtime compatibility.
6. Keep runtime dependencies at zero. Zod is an optional peer dependency; do not make it a required runtime import.
7. Preserve both ESM and CommonJS package behavior and supported Node.js engine constraints.
8. Never log credentials, authorization headers, tokens, or unredacted server-controlled error bodies.

## Required workflow

- Inspect the relevant implementation, exported types, tests, docs, and history before editing.
- Prefer a focused change over unrelated cleanup.
- Add unit/contract tests for request path, method, serialization, response parsing, and errors as applicable.
- Add consumer-facing compile-time fixtures for public type changes, including invalid-option/typo checks.
- Add integration coverage for each pinned Solr baseline when feasible. If it cannot be run, mark the behavior unverified; never infer success.
- Update the API inventory, coverage matrix, compatibility matrix, docs, and roadmap when the change affects them.
- Run the narrowest relevant tests first, then the appropriate full checks.
- Report exact commands run and results. Distinguish tests not run from tests that failed.
- If progress is blocked by a human decision, credentials, permission, or external action, state the exact blocker and the dependent work. Do not invent approval or bypass access controls.

## Standard validation commands

```sh
npm ci
npm run typecheck
npm run test:types
npm test
npm run build
npm run docs:check
npm run release:check
```

Run integration tests with the repository's configured Solr environment when available:

```sh
npm run test:integration
```

Do not claim these commands passed unless they were actually executed successfully.
