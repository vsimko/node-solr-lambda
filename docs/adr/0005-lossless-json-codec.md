# ADR 0005: Injectable lossless JSON codec

- Status: Accepted
- Date: 2026-11-07
- Issue: [#292](https://github.com/vsimko/node-solr-lambda/issues/292)

## Context

Solr commonly returns 64-bit integer values such as `_version_`. JavaScript's native `JSON.parse()` converts JSON numbers to IEEE-754 `number`, which cannot represent every integer above `Number.MAX_SAFE_INTEGER` exactly. `JSON.stringify()` also rejects `bigint` values. Changing all numeric values to strings or BigInt by default would be a breaking behavioral change and could alter validation and consumer types.

The client centralizes structured JSON parsing and serialization in the shared transport. Both `request()` and `requestRaw()` use this boundary; raw string bodies and successful raw response streams are deliberate escape hatches.

## Decision

Add an optional `jsonCodec` to `SolrClientConfig` with `parse(text)` and `stringify(value)` methods. When omitted, the transport continues to use native `JSON.parse()` and `JSON.stringify()` exactly as before.

The configured codec is used for:

- successful JSON response bodies returned by `request()`;
- structured JSON error payloads exposed through `SolrHttpError` in both `request()` and `requestRaw()`;
- JSON request bodies sent by `request()` and `requestRaw()`.

Explicit string bodies passed to `requestRaw()` remain byte-for-byte unchanged. Successful `requestRaw()` responses remain raw `Response` objects and are not parsed by the codec. Empty or malformed JSON response bodies retain the existing behavior of returning `undefined` or raw text respectively.

The library does not add a mandatory runtime dependency or implement a second JSON parser. Consumers can supply a lossless parser/serializer, including a BigInt-aware codec, and type their own document/response fields accordingly.

## Alternatives considered

1. **Change the default parser to BigInt/lossless mode:** rejected because it silently changes public numeric types and can break existing consumers.
2. **Convert large integers to strings by default:** rejected because it changes numeric semantics and makes consumers handle mixed number/string values.
3. **Add a mandatory `json-bigint` runtime dependency:** rejected to preserve the lightweight, zero-mandatory-dependency transport.
4. **Expose only a response parser:** rejected because request serialization must also preserve BigInt values for atomic updates and optimistic concurrency `_version_` workflows.
5. **Expose codec only on individual requests:** rejected because parser/serializer pairing is a client-level policy and must also apply consistently to error payloads and raw-request JSON bodies.

## Consequences

- Default behavior and dependency footprint remain unchanged.
- Opt-in consumers own codec selection, correctness, performance, and public result typing.
- Input/output validation receives the values produced by the configured codec.
- Raw strings and raw successful response streams remain caller-controlled.
- Tests must cover exact round-trip above 2^53-1, normal numbers, decimals, nested objects, arrays, malformed JSON, HTTP errors, and both JSON request methods.

## Verification

The transport serialization tests use a test-only lossless codec to prove exact `_version_` and nested integer round-trip, JSON request serialization, error payload parsing, malformed JSON fallback, and unchanged native JSON behavior. The API is verified by the Node.js type-test and CI matrices.
