# ReplicationHandler API

The ReplicationHandler is a per-core V1 request handler at `/solr/{core}/replication`. It supports user-managed leader/follower index replication and is also used internally by SolrCloud for peer-to-peer shard recovery. Do not configure the user-managed leader/follower settings on a SolrCloud core.

The typed client exposes the documented replication commands and core-level backup/restore controls. See the [backup and restore guide](backup-restore.md) for snapshot lifecycle and SolrCloud collection backups.

## Configure a leader

The server must expose the ReplicationHandler with a leader configuration before it can produce a replicable file generation. For example, the Config API can add the handler to a core:

```ts
await client.config({
  "add-requesthandler": {
    name: "/replication",
    class: "solr.ReplicationHandler",
    customOptions: {
      leader: { replicateAfter: "commit" }
    }
  }
});
```

This configures the server; the client does not enable or disable handler configuration automatically. The `replicateAfter` setting determines when the handler publishes a new replicable generation.

## Read replication state

```ts
const client = createSolrClient({
  baseUrl: "http://localhost:8983/solr",
  core: "catalog"
});

const version = await client.replication("indexversion");
const details = await client.replication("details");

const files = await client.replication("filelist", version.generation !== undefined
  ? { generation: version.generation }
  : { indexversion: Number(version.indexversion) });
```

The `indexversion` response includes the current `generation` on newer Solr versions. Pass that generation to `filelist`; older Solr versions expose only `indexversion`, which is accepted as the legacy parameter. The client sends exactly the parameter name supplied so it does not confuse an index version timestamp with a generation number.

## Control a follower

```ts
// Solr 10 uses fetchindex/abortfetch. Solr 8 and 9 use the legacy snappull/abort names.
// leaderUrl may be omitted when configured on the follower.
await client.replication("fetchindex", {
  leaderUrl: "http://leader:8983/solr/catalog/replication",
  compression: "internal",
  httpConnTimeout: 5_000,
  httpReadTimeout: 10_000
});

// On Solr 8/9, use "snappull" to trigger a fetch and "abort" to stop it.
// Pause/resume automatic polling or abort an in-progress fetch.
await client.replication("disablepoll");
await client.replication("enablepoll");
await client.replication("abortfetch");
```

`fetchindex` accepts the documented follower connection and compression settings. `leaderUrl` is the fully qualified ReplicationHandler URL, including the `/replication` suffix, on the pinned Solr 8, 9, and 10 lines. The follower's IndexFetcher requests leader details through `qt=/replication`; if the leader's `/select` handler has `handleSelect` disabled, enable it so that request can be routed to the replication handler. For Basic authentication between the follower and its leader, configure the ReplicationHandler's server-side follower settings; do not put credentials into URLs or query parameters.

## Control a leader

```ts
await client.replication("enablereplication");
await client.replication("disablereplication");
```

Replication after indexing is controlled by the leader's ReplicationHandler configuration, notably `replicateAfter` (`commit`, `optimize`, or `startup`). Commit documents through the ordinary Update API:

```ts
await client.add([{ id: "book-1", title: "Solr in practice" }]);
await client.commit({ waitSearcher: true });
```

There is no separate ReplicationHandler `commit` command. The client does not mutate `solrconfig.xml` or configure leader/follower roles.

## Stream a replicated file

The `filecontent` command returns a binary/chunked response rather than JSON. Use `replicationFile()` to receive the raw Fetch `Response`:

```ts
const response = await client.replicationFile({
  directoryType: "file",
  filePath: "segments_1",
  offset: 0,
  checksum: true
});

if (!response.ok) throw new Error(`Replication file request failed: ${response.status}`);
const bytes = await response.arrayBuffer();
```

Supported directory types are `file` (Lucene index files), `cf` (configuration files), and `tlogFile` (transaction log files). Optional parameters include `offset`, `length`, `compression`, `checksum`, `maxWriteMBPerSec`, and `generation`. The raw response preserves streaming and binary content; it is not parsed as JSON.

## Scope and compatibility

- Typed commands: `enablereplication`, `disablereplication`, `indexversion`, `fetchindex`/`abortfetch` (Solr 10), `snappull`/`abort` (Solr 8/9), `enablepoll`, `disablepoll`, `details`, `filelist`, `backup`, `restore`, `restorestatus`, and `deletebackup`.
- `filecontent` is exposed separately through `replicationFile()` because it returns a raw stream.
- Core-level `backup`, `restore`, `restorestatus`, and `deletebackup` are exposed through `replication()`; see [backup and restore docs](backup-restore.md).
- The client currently exposes the V1 handler path. Solr 10.1 also documents V2 equivalents for selected file and index-version operations; no dedicated V2 wrapper is provided.
- The handler may not be configured for user-managed leader/follower replication on every core. The server must have the appropriate ReplicationHandler configuration before control commands can be used.

- A regular standalone/security integration test creates disposable leader and follower cores, commits a unique leader document, triggers `snappull` on Solr 8/9 or `fetchindex` on Solr 10 with the fully qualified leader handler URL, and verifies that the document becomes searchable on the follower. Treat this behavior as pending runtime verification until the pinned Solr 8.11.4, 9.11.0, and 10.1.0 CI jobs pass. The test does not cover polling or abort of an in-progress transfer.
- `abort` (Solr 8/9) and `abortfetch` (Solr 10), plus `enablepoll`/`disablepoll`, have request-serialization unit coverage; cancellation of a live transfer remains unverified. The disposable-core fixture unloads both cores in its `finally` cleanup. If a CI job is cancelled or the fetch does not settle, the ephemeral Solr container is discarded rather than reusing the cores.

See the [Solr 8.11](https://solr.apache.org/__root/docs.solr.apache.org/guide/8_11/deployment-guide/user-managed-index-replication.html), [Solr 9.11](https://solr.apache.org/guide/solr/9_11/deployment-guide/user-managed-index-replication.html), and [Solr 10.1](https://solr.apache.org/guide/solr/10_1/deployment-guide/user-managed-index-replication.html) guides for server configuration and command semantics.
