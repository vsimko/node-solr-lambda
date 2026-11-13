# Testing and quality strategy

This document defines the evidence expected before a public API or compatibility claim is made. The machine-readable [API inventory](api-inventory.json) records coverage per API surface; the [API coverage matrix](api-coverage.md) and [Collections action matrix](collections-api-coverage.md) provide the human-readable views.

## Test layers

| Layer | Command / workflow | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Static types and source build | `npm run typecheck`, `npm run test:types` | Public declarations compile; action-specific request/response types and negative type fixtures behave as expected. | Runtime Solr compatibility. |
| Consumer package | `npm run test:consumer:no-zod` and `npm pack --dry-run` in `release:check` | The packed package can be consumed without optional Zod dependencies; published files and exports are present. | Every downstream bundler/runtime combination. |
| Unit and contract | `npm test` | Exact URL, method, query/body serialization, response parsing, errors, cancellation, and transport behavior covered by the unit fixtures. | Solr server behavior or plugin-specific semantics. |
| Standalone integration | CI `integration` matrix | Actual endpoint behavior against exact pinned Solr images. | SolrCloud coordination or security authorization. |
| Security integration | CI `security-integration` matrix | Authentication, authorization, denied requests, and security-enabled server behavior. | Every external identity provider or deployment-specific policy. |
| SolrCloud integration | CI `cloud-integration` matrix | Cluster-aware operations and state against the pinned multi-node topology. | Destructive or stale-replica recovery unless an explicit opt-in test covers it. |
| Destructive/manual SolrCloud | Manual `workflow_dispatch`, destructive opt-in | High-risk operations in disposable, loopback-only clusters. | General production safety or support for untested topologies. |
| Performance | `npm run bench` | Reproducible client-vs-direct-Fetch measurements on a controlled host. | Performance leadership or regression budgets until repeatable baselines exist. |

The runtime integration suites cover the Cartesian product of Node.js 22, 24, and 26 with Solr 8.11.4, 9.11.0, and 10.1.0. Solr 8.11.4 is a legacy regression target because upstream Solr 8.x is EOL; see the [support policy](compatibility.md). The configured matrix is not itself evidence: a version/operation is marked tested only after its relevant workflow run completes successfully.

## API-to-test traceability

1. Every public endpoint family must have an entry in `docs/api-inventory.json`.
2. The entry names its public client method, type coverage, unit test files, integration status, per-version evidence, and documentation.
3. Action-specific Collections coverage belongs in `docs/collections-api-coverage.md`; generic aggregate API status must not hide an unverified action.
4. A typed method is not automatically runtime-supported. Serialization/type-only entries must retain `unverified` or `not-run` version status until the exact server behavior is exercised.
5. New request/response contracts require positive consumer fixtures and negative `@ts-expect-error` fixtures for required fields and invalid action/parameter combinations.
6. Changes to `api-inventory.json` must pass `npm run test:api-inventory` and `npm run docs:check`.

## Required failure-mode coverage

For each shared transport or API change, add the relevant negative cases rather than testing only the happy path:

- HTTP 4xx/5xx and structured Solr error bodies.
- Network rejection, timeout, explicit abort, and cancellation.
- Malformed or unexpected response bodies and content types.
- Authentication failures and authorization denial.
- Retry behavior, including non-replayable streaming POSTs that must not be retried.
- Streaming source errors, slow producers/backpressure, early consumer cancellation, iterator cleanup, and partial-ingestion semantics.
- SolrCloud operations: missing collection/shard/replica, asynchronous failures, stale state, and partial cluster failure where safe to simulate.

Not every API requires every failure mode. The API inventory and focused test names must make the relevant evidence discoverable. Do not claim a failure path is covered merely because a generic error parser has unit tests.

## Coverage and mutation testing

The Node.js built-in test coverage report is generated on Node.js 26 in CI and is published in the workflow summary. It is an initial visibility baseline for the unit suite, not a release threshold: coverage percentages alone do not measure assertion quality, Solr compatibility, or safety.

Mutation testing is separate from ordinary CI and is not scheduled. The one-time StrykerJS baseline tracked by [#343](https://github.com/vsimko/solr-ts-client/issues/343) was completed and reviewed in [#364](https://github.com/vsimko/solr-ts-client/issues/364): the last complete report (#22) scored **81.51%** (811 killed, 177 survived, 4 no-coverage, 3 timeouts, and 374 compile errors). Three transport timeout mutants are documented as a runner limitation. The maintainer accepted this baseline; no mutation-score threshold, additional survivor-classification work, or further mutation workflow is planned.

## Flaky-test and CI failure policy

- Do not add automatic retries or `continue-on-error` to hide intermittent test failures.
- A flaky test must have a linked issue containing the failing test, CI run, Node/Solr versions, logs, suspected cause, owner, and a target date.
- Quarantine is temporary and explicit: use a skip with the issue link and reason, and remove it once the fix is verified. Never leave untracked or indefinite skips.
- A skipped, queued, cancelled, or partially completed job is not a pass. Only a completed successful run counts as evidence for that matrix cell.
- When a workflow cancels sibling jobs after a failure, report the original failure and rerun only after fixing or understanding it; do not summarize cancelled jobs as successful.
- Destructive tests must remain manually dispatched, loopback-only, and isolated from shared collections.

## Release gate

A release candidate requires:
- source build and type fixtures;
- unit/contract tests;
- consumer package test and dry-run pack;
- full required standalone, security, and SolrCloud matrix for the pinned baselines;
- API inventory and documentation consistency checks;
- no unresolved high-severity security, data-loss, or release-blocking regression.

The release gate does not accept a green subset of the matrix when required jobs are cancelled or skipped. Manual destructive checks and upstream-release qualification are reported separately with their own evidence.
