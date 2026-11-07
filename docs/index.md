# Documentation

This is the canonical catalogue for the project's guides, API references, compatibility evidence, and release documentation.

## Getting started and client fundamentals

- [Getting started](getting-started.md)
- [Configuration](configuration.md)
- [Runtime validation](validation.md)
- [Error handling](errors.md)
- [Client architecture](architecture.md)

## API guides

- [Query API](query.md)
- [RealTime Get API](realtime-get.md)
- [SpellCheck API](spellcheck.md)
- [Suggester API](suggester.md)
- [Update and Document API — full guide](update.md)
- [Document API overview — concise examples](documents.md)
- [Schema API](schema.md)
- [Config API](config.md)
- [Core Admin and Collections administration](administration.md)
- [Replication API](replication.md)
- [Backup and restore](backup-restore.md)
- [Streaming Expressions](streaming.md)
- [Export API](export.md)
- [Raw requests](raw-requests.md)

## API and compatibility references

- [Public API reference](api-reference.md)
- [API coverage](api-coverage.md)
- [Collections action coverage matrix](collections-api-coverage.md)
- [Solr endpoint inventory](endpoint-inventory.md)
- [Machine-readable API inventory](api-inventory.json)
- [Public API review](public-api-review.md)
- [Solr server compatibility matrix](compatibility.md)

## Migration, development, and release

- [Migration from v3 to v4](migration-v3-to-v4.md)
- [Development roadmap](roadmap.md)
- [Comparison with solr-client](solr-client-comparison.md)
- [Release process](release-process.md)
- [v4.0.0 release notes (draft)](release-notes-v4.0.0.md)

## Website architecture

- [Public project website](../website/index.html)

- [GitHub Pages architecture decision (ADR 0001)](adr/0001-github-pages-site.md)
- [Solr client API coverage and implementation principles (ADR 0002)](adr/0002-solr-client-api-coverage.md)
- [Cross-client regression test strategy (ADR 0003)](adr/0003-cross-client-test-strategy.md)
- [Suggester query-component decision (ADR 0004)](adr/0004-suggester-query-component.md)
- [Website data contract](site-data-contract.md)
- [Website data JSON Schema](site-data.schema.json)
- [Website data validation rules and commands](site-data-validation.md)

## Canonical guide note

The detailed [Update and Document API guide](update.md) is the canonical reference for document writes, atomic updates, update commands, and commit behavior. [Document API overview](documents.md) is intentionally retained as a short introduction with concise examples; it is not a separate or competing API specification.
