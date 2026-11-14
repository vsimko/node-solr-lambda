---
name: solr-compatibility
description: Use when assessing Solr version support, updating compatibility claims, interpreting CI matrices, or deciding whether an endpoint/option is verified.
---

# Solr compatibility

## Read first

- `docs/compatibility.md`
- `docs/api-coverage.md`
- `docs/collections-api-coverage.md`
- `docs/endpoint-inventory.md`
- `docs/api-inventory.json`
- Relevant Solr release notes and CI workflow results

## Current project baselines

The documented pinned targets are:

- Solr 10.1.0 — current primary target
- Solr 9.11.0 — current compatibility target
- Solr 8.11.4 — legacy compatibility only; upstream 8.x is EOL

These are exact baselines, not blanket guarantees for every patch release in a major line. Re-read `docs/compatibility.md` before using these values; the policy may change.

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

When a change affects support claims:

- Update the endpoint-specific evidence in `docs/compatibility.md`.
- Update `docs/api-coverage.md` and/or `docs/collections-api-coverage.md`.
- Update `docs/api-inventory.json` and any generated/validated views consistently.
- Record exact Solr version, operation, relevant options, test outcome, and limitations.
- Keep roadmap status aligned with the evidence.
- Run the repository documentation and API inventory checks.

## Review questions

- Which exact version was tested?
- Which exact endpoint/action/options were exercised?
- Did the test assert meaningful server state?
- Was the environment standalone, secured, or SolrCloud?
- Are destructive and optional operations gated?
- Does the wording claim more than the evidence supports?
