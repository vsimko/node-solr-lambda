---
name: typescript-api-design
description: Use when designing or reviewing exported TypeScript types, generics, query options, response models, or public client signatures.
---

# TypeScript API design

## Read first

- `docs/architecture.md` (especially Type model guidelines)
- `docs/public-api-review.md`
- Relevant API guide and source types
- `test/public-api-types.ts`, `test/query-types.ts`, and nearby type fixtures

## Public API principles

- IntelliSense and discoverability are product features, not implementation details.
- Prefer named exported interfaces and type aliases over anonymous inline object types.
- Use literal unions for finite Solr values and discriminated unions for action-specific contracts.
- Use generics for caller-owned document types and response sections where the relationship is meaningful.
- Model nested Solr JSON structures with nested interfaces rather than untyped records.
- Avoid broad index signatures on primary option types: they suppress misspelling diagnostics and weaken completion.
- Provide intentional extension points such as `params`, `customParams`, or generic raw requests where Solr/plugin extensibility requires them.
- Keep expressive Solr languages (query strings, function expressions, sort syntax) as strings where appropriate; do not pretend to parse them statically.
- Keep request and response types separate when their semantics differ.
- Preserve backward compatibility of existing exported names and method signatures unless an approved breaking change is intended.

## Type-test expectations

For a public type change, add consumer-style compile fixtures that prove:

1. Typical valid usage is accepted.
2. Important nested/action-specific options are accepted.
3. Invalid keys and incompatible values are rejected where the contract is closed.
4. Generic document and response types flow to the consumer correctly.
5. Explicit extension points remain usable.
6. The package declarations remain consumable from the supported module formats.

Use `npm run test:types` and the relevant dedicated type fixtures. Do not rely only on `tsc` compiling implementation source.

## Review questions

- Can a consumer discover supported options from editor completion?
- Does a misspelled property fail at compile time where it should?
- Is the type narrower than the actual Solr contract, or broader than justified?
- Are optional, nullable, version-specific, and unknown fields distinguished correctly?
- Does the type imply runtime support that has not been verified?
