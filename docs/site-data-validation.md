# Website data validation

The website data validator is deliberately small, deterministic, and dependency-free. It uses Node.js built-ins, never executes repository data, and validates normalized fixtures rather than making network requests.

## Commands

- `npm run site:check` validates the rule inventory and the architecture/data-contract files.
- `npm run test:site-data` runs the validator unit tests and fixture cases.
- `npm run docs:check` runs the existing documentation checks followed by both site-data commands, so CI and release checks cannot silently omit them.
- `npm run build:site` generates the versioned model, validates it, runs deterministic generator/validator tests, and assembles `dist-site/`.
- `npm run site:preview` serves the built site on `http://127.0.0.1:4173`; set `SITE_PORT` to change the port.
- `node scripts/site/validate-data.mjs --data build/site-data.json` validates the generated model independently.
- `node scripts/site/validate-data.mjs --rules scripts/site/rules.json --data path/to/fixture.json` selects explicit inputs.

When `--data` is omitted, the command validates the rule inventory and contract prerequisites without pretending that live/generated data is present.

## Rule inventory

Rules live in `scripts/site/rules.json`, separately from the validator implementation. Each rule has a unique kebab-case `id`, `severity` (`error` or `warning`), boolean `enabled`, and a supported declarative `check` type. Paths must be repository-relative and cannot escape the repository. Unsupported checks and malformed rules fail validation; disabled rules are skipped.

The initial inventory checks that the ADR, data contract, and JSON Schema exist and that the schema declares version 1. The `site-data` rule activates data validation when a data file is supplied.

## Data semantics

- Each source has a unique ID, recognized source kind/status, URL, and retrieval timestamp. Every domain source reference must resolve.
- P1 domains (API coverage, CI, roadmap, npm, releases, documentation) have an explicit status, source IDs, and records. An unavailable domain must have no records; a real numeric zero remains valid and is never synthesized from missing data.
- API coverage records require an operation ID, recognized status, supported Solr major keys, and evidence. This validates the presence of evidence, not the truth of an upstream compatibility claim.
- CI records describe observed runs. Configured matrix dimensions without observed execution cannot be reported as successful. Completed runs require a recognized conclusion.
- Roadmap records require a stable GitHub number, URL, priority, and explicit open/closed/merged/missing state.
- npm records require package/version/window/source/retrieval metadata and a non-negative observed download count.
- Draft or unreleased release records cannot be marked as published; published releases require a changelog reference.
- Documentation records declare whether ownership is authored or generated; generated entries identify their source path.
- P2 domains (upstream Solr releases, generated TypeScript API, historical CI) are optional and do not gate P1 availability.

External responses must be normalized into committed or generated fixtures before validation. Freshness decisions use the producer's explicit status and timestamps; tests do not read the wall clock. Missing, stale, malformed, or rate-limited feeds must remain unavailable/stale rather than being coerced into empty successful data.

## Adding and debugging a rule

1. Add a declarative rule to `scripts/site/rules.json` with a unique ID, severity, enabled flag, and supported check type.
2. Keep paths repository-relative. Never add executable JavaScript, shell commands, expressions, or imports to rule data.
3. Add positive and negative fixtures to `test/site-data-validator.test.mjs` for any new data invariant.
4. Run `npm run site:check` and `npm run test:site-data`. Diagnostics are sorted by rule ID, path, and message and include severity, ID, and affected path.
5. Prefer a focused validator check over a generic plugin/rule-engine abstraction. Do not duplicate authoritative API/compatibility truth in this rules file.

The validator's supported checks are intentionally allowlisted in code. Adding a new check requires code, tests, and documentation changes; data files cannot introduce executable behavior.
