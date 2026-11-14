# Architecture documentation

This directory provides a topic map for the architecture and design decisions documented in the repository. The main [client architecture](../architecture.md) guide describes the transport, API modules, public facade, and TypeScript type model.

| Topic | Canonical documentation |
|---|---|
| Client structure and transport | [Client architecture](../architecture.md) |
| Solr endpoint support | [Endpoint inventory](../endpoint-inventory.md), [API coverage](../api-coverage.md) |
| Version and runtime evidence | [Compatibility matrix](../compatibility.md), [testing strategy](../testing-strategy.md) |
| Public API quality | [Public API review](../public-api-review.md), [API reference](../api-reference.md) |
| Performance | [Benchmarking](../benchmarking.md) |
| Project direction | [Roadmap](../roadmap.md) |
| Website and generated data | [Website data contract](../site-data-contract.md), [website validation](../site-data-validation.md) |
| Historical design decisions | [Architecture decision records](../adr/README.md) |

## Architecture decision records

Architecture decisions are recorded under [`docs/adr/`](../adr/README.md). Read the relevant record before changing a decision it governs. Add a new numbered ADR when a change introduces a material architectural choice, or update an existing record only when its decision status or consequences genuinely change.
