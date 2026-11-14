# Documentation policy

## Purpose and source of truth

The `docs/` directory contains the canonical human-readable project documentation. [`docs/index.md`](index.md) is its navigation entry point. Existing documentation paths are stable public references; prefer improving navigation and linking over gratuitous renames.

This project does not currently require an external documentation format or frontmatter standard. Do not add a repository-wide metadata migration (for example, OKF frontmatter) without a documented decision. Use Markdown for human-readable concepts and the existing JSON/schema pipeline for machine-readable inventories and website data.

The public website is a publication surface, not an authoring location. Follow the [website data contract](site-data-contract.md) and [website validation guide](site-data-validation.md). Do not manually edit generated output or maintain duplicate copies of canonical content.

## Document types and navigation

Use the existing flat topic-guide structure unless a group of related documents benefits from a dedicated subdirectory. Directory-level README files are navigation pages, not alternate copies of guide content.

- Keep `docs/index.md` current when adding, moving, or renaming documentation.
- Use [`docs/README.md`](README.md) for audience-oriented entry points.
- Keep architecture decisions under [`docs/adr/`](adr/README.md).
- Keep topic guides focused on one API family or project concern.
- Preserve existing links where practical. If a path must change, update every local reference and the documentation index.

## Writing rules

- Write technical documentation in clear, direct English.
- Use one H1 heading per document and keep heading levels in sequence.
- Prefer active voice, short sentences, and consistent terminology.
- State prerequisites, expected results, and failure conditions for procedures.
- Use descriptive link text and repository-relative links for local files.
- Add a language identifier to fenced code blocks when known.
- Prefer realistic examples that compile against the current public API.
- Distinguish implemented behavior, tested behavior, documented server behavior, and planned work.
- State exact Solr versions and test scope. Avoid blanket claims such as "fully compatible".
- Do not copy substantial text from external documentation. Link to authoritative sources and write original explanations.

## API and compatibility claims

- A TypeScript type does not prove that a Solr server accepts or implements an option.
- A unit test proves only the client behavior represented by its fixture.
- An integration test proves only the exact operation, options, topology, and server version exercised.
- Keep Solr V1 and V2 contracts distinct.
- Update [API coverage](api-coverage.md), [compatibility](compatibility.md), [endpoint inventory](endpoint-inventory.md), [machine-readable inventory](api-inventory.json), and [roadmap](roadmap.md) when implementation or evidence changes.
- Do not replace unknown or unverified values with guesses.

## Code examples

- Keep examples small and focused.
- Use the package's public exports and supported Node.js syntax.
- Include setup and cleanup where an example creates server-side resources.
- Avoid credentials in examples. Use environment variables and placeholders.
- Explain optional dependencies, including the optional Zod peer dependency, where relevant.

## Validation

Run the checks relevant to the documentation change:

```sh
npm run agents:check
npm run docs:check
npm run test:api-inventory
```

The documentation check also validates website data and its generated views. If website source data changes, run the relevant site generation and tests from `package.json`.

Automated checks do not prove semantic correctness, API accuracy, compatibility, or the quality of every example. Review rendered Markdown, terminology, version scope, and factual claims before merging.
