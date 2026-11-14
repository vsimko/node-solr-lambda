# Agent Skills

Task-specific procedures for AI agents working in this repository. Read the matching skill before starting the corresponding task. Skills complement, and do not replace, the canonical project documentation linked below.

| Skill | Use when | Canonical companion documentation |
|---|---|---|
| [solr-api-design](solr-api-design/SKILL.md) | Adding or reviewing endpoint methods, request serialization, and Solr API surface | [Client architecture](../../docs/architecture.md), [endpoint inventory](../../docs/endpoint-inventory.md), [API coverage](../../docs/api-coverage.md) |
| [typescript-api-design](typescript-api-design/SKILL.md) | Designing exported types, generics, options, and response contracts | [Type model guidelines](../../docs/architecture.md#type-model-guidelines), [public API review](../../docs/public-api-review.md) |
| [solr-testing](solr-testing/SKILL.md) | Writing tests, debugging regressions, and validating behavior | [Testing strategy](../../docs/testing-strategy.md), [cross-client test ADR](../../docs/adr/0003-cross-client-test-strategy.md) |
| [solr-compatibility](solr-compatibility/SKILL.md) | Assessing Solr version support and recording runtime evidence | [Compatibility matrix](../../docs/compatibility.md), [API coverage](../../docs/api-coverage.md), [endpoint inventory](../../docs/endpoint-inventory.md) |
| [documentation](documentation/SKILL.md) | Updating guides, references, coverage, roadmap, and website source data | [Documentation policy](../../docs/DOCUMENTATION.md), [documentation index](../../docs/index.md), [architecture index](../../docs/architecture/README.md) |
| [release-management](release-management/SKILL.md) | Preparing versions, npm packages, prereleases, and publication | [Release process](../../docs/release-process.md), [release notes](../../docs/release-notes-v4.0.0.md) |
| [github-workflow](github-workflow/SKILL.md) | Managing issues, branches, pull requests, and repository work | [Development workflow](../../README.md#development), [roadmap](../../docs/roadmap.md), [agent instructions](../../AGENTS.md) |

## How to use skills

1. Read [`AGENTS.md`](../../AGENTS.md) first for repository-wide rules and task routing.
2. Select the skill that matches the task. Read more than one when the task crosses domains.
3. Follow the skill's procedure and completion checklist.
4. Use linked documentation as the authority for project facts, API contracts, and policy.
5. Update the skill and its companion documentation when a workflow or project rule changes.

## Skill format

Each skill is a directory containing a `SKILL.md` file. The file starts with YAML frontmatter containing:

- `name`: must match the skill directory name.
- `description`: a concise statement of when the skill applies.

Skills should be task-specific, procedural, and concise. They should link to canonical documentation instead of copying large sections of it. Local links and discovery entries are checked by `npm run agents:check`.
