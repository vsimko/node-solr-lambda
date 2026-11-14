# Agent instructions

These instructions apply to all agents working in this repository. Follow the repository documentation and source as the authority; do not invent project conventions or claim compatibility without evidence.

## Project identity and scope

- Repository: `vsimko/solr-ts-client`.
- Package: `solr-ts-client`.
- Product: a TypeScript-first Apache Solr client for supported Node.js releases, with ESM and CommonJS builds.
- Work on a short-lived branch from `master`; link implementation work to a GitHub issue and open a pull request targeting `master`.
- Do not publish packages or merge pull requests unless explicitly requested.

## Read before changing code

Select the relevant documents for the task:

- `docs/architecture.md` — module boundaries, transport ownership, API design.
- `docs/compatibility.md`, `docs/api-coverage.md`, `docs/endpoint-inventory.md`, and `docs/api-inventory.json` — support claims and evidence.
- `docs/testing-strategy.md` and `docs/adr/0003-cross-client-test-strategy.md` — test expectations.
- `docs/roadmap.md` and relevant `docs/adr/` records — product direction and accepted decisions.
- `docs/release-process.md` — release and publishing rules.
- `docs/index.md` — documentation map.

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

## Standard validation commands

```sh
npm ci
npm run typecheck
npm run test:types
npm test
npm run build
npm run release:check
```

Run integration tests with the repository's configured Solr environment when available:

```sh
npm run test:integration
```

Do not claim these commands passed unless they were actually executed successfully.

## Agent skills

Before substantial work, read the relevant skill under `.agents/skills/`:

- `solr-api-design`
- `typescript-api-design`
- `solr-testing`
- `solr-compatibility`
- `documentation`
- `release-management`
- `github-workflow`

Skills supplement these repository-wide rules; they do not override them or the source of truth in project docs.
