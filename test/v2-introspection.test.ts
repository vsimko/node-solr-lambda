import { createSolrClient } from "../src/index.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fetchV2Introspection } from "./helpers/v2-introspection.js";

test("V2 introspection helper appends the introspection suffix without generating types", async () => {
  let requested = "";
  const payload = { methods: ["GET", "POST"], documentation: "fixture-only" };
  const client = createSolrClient({
    fetch: async input => {
      requested = String(input);
      return new Response(JSON.stringify(payload));
    }
  });

  const result = await fetchV2Introspection(client, "/api/collections/");
  assert.equal(new URL(requested).pathname, "/api/collections/_introspect");
  assert.deepEqual(result, payload);
});

test("V2 introspection helper rejects the API root", async () => {
  const client = createSolrClient({ fetch: async () => { throw new Error("fetch must not run"); } });
  await assert.rejects(
    fetchV2Introspection(client, "/api/" as `/api/${string}`),
    /resource path below \/api/
  );
});

test("committed Core Admin introspection fixtures cover all pinned Solr versions", () => {
  for (const version of ["8.11.4", "9.11.0", "10.1.0"]) {
    const fixture = JSON.parse(readFileSync(
      new URL(`./fixtures/v2-introspection/solr-${version}-core-admin.json`, import.meta.url),
      "utf8"
    )) as {
      metadata: { solrVersion: string; endpoints: string[] };
      introspection: {
        list: { spec?: unknown[]; availableSubPaths?: Record<string, string[]> };
        status: { spec?: unknown[]; availableSubPaths?: Record<string, string[]> };
      };
    };

    assert.equal(fixture.metadata.solrVersion, version);
    assert.deepEqual(fixture.metadata.endpoints, [
      "/api/cores/_introspect",
      "/api/cores/{core}/_introspect"
    ]);
    assert.ok(Array.isArray(fixture.introspection.list.spec));
    assert.ok(Array.isArray(fixture.introspection.status.spec));
    assert.ok(fixture.introspection.list.spec.length > 0);
    assert.ok(fixture.introspection.status.spec.length > 0);
  }

  const legacy = JSON.parse(readFileSync(
    new URL("./fixtures/v2-introspection/solr-8.11.4-core-admin.json", import.meta.url),
    "utf8"
  )) as {
    introspection: {
      list: { availableSubPaths?: Record<string, string[]> };
      status: { availableSubPaths?: Record<string, string[]> };
    };
  };
  assert.ok(Object.keys(legacy.introspection.list.availableSubPaths ?? {}).length > 0);
  assert.ok(Object.keys(legacy.introspection.status.availableSubPaths ?? {}).length > 0);
});

test("Solr 8.11.4 fixture records legacy Core Admin commands on the per-core resource", () => {
  const fixture = JSON.parse(readFileSync(
    new URL("./fixtures/v2-introspection/solr-8.11.4-core-admin.json", import.meta.url),
    "utf8"
  )) as {
    introspection: {
      status: {
        spec: Array<{ commands?: Record<string, unknown> }>;
      };
    };
  };
  const commands = Object.keys(fixture.introspection.status.spec[0]?.commands ?? {});
  assert.ok(commands.includes("reload"));
  assert.ok(commands.includes("rename"));
  assert.ok(commands.includes("unload"));
});

test("committed Core Admin introspection snapshots remain byte-pinned", () => {
  const captures = [
    ["8.11.4", "43dd7ed6705612e9cbdc1de8bf8911b0c82b622f25e99872ded67726e95d48bd"],
    ["9.11.0", "c83dd0e77e52145ca85847f82e53cd9979ccca2d9ca583ff555b53a0225bf7c2"],
    ["10.1.0", "79bfc7584b042d4cf8b2c699856fc73936d4e587650c7ddc33b34c3f80370827"]
  ] as const;

  for (const [version, expectedSha256] of captures) {
    const bytes = readFileSync(
      new URL(`./fixtures/v2-introspection/raw/solr-${version}-core-admin.json`, import.meta.url)
    );
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedSha256,
      `Solr ${version} committed snapshot must remain byte-for-byte unchanged`);

    const capture = JSON.parse(bytes.toString("utf8")) as {
      metadata: { solrVersion: string; endpoints: string[] };
      introspection: { list: { spec?: unknown[] }; status: { spec?: unknown[] } };
    };
    assert.equal(capture.metadata.solrVersion, version);
    assert.equal(capture.metadata.endpoints[0], "/api/cores/_introspect");
    assert.match(capture.metadata.endpoints[1] ?? "", /^\/api\/cores\/[^/]+\/_introspect$/);
    assert.ok((capture.introspection.list.spec?.length ?? 0) > 0);
    assert.ok((capture.introspection.status.spec?.length ?? 0) > 0);
  }
});
