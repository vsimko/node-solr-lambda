# ADR 0008: Agent skills and documentation infrastructure

- **Status:** Accepted
- **Date:** 2026-11-14
- **Owners:** Maintainers
- **Tracking:** Pull request [#414](https://github.com/vsimko/solr-ts-client/pull/414)

## Context

The repository has substantial API, compatibility, testing, release, and website documentation. Agent instructions and task-specific procedures need a discoverable entry point and must remain aligned with that documentation.

The repository [vsimko/gfabasic-rust](https://github.com/vsimko/gfabasic-rust) provides a useful precedent: a root `AGENTS.md`, an indexed `.agents/skills/` directory, canonical companion documentation, explicit documentation policy, contributor-oriented navigation, and automated skill validation.

The Solr client already has a flat set of topic guides, architecture notes, API coverage records, compatibility matrices, and a generated website pipeline. A wholesale documentation migration or a second source-of-truth format would add unnecessary risk.

## Decision

Adopt a lightweight, repository-native agent and documentation system:

1. Keep root `AGENTS.md` as the repository-wide instruction and skill-routing entry point.
2. Keep task-specific agent procedures under `.agents/skills/<skill-name>/SKILL.md`.
3. Require each skill to declare `name` and `description` in YAML frontmatter. The name must match its kebab-case directory.
4. Maintain `.agents/skills/README.md` as the skill catalogue, including task applicability and links to canonical companion documentation.
5. Keep project facts, API contracts, compatibility evidence, and policy in `docs/`; skills link to those documents instead of duplicating them.
6. Keep `docs/index.md` as the canonical documentation navigation entry point. Add audience-oriented overview pages for contributors, architecture, ADRs, and testing without moving existing topic guides.
7. Keep Markdown and the existing JSON/schema website pipeline as the documentation source of truth. Do not introduce mandatory frontmatter on all documentation files or adopt an external documentation standard without a separate decision.
8. Add a dependency-free Node.js validator that checks skill metadata, directory naming, local links, and discovery links from both `AGENTS.md` and the skill catalogue.
9. Run skill validation as part of `npm run docs:check` and the documentation CI path. Classify agent instructions, skills, and their validator as documentation changes.

## Alternatives considered

- **Keep only root agent instructions:** rejected because task procedures and their canonical documentation links would remain difficult to discover.
- **Copy large project rules into every skill:** rejected because duplicated guidance would drift from the architecture, testing, and compatibility source documents.
- **Migrate all docs to OKF or another frontmatter-based standard:** rejected for now because the existing documentation and site pipeline work without it, and the migration is not required to solve agent discoverability.
- **Move all topic guides into a new directory hierarchy:** rejected because it would create avoidable link churn and risk breaking existing public documentation paths.

## Consequences

- Agents have a single entry point and an explicit task-to-skill routing map.
- Skills have stable metadata and are discoverable from both the root instructions and their own catalogue.
- Documentation policy and contributor guidance are easier to find.
- Automated validation catches missing skill metadata, broken local skill links, and skills omitted from discovery indexes.
- Existing API guides, compatibility records, website generation, and public documentation URLs remain in place.
- Automated checks validate structure and links, not the factual correctness of Solr behavior or the quality of every agent decision. Human review remains required.

## Validation

Run:

```sh
npm run agents:check
npm run docs:check
npm run test:api-inventory
```

The documentation CI job runs these checks for changes to docs, agent guidance, and the skill validator.
