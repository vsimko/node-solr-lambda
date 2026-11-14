# Contributor guide

## Start here

1. Read the [project README](../../README.md) and [client architecture](../architecture.md).
2. Review the [development roadmap](../roadmap.md) and relevant open GitHub issue.
3. Read the relevant [Agent Skill](../../.agents/skills/README.md) if using an AI coding agent.
4. Create a short-lived branch from `master` and keep the change focused.

## Engineering expectations

- Follow the module boundaries and shared transport design in [architecture](../architecture.md).
- For public API changes, add consumer-facing TypeScript fixtures and update the [public API reference](../api-reference.md).
- For endpoint changes, update API coverage, the endpoint inventory, compatibility evidence, and roadmap as applicable.
- Use unit tests for deterministic request and transport contracts; use integration tests to verify actual server behavior.
- Keep Solr 8.11.4, 9.11.0, and 10.1.0 support claims operation-specific. Read the [compatibility matrix](../compatibility.md).
- Keep runtime dependencies at zero. Zod remains an optional peer dependency.
- Preserve ESM and CommonJS package behavior.

## Local checks

```sh
npm ci
npm run typecheck
npm run test:types
npm test
npm run build
npm run docs:check
npm run release:check
```

Run `npm run test:integration` when the required Solr test environment is available. Report commands that were not run; do not describe them as passing.

## Pull requests

Open a pull request targeting `master`. Explain the motivation, implementation, tests, compatibility evidence, documentation changes, and remaining limitations. Use a draft pull request when the work is not ready for review.

Do not merge pull requests, publish npm packages, or change release tags unless the repository owner explicitly requests that action.
