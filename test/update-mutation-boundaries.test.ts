import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolrClient } from "../src/index.js";

function createClient() {
  return createSolrClient({
    core: "catalog",
    fetch: async () => new Response(JSON.stringify({ responseHeader: { status: 0 } }))
  });
}

test("atomic updates accept supported modifiers and metadata fields", async () => {
  const requests: Array<{ url: URL; body: unknown }> = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requests.push({
        url: new URL(String(input)),
        body: JSON.parse(String(init?.body))
      });
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.atomicUpdate([
    { id: "one", count: { inc: 2 }, title: { set: "Updated" }, tags: { add: ["new"] } },
    { id: "two", _root_: "root-1", _version_: 7, tags: { removeregex: ["^old", "legacy$"] } }
  ]);

  assert.deepEqual(requests.map(request => request.body), [
    [
      { id: "one", count: { inc: 2 }, title: { set: "Updated" }, tags: { add: ["new"] } },
      { id: "two", _root_: "root-1", _version_: 7, tags: { removeregex: ["^old", "legacy$"] } }
    ]
  ]);
  assert.equal(requests[0]!.url.pathname, "/solr/catalog/update");
});

test("atomic update validation rejects malformed metadata, keys, and modifiers before fetch", () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => {
      calls++;
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });
  const invalidDocuments: unknown[] = [
    { id: "one", _root_: "" , count: { inc: 1 } },
    { id: "one", _root_: 1, count: { inc: 1 } },
    { id: "one", _version_: Number.NaN, count: { inc: 1 } },
    { id: "one", _version_: Infinity, count: { inc: 1 } },
    { count: { inc: 1 } },
    { id: "one" },
    { id: "one", other: "two", count: { inc: 1 } },
    { id: "one", count: {} },
    { id: "one", count: { inc: 1, set: 2 } },
    { id: "one", count: { unsupported: 1 } },
    { id: "one", count: { inc: "1" } },
    { id: "one", count: { inc: Infinity } },
    { id: "one", tags: { removeregex: 42 } },
    { id: "one", tags: { removeregex: ["valid", 42] } },
    { id: true, count: { inc: 1 } }
  ];

  for (const document of invalidDocuments) {
    assert.throws(() => client.atomicUpdate(document as never));
  }
  assert.equal(calls, 0);
});

test("update and delete reject invalid commitWithin and blank routes", () => {
  const client = createClient();
  for (const commitWithin of [-1, 1.5, Number.NaN, Infinity]) {
    assert.throws(() => client.add({ id: "one" }, { commitWithin }), RangeError);
    assert.throws(() => client.delete("one", { commitWithin }), RangeError);
  }
  for (const route of ["", "   "]) {
    assert.throws(() => client.add({ id: "one" }, { route }), TypeError);
    assert.throws(() => client.delete("one", { route }), TypeError);
  }
});

test("JSON update command validation rejects invalid envelopes and add commands", () => {
  const client = createClient();
  const invalid: unknown[] = [
    null,
    [],
    {},
    { unknown: {} },
    { add: null },
    { add: [] },
    { add: {} },
    { add: { doc: null } },
    { add: { doc: [] } },
    { add: { doc: { id: "one" }, commitWithin: -1 } },
    { add: { doc: { id: "one" }, commitWithin: 1.5 } },
    { add: { doc: { id: "one" }, commitWithin: "0" } },
    { add: { doc: { id: "one" }, overwrite: "false" } }
  ];

  for (const commands of invalid) {
    assert.throws(() => client.updateCommands(commands as never));
  }
});

test("JSON delete commands validate IDs, queries, version constraints, and extra keys", () => {
  const client = createClient();
  const invalid: unknown[] = [
    { delete: null },
    { delete: 42 },
    { delete: [] },
    { delete: [ "one", 2 ] },
    { delete: {} },
    { delete: { id: "one", query: "*:*" } },
    { delete: { id: "one", unexpected: true } },
    { delete: { query: "*:*", unexpected: true } },
    { delete: { id: "one", _version_: "7" } },
    { delete: { query: "*:*", _version_: 7 } }
  ];

  for (const commands of invalid) {
    assert.throws(() => client.updateCommands(commands as never));
  }
});

