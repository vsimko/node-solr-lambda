import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { SolrHttpError } from "../../src/index.js";
import { integrationTest } from "./fixtures.js";
import { fetchV2Introspection } from "../helpers/v2-introspection.js";

const v2CoreAdminSupported = ["9.11.0", "10.1.0"].includes(process.env.SOLR_VERSION ?? "");

integrationTest("V2 Core Admin discovers, reloads, renames, and unloads isolated cores", async ({
  client,
  createCore,
  createId
}) => {
  const name = await createCore("v2_core");
  const introspection = await fetchV2Introspection(client, "/api/cores");
  assert.ok(Array.isArray(introspection.spec), "Core Admin V2 introspection must expose its spec array");
  const fixtureOutput = process.env.SOLR_V2_INTROSPECTION_OUTPUT;
  if (fixtureOutput) {
    mkdirSync(dirname(fixtureOutput), { recursive: true });
    writeFileSync(fixtureOutput, JSON.stringify({
      metadata: {
        solrVersion: process.env.SOLR_VERSION,
        endpoint: "/api/cores/_introspect",
        capturedAt: new Date().toISOString()
      },
      introspection
    }, null, 2) + "\\n");
  }

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
    // Restore the original name so the shared fixture's cleanup can unload it.
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
        // A 400/404 here means V2 unload already removed the core.
        if (!(error instanceof SolrHttpError) || ![400, 404].includes(error.status)) throw error;
      }
    }
  }
}, 120_000, v2CoreAdminSupported ? undefined : "V2 Core Admin is not documented for the Solr 8.11 baseline");
