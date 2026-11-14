---
name: typescript-api-design
description: Use when designing or reviewing exported TypeScript types, generics, query options, response models, or public client signatures.
---

# TypeScript API design

## Canonical documentation

- [Client architecture and type model guidelines](../../../docs/architecture.md)
- [Public API review](../../../docs/public-api-review.md)
- Relevant API guide from [the documentation index](../../../docs/index.md)

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

For a public type change, add consumer-style compile fixtures that prove typical valid usage, nested/action-specific options, invalid-key rejection where appropriate, generic propagation, extension-point usability, and declaration consumption.

Run `npm run test:types`. Do not rely only on `tsc` compiling implementation source.

## Review questions

- Can a consumer discover supported options from editor completion?
- Does a misspelled property fail at compile time where it should?
- Is the type narrower than the actual Solr contract, or broader than justified?
- Are optional, nullable, version-specific, and unknown fields distinguished correctly?
- Does the type imply runtime support that has not been verified?
