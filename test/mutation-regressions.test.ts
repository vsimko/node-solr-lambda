import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient } from "../src/index.js";

test("transport accepts the inclusive HTTP status-code boundaries for retry policy", () => {
  assert.doesNotThrow(() => createSolrClient({
    core: "catalog",
    retry: { retryableStatuses: [100, 599] },
    fetch: async () => new Response(null, { status: 200 })
  }));
});

test("transport retries a configured 599 response", async () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    retry: { maxAttempts: 2, retryableStatuses: [599], baseDelayMs: 0, maxDelayMs: 0 },
    fetch: async () => {
      calls += 1;
      return calls === 1
        ? new Response("edge status", { status: 599 })
        : new Response(JSON.stringify({ status: "ok" }));
    }
  });

  assert.deepEqual(await client.ping(), { status: "ok" });
  assert.equal(calls, 2);
});

test("transport rejects retry status values outside the HTTP status-code range", () => {
  for (const status of [99, 600, 100.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => createSolrClient({
        core: "catalog",
        retry: { retryableStatuses: [status] },
        fetch: async () => new Response(null, { status: 200 })
      }),
      /retryableStatuses must contain HTTP status codes/,
      `expected status ${String(status)} to be rejected`
    );
  }
});

test("update accepts zero commitWithin and one optimize segment", async () => {
  const requests: Array<{ url: URL; body: unknown }> = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requests.push({
        url: new URL(String(input)),
        body: init?.body === undefined ? undefined : JSON.parse(String(init.body))
      });
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.add({ id: "zero-window" }, { commitWithin: 0 });
  await client.optimize({ maxSegments: 1 });

  assert.equal(requests[0]!.url.searchParams.get("commitWithin"), "0");
  assert.deepEqual(requests[0]!.body, { id: "zero-window" });
  assert.deepEqual(requests[1]!.body, { optimize: { maxSegments: 1 } });
});

test("JSON update commands accept zero commitWithin and preserve overwrite false", async () => {
  let requestedBody: unknown;
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      requestedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.updateCommands({
    add: { doc: { id: "zero-window" }, commitWithin: 0, overwrite: false }
  });

  assert.deepEqual(requestedBody, {
    add: { doc: { id: "zero-window" }, commitWithin: 0, overwrite: false }
  });
});
