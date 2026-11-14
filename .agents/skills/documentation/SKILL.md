---
name: documentation
description: Use when changing public documentation, examples, API coverage, roadmap, release notes, or generated website data.
---

# Documentation

## Read first

- `docs/index.md`
- Relevant topic guide and `README.md`
- `docs/check-docs` implementation in `scripts/check-docs.mjs`
- Website data contract and validation docs when touching website content

## Documentation principles

- Keep README concise and orient users to the detailed guides.
- Use accurate, runnable TypeScript examples that match the current public API.
- Explain prerequisites such as core/collection setup, authentication, optional Zod, and supported Node.js/Solr versions where relevant.
- Distinguish typed methods from generic/raw escape hatches.
- State version-specific differences and unverified behavior explicitly.
- Do not turn an implementation intention or roadmap item into a feature claim.
- Keep links relative within docs and consistent with the documentation index.
- Avoid duplicated guidance; prefer a canonical page and link to it.
- Follow the existing Markdown structure and terminology.

## Documentation update map

Depending on the change, consider:

- `README.md` — user-facing summary and development commands.
- `docs/index.md` — documentation navigation.
- Topic guide — API usage and examples.
- `docs/api-reference.md` — public signatures/reference.
- `docs/api-coverage.md` / `docs/collections-api-coverage.md` — implementation and test evidence.
- `docs/compatibility.md` — exact runtime support.
- `docs/roadmap.md` — status and product direction.
- `docs/api-inventory.json` — machine-readable coverage.
- `CHANGELOG.md` and release notes — user-visible changes.

Do not edit generated website output or generated data manually when a source-of-truth generator exists. Follow the relevant site-data contract and generation scripts.

## Validation

Run the relevant documentation checks, normally:

```sh
npm run docs:check
npm run test:api-inventory
```

If website source data changes, also run the specific site generation/validation/test commands documented in package scripts and site docs.

## Completion checklist

- [ ] Examples match current exported API.
- [ ] Links and navigation are updated.
- [ ] Compatibility statements are evidence-based.
- [ ] Inventory/coverage/roadmap are consistent.
- [ ] Documentation validation passes or limitations are reported.
