import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { SolrHttpError } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";
import { fetchV2Introspection } from "../helpers/v2-introspection.js";

async function inspectOrRecordUnavailable(
  client: Parameters<typeof fetchV2Introspection>[0],
  path: `/api/${string}`
): Promise<unknown> {
  try {
    return await fetchV2Introspection(client, path);
  } catch (error) {
    if (error instanceof SolrHttpError && error.status === 404) {
      return { unavailable: true, status: error.status, payload: error.payload };
    }
    throw error;
  }
}

integrationTest("V2 Core Admin introspection records per-operation availability on each pinned Solr version", async ({
  client,
  createCore
}) => {
  const name = await createCore("v2_introspect");
  const corePath = `/api/cores/${encodeURIComponent(name)}` as `/api/${string}`;
  const introspection = {
    list: await inspectOrRecordUnavailable(client, "/api/cores"),
    status: await inspectOrRecordUnavailable(client, corePath),
    reload: await inspectOrRecordUnavailable(client, `${corePath}/reload` as `/api/${string}`),
    rename: await inspectOrRecordUnavailable(client, `${corePath}/rename` as `/api/${string}`),
    unload: await inspectOrRecordUnavailable(client, `${corePath}/unload` as `/api/${string}`)
  };
  assert.ok(
    typeof introspection.list === "object" && introspection.list !== null &&
      Array.isArray((introspection.list as { spec?: unknown }).spec),
    "Core Admin V2 root introspection must expose a spec array"
  );

  const fixtureOutput = process.env.SOLR_V2_INTROSPECTION_OUTPUT;
  if (fixtureOutput) {
    mkdirSync(dirname(fixtureOutput), { recursive: true });
    writeFileSync(fixtureOutput, JSON.stringify({
      metadata: {
        solrVersion: process.env.SOLR_VERSION,
        endpoints: ["/api/cores", corePath, `${corePath}/reload`, `${corePath}/rename`, `${corePath}/unload`],
        capturedAt: new Date().toISOString()
      },
      introspection
    }, null, 2) + "\n");
  }
});

const lifecycleRuntimeVersions = ["9.11.0", "10.1.0"];
integrationTest("V2 Core Admin lists, reloads, renames, and unloads isolated cores", async ({
  client,
  createCore,
  createId
}) => {
  const name = await createCore("v2_core");
  const all = await client.v2.coreAdmin.list({ indexInfo: true });
  assert.equal(all.status?.[name]?.name, name);
  assert.equal(typeof all.status?.[name]?.instanceDir, "string");

  const one = await client.v2.coreAdmin.status(name, { indexInfo: false });
  assert.equal(one.status?.[name]?.name, name);

  await client.v2.coreAdmin.reload(name);
  const reloaded = await client.v2.coreAdmin.status(name);
  assert.equal(reloaded.status?.[name]?.name, name);

  const renamedName = createId("v2_renamed");
  let currentName = name;
  try {
    await client.v2.coreAdmin.rename(name, { to: renamedName });
    currentName = renamedName;
    const renamed = await client.v2.coreAdmin.status(renamedName);
    assert.equal(renamed.status?.[renamedName]?.name, renamedName);
  } finally {
    if (currentName !== name) {
      await client.v2.coreAdmin.rename(currentName, { to: name });
    }
  }
  const restored = await client.v2.coreAdmin.status(name);
  assert.equal(restored.status?.[name]?.name, name);

  const unloadName = createId("v2_unload");
  await client.coreAdmin("CREATE", { name: unloadName, instanceDir: unloadName, configSet: "_default" });
  let cleanupNeeded = true;
  try {
    await client.v2.coreAdmin.unload(unloadName, {});
    const afterUnload = await client.v2.coreAdmin.list();
    cleanupNeeded = Boolean(afterUnload.status?.[unloadName]);
    assert.equal(cleanupNeeded, false);
  } finally {
    if (cleanupNeeded) {
      try {
        await client.coreAdmin("UNLOAD", {
          core: unloadName,
          deleteIndex: true,
          deleteDataDir: true,
          deleteInstanceDir: true
        });
      } catch (error) {
        if (!(error instanceof SolrHttpError) || ![400, 404].includes(error.status)) throw error;
      }
    }
  }
}, 120_000, lifecycleRuntimeVersions.includes(process.env.SOLR_VERSION ?? "")
  ? undefined
  : "Core Admin V2 lifecycle runtime verification is pending for this Solr version");