test("JSON commit, optimize, and rollback commands enforce operation-specific options", () => {
  const client = createClient();
  const invalid: unknown[] = [
    { commit: null },
    { commit: [] },
    { commit: { maxSegments: 1 } },
    { commit: { softCommit: true, expungeDeletes: true } },
    { optimize: { expungeDeletes: true } },
    { optimize: { maxSegments: 0 } },
    { optimize: { maxSegments: -1 } },
    { optimize: { maxSegments: 1.5 } },
    { rollback: { anything: true } }
  ];

  for (const commands of invalid) {
    assert.throws(() => client.updateCommands(commands as never));
  }
});

test("JSON update commands accept valid delete forms and reconcile openSearcher", async () => {
  const requests: Array<{ url: URL; body: unknown }> = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requests.push({
        url: new URL(String(input)),
        body: JSON.parse(String(init?.body))
      });
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.updateCommands({
    delete: ["one", "two"]
  });
  await client.updateCommands({
    delete: { id: "one", _version_: 7 },
    commit: { openSearcher: false },
    optimize: { maxSegments: 1, openSearcher: false }
  });

  assert.deepEqual(requests[0]!.body, { delete: ["one", "two"] });
  assert.deepEqual(requests[1]!.body, {
    delete: { id: "one", _version_: 7 },
    commit: {},
    optimize: { maxSegments: 1 }
  });
  assert.equal(requests[1]!.url.searchParams.get("openSearcher"), "false");
});

test("JSON update commands reject conflicting commit and optimize openSearcher values", () => {
  const client = createClient();
  assert.throws(() => client.updateCommands({
    commit: { openSearcher: true },
    optimize: { openSearcher: false }
  }));
});


test("addStream rejects a non-AsyncIterable source before Fetch", () => {
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => {
      calls++;
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  assert.throws(() => client.addStream([] as never), /AsyncIterable/);
  assert.equal(calls, 0);
});

test("delete forwards request-control options and accepts commitWithin zero", async () => {
  const controller = new AbortController();
  let capturedHeaders: Headers | undefined;
  let capturedSignal: AbortSignal | undefined;
  let calls = 0;
  const client = createSolrClient({
    core: "catalog",
    fetch: async (_input, init) => {
      calls++;
      capturedHeaders = new Headers(init?.headers);
      capturedSignal = init?.signal ?? undefined;
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.delete("one", {
    commitWithin: 0,
    signal: controller.signal,
    timeoutMs: 1000,
    headers: { "x-delete-request": "boundary" }
  });
  await client.add({ id: "zero-commit-within" }, { commitWithin: 0 });

  assert.equal(calls, 2);
  assert.equal(capturedHeaders?.get("x-delete-request"), "boundary");
  assert.ok(capturedSignal instanceof AbortSignal);
});


test("JSON update commands accept string and query deletes with independent commit and optimize options", async () => {
  const requests: Array<{ url: URL; body: unknown }> = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async (input, init) => {
      requests.push({
        url: new URL(String(input)),
        body: JSON.parse(String(init?.body))
      });
      return new Response(JSON.stringify({ responseHeader: { status: 0 } }));
    }
  });

  await client.updateCommands({ delete: "one", commit: { softCommit: true } });
  await client.updateCommands({ delete: { query: "*:*" }, optimize: { maxSegments: 2, openSearcher: true } });
  await client.updateCommands({ commit: { expungeDeletes: true } });
  await client.updateCommands({ rollback: {} });
  await client.updateCommands({ commit: { openSearcher: true } });

  assert.deepEqual(requests[0]!.body, { delete: "one", commit: { softCommit: true } });
  assert.deepEqual(requests[1]!.body, { delete: { query: "*:*" }, optimize: { maxSegments: 2 } });
  assert.equal(requests[1]!.url.searchParams.get("openSearcher"), "true");
  assert.deepEqual(requests[2]!.body, { commit: { expungeDeletes: true } });
  assert.deepEqual(requests[3]!.body, { rollback: {} });
  assert.equal(requests[4]!.url.searchParams.get("openSearcher"), "true");
});

test("commit rejects incompatible soft-commit and optimize-only options", () => {
  const client = createClient();
  assert.throws(() => client.commit({ softCommit: true, expungeDeletes: true }));
  assert.throws(() => client.commit({ maxSegments: 1 } as never));
});
