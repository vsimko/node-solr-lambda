---
name: documentation
description: Use when changing public documentation, examples, API coverage, roadmap, release notes, or generated website data.
---

# Documentation

## Canonical documentation

- [Documentation index](../../../docs/index.md)
- [Documentation policy](../../../docs/DOCUMENTATION.md)
- [Architecture index](../../../docs/architecture/README.md)
- [Website data contract](../../../docs/site-data-contract.md)
- [Website validation](../../../docs/site-data-validation.md)

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
- Keep source documentation readable on GitHub. Generated website output is not an authoring location.

## Documentation update map

Depending on the change, consider README, the relevant topic guide, `docs/index.md`, API reference, coverage matrices, compatibility matrix, roadmap, machine-readable API inventory, changelog, and release notes. Update only the canonical sources affected by the change.

Do not edit generated website output or generated data manually when a source-of-truth generator exists. Follow the relevant site-data contract and generation scripts.

## Validation

Run:

```sh
npm run docs:check
npm run test:api-inventory
```

If website source data changes, also run the site generation, validation, and tests defined in `package.json`.

## Completion checklist

- [ ] Examples match current exported API.
- [ ] Links and navigation are updated.
- [ ] Compatibility statements are evidence-based.
- [ ] Inventory/coverage/roadmap are consistent.
- [ ] Documentation validation passes or limitations are reported.
