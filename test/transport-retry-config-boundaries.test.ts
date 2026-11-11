import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient } from "../src/index.js";

test("retry configuration rejects invalid attempt counts and delay boundaries", () => {
  for (const maxAttempts of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => createSolrClient({ retry: { maxAttempts } }),
      /retry\.maxAttempts must be a positive integer/
    );
  }

  for (const baseDelayMs of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => createSolrClient({ retry: { baseDelayMs } }),
      /retry\.baseDelayMs must be zero or greater/
    );
  }

  for (const maxDelayMs of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => createSolrClient({ retry: { maxDelayMs } }),
      /retry\.maxDelayMs must be zero or greater/
    );
  }

  assert.throws(
    () => createSolrClient({ retry: { baseDelayMs: 10, maxDelayMs: 9 } }),
    /retry\.maxDelayMs must be greater than or equal to retry\.baseDelayMs/
  );
  assert.doesNotThrow(() => createSolrClient({
    retry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 }
  }));
});

test("retryable HTTP status configuration accepts only integer status codes", () => {
  for (const retryableStatuses of [[99], [600], [200.5], [Number.NaN], [Number.POSITIVE_INFINITY]]) {
    assert.throws(
      () => createSolrClient({ retry: { retryableStatuses } }),
      /retryableStatuses must contain HTTP status codes/
    );
  }

  assert.doesNotThrow(() => createSolrClient({
    retry: { retryableStatuses: [100, 200, 429, 599] }
  }));
});
