---
name: solr-compatibility
description: Use when assessing Solr version support, updating compatibility claims, interpreting CI matrices, or deciding whether an endpoint or option is verified.
---

# Solr compatibility

## Canonical documentation

- [Solr compatibility matrix](../../../docs/compatibility.md)
- [API coverage](../../../docs/api-coverage.md)
- [Collections action coverage](../../../docs/collections-api-coverage.md)
- [Endpoint inventory](../../../docs/endpoint-inventory.md)
- [Machine-readable API inventory](../../../docs/api-inventory.json)

## Current project baselines

The documented pinned targets are Solr 10.1.0 (current primary target), Solr 9.11.0 (current compatibility target), and Solr 8.11.4 (legacy compatibility only; upstream 8.x is EOL). Re-read the compatibility policy before using these values; they may change.

## Evidence rules

1. Compatibility is operation-specific and, where relevant, option-specific.
2. Type correctness, successful compilation, unit tests, and successful generic raw requests do not prove server compatibility.
3. A successful integration test proves only the behavior and exact server version exercised.
4. Separate documented endpoint availability from runtime-tested behavior.
5. Treat Solr V1 and V2 as distinct API surfaces. Do not infer V2 behavior from V1.
6. Preserve explicit states such as verified, partially verified, unverified, unsupported, and version-dependent according to the current matrix vocabulary.
7. When evidence is missing, say so. Never fill gaps with assumptions based on neighboring endpoints or versions.
8. Cite reproducible CI runs, test names, or other evidence in compatibility updates.

## Updating compatibility records

When a change affects support claims, update the endpoint-specific evidence in `docs/compatibility.md`, the relevant coverage matrices, `docs/api-inventory.json`, and the roadmap. Record exact Solr version, operation, relevant options, test outcome, and limitations. Run the repository documentation and API inventory checks.

## Review questions

- Which exact version was tested?
- Which exact endpoint/action/options were exercised?
- Did the test assert meaningful server state?
- Was the environment standalone, secured, or SolrCloud?
- Are destructive and optional operations gated?
- Does the wording claim more than the evidence supports?
