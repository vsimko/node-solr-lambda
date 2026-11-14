# Architecture decision records

This directory contains the project's recorded architectural decisions (ADRs). ADRs preserve the context, decision, alternatives, and consequences of material design choices.

| ADR | Decision |
|---|---|
| [0001 — GitHub Pages site](0001-github-pages-site.md) | Public project website architecture |
| [0002 — Solr client API coverage](0002-solr-client-api-coverage.md) | API coverage and implementation principles |
| [0003 — Cross-client test strategy](0003-cross-client-test-strategy.md) | Regression test strategy across client behavior |
| [0004 — Suggester query component](0004-suggester-query-component.md) | Suggester API design |
| [0005 — Lossless JSON codec](0005-lossless-json-codec.md) | Injectable lossless JSON handling |
| [0006 — Streaming document ingestion](0006-streaming-document-ingestion.md) | Backpressure-aware document ingestion |
| [0007 — Project identity migration](0007-project-identity-migration.md) | Package and repository identity |
| [0008 — Agent skills and documentation infrastructure](0008-agent-skills-and-documentation-infrastructure.md) | Agent skill discovery, documentation navigation, and automated validation |

When adding an ADR, use the existing numbered naming convention and update this index and [the documentation index](../index.md). Do not silently rewrite historical rationale; record superseding decisions explicitly.
