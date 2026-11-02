import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError } from "../src/index.js";

test("core backup and restore commands use ReplicationHandler parameters", async () => {
  const urls: URL[] = [];
  const client = createSolrClient({
    core: "catalog",
    fetch: async input => {
      urls.push(new URL(String(input)));
      return new Response(JSON.stringify({ responseHeader: { status: 0 }, status: "OK" }));
    }
  });

  await client.replication("backup", { numberToKeep: 3, location: "/var/solr/backups", commitName: "before-import" });
  await client.replication("restore", { name: "nightly", location: "/var/solr/backups" });
  await client.replication("restorestatus");
  await client.replication("deletebackup", { name: "nightly", location: "/var/solr/backups" });

  assert.equal(urls[0]!.pathname, "/solr/catalog/replication");
  assert.equal(urls[0]!.searchParams.get("command"), "backup");
  assert.equal(urls[0]!.searchParams.get("name"), null);
  assert.equal(urls[0]!.searchParams.get("numberToKeep"), "3");
  assert.equal(urls[0]!.searchParams.get("commitName"), "before-import");
  assert.equal(urls[1]!.searchParams.get("command"), "restore");
  assert.equal(urls[2]!.searchParams.get("command"), "restorestatus");
  assert.equal(urls[3]!.searchParams.get("command"), "deletebackup");
});

test("SolrCloud collection backup, restore, listing, and async status use typed actions", async () => {
  const urls: URL[] = [];
  const client = createSolrClient({
    baseUrl: "http://localhost:8983/solr",
    fetch: async input => {
      urls.push(new URL(String(input)));
      return new Response(JSON.stringify({ responseHeader: { status: 0 }, status: { state: "completed" } }));
    }
  });

  await client.collections("BACKUP", {
    name: "nightly",
    collection: "catalog",
    location: "file:///var/solr/backups",
    async: "backup-1",
    backupConfigset: true,
    incremental: false,
    indexBackup: "copy-files"
  });
  await client.collections("RESTORE", {
    name: "nightly",
    collection: "catalog-restored",
    location: "file:///var/solr/backups",
    backupId: 2,
    async: "restore-1",
    "collection.configName": "_default"
  });
  await client.collections("LISTBACKUP", { name: "nightly", location: "file:///var/solr/backups" });
  await client.collections("DELETEBACKUP", { name: "nightly", location: "file:///var/solr/backups", backupId: 2 });
  await client.collections("REQUESTSTATUS", { requestid: "backup-1" });
  await client.collections("DELETESTATUS", { requestid: "backup-1" });
  await client.collections("DELETESTATUS", { flush: true });

  assert.equal(urls[0]!.pathname, "/solr/admin/collections");
  assert.equal(urls[0]!.searchParams.get("action"), "BACKUP");
  assert.equal(urls[0]!.searchParams.get("collection"), "catalog");
  assert.equal(urls[0]!.searchParams.get("backupConfigset"), "true");
  assert.equal(urls[0]!.searchParams.get("incremental"), "false");
  assert.equal(urls[0]!.searchParams.get("async"), "backup-1");
  assert.equal(urls[1]!.searchParams.get("action"), "RESTORE");
  assert.equal(urls[1]!.searchParams.get("collection"), "catalog-restored");
  assert.equal(urls[1]!.searchParams.get("backupId"), "2");
  assert.equal(urls[2]!.searchParams.get("action"), "LISTBACKUP");
  assert.equal(urls[3]!.searchParams.get("action"), "DELETEBACKUP");
  assert.equal(urls[4]!.searchParams.get("action"), "REQUESTSTATUS");
  assert.equal(urls[4]!.searchParams.get("requestid"), "backup-1");
  assert.equal(urls[5]!.searchParams.get("action"), "DELETESTATUS");
});


test("core backup commands preserve Solr failures", async () => {
  const body = JSON.stringify({ error: { code: 500, msg: "backup repository unavailable" } });
  const client = createSolrClient({
    core: "catalog",
    fetch: async () => new Response(body, { status: 500, statusText: "Server Error" })
  });

  await assert.rejects(client.replication("backup"), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    assert.equal(error.status, 500);
    assert.equal(error.message, "backup repository unavailable");
    return true;
  });
});
