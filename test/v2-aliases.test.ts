import assert from "node:assert/strict";
import test from "node:test";
import { createSolrClient } from "../src/index.js";

test("V2 alias list and get use the documented GET routes and response shapes", async () => {
  const requests: { url: URL; method: string }[] = [];
  const client = createSolrClient({
    fetch: async (input, init) => {
      const url = new URL(String(input));
      requests.push({ url, method: String(init?.method) });
      const body = requests.length === 1
        ? {
            responseHeader: { status: 0 },
            aliases: { books_current: "books_v1,books_v2" },
            properties: { books_current: { router: "implicit" } }
          }
        : {
            responseHeader: { status: 0 },
            name: "books current",
            collections: ["books_v1", "books_v2"],
            properties: { router: "implicit" }
          };
      return new Response(JSON.stringify(body));
    }
  });

  const list = await client.v2.aliases.list();
  const alias = await client.v2.aliases.get("books current");

  assert.equal(list.aliases?.books_current, "books_v1,books_v2");
  assert.equal(list.properties?.books_current?.router, "implicit");
  assert.equal(alias.name, "books current");
  assert.deepEqual(alias.collections, ["books_v1", "books_v2"]);
  assert.equal(requests[0]!.url.pathname, "/api/aliases");
  assert.equal(requests[0]!.method, "GET");
  assert.equal(requests[1]!.url.pathname, "/api/aliases/books%20current");
  assert.equal(requests[1]!.method, "GET");
});

test("V2 alias get rejects empty, path-like, and dot-segment names before fetch", () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  for (const name of ["", " ", ".", "..", "../admin", "a/b", "a\\b"]) {
    assert.throws(() => client.v2.aliases.get(name), /non-empty alias name/);
  }
});
