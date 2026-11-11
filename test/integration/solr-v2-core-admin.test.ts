import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { SolrHttpError } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";
import { fetchV2Introspection } from "../helpers/v2-introspection.js";

integrationTest("V2 Core Admin introspection captures the list and per-core resource documents", async ({
  client,
  createCore
}) => {
  const name = await createCore("v2_introspect");
  const corePath = `/api/cores/${encodeURIComponent(name)}` as `/api/${string}`;
  const introspection = {
    list: await fetchV2Introspection(client, "/api/cores/"),
    status: await fetchV2Introspection(client, corePath)
  };
  assert.ok(
    typeof introspection.list === "object" && introspection.list !== null &&
      Array.isArray((introspection.list as { spec?: unknown }).spec),
    "Core Admin V2 root introspection must expose a spec array"
  );
  assert.ok(
    typeof introspection.status === "object" && introspection.status !== null &&
      Array.isArray((introspection.status as { spec?: unknown }).spec),
    "Core Admin V2 per-core introspection must expose a spec array"
  );

  const fixtureOutput = process.env.SOLR_V2_INTROSPECTION_OUTPUT;
  if (fixtureOutput) {
    mkdirSync(dirname(fixtureOutput), { recursive: true });
    writeFileSync(fixtureOutput, JSON.stringify({
      metadata: {
        solrVersion: process.env.SOLR_VERSION,
        endpoints: ["/api/cores/_introspect", `${corePath}/_introspect`],
        capturedAt: new Date().toISOString()
      },
      introspection
    }, null, 2) + "\n");
  }
});

integrationTest("V2 Core Admin list and status work on every pinned Solr version", async ({
  client,
  createCore
}) => {
  const name = await createCore("v2_read");
  const all = await client.v2.coreAdmin.list({ indexInfo: false });
  assert.equal(all.status?.[name]?.name, name);

  const one = await client.v2.coreAdmin.status(name, { indexInfo: false });
  assert.equal(one.status?.[name]?.name, name);
});

const lifecycleRuntimeVersions = ["9.11.0", "10.1.0"];
integrationTest("V2 Core Admin reloads, renames, and unloads isolated cores", async ({
  client,
  createCore,
  createId
}) => {
  const name = await createCore("v2_core");
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
  : "The implemented lifecycle subroutes are only runtime-verified on Solr 9.11.0 and 10.1.0");
