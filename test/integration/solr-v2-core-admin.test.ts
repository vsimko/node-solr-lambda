import assert from "node:assert/strict";
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

  const all = await client.v2.coreAdmin.list({ indexInfo: true });
  assert.equal(all.status?.[name]?.name, name);
  assert.equal(typeof all.status?.[name]?.instanceDir, "string");

  const one = await client.v2.coreAdmin.status(name, { indexInfo: false });
  assert.equal(one.status?.[name]?.name, name);

  await client.v2.coreAdmin.reload(name);
  const reloaded = await client.v2.coreAdmin.status(name);
  assert.equal(reloaded.status?.[name]?.name, name);

  const renamedName = createId("v2_renamed");
  await client.v2.coreAdmin.rename(name, { to: renamedName });
  const renamed = await client.v2.coreAdmin.status(renamedName);
  assert.equal(renamed.status?.[renamedName]?.name, renamedName);

  // Restore the original name so the shared fixture's cleanup can unload it.
  await client.v2.coreAdmin.rename(renamedName, { to: name });
  const restored = await client.v2.coreAdmin.status(name);
  assert.equal(restored.status?.[name]?.name, name);

  const unloadName = createId("v2_unload");
  await client.coreAdmin("CREATE", { name: unloadName, instanceDir: unloadName, configSet: "_default" });
  let unloaded = false;
  try {
    await client.v2.coreAdmin.unload(unloadName, {});
    const afterUnload = await client.coreAdmin<{ status?: Record<string, unknown> }>("STATUS", { core: unloadName });
    assert.equal(afterUnload.status?.[unloadName], undefined);
    unloaded = true;
  } finally {
    if (!unloaded) {
      await client.coreAdmin("UNLOAD", {
        core: unloadName,
        deleteIndex: true,
        deleteDataDir: true,
        deleteInstanceDir: true
      });
    }
  }
}, 120_000, v2CoreAdminSupported ? undefined : "V2 Core Admin is not documented for the Solr 8.11 baseline");
