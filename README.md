# node-solr-lambda

A modern Apache Solr client for JavaScript and TypeScript on Node.js, with TypeScript-first contracts and a first-class JavaScript experience. Version 4 replaces the v3 Axios-based functional API with a Fetch-based client, discoverable request models, and a shared transport for query, update, administration, and raw requests.

- **Node.js:** 22, 24, and 26 (active LTS); Node 20 is retained only as a legacy v4 compatibility target.
- **Solr:** 10.x current, 9.11.x previous maintenance, and 8.11.4 legacy compatibility only; compatibility is recorded per operation in the [compatibility matrix](docs/compatibility.md)
- **Modules:** ESM and CommonJS
- **Runtime dependencies:** none; [Zod](https://zod.dev/) is an optional peer dependency for runtime validation

## Install

```sh
npm install node-solr-lambda
```

Runtime validation is disabled by default. Install Zod only if your application uses Zod schemas:

```sh
npm install zod
```

## Quick start

```ts
import { createSolrClient } from "node-solr-lambda";

interface Book {
  id: string;
  title: string;
  category: string;
}

const solr = createSolrClient({
  baseUrl: "http://localhost:8983",
  core: "books"
});

const result = await solr.query<{ response: { numFound: number; docs: Book[] } }>({
  query: "category:fiction",
  fields: ["id", "title", "category"],
  sort: "title asc",
  limit: 20
});

console.log(result.response.docs);

await solr.add({ id: "book-1", title: "Solr in Action", category: "fiction" });
await solr.commit({ waitSearcher: true });
```

Create the target core or collection on the Solr server before using the client. Set exactly one of `core` or `collection` in the client configuration for core- or collection-scoped methods.

## Client configuration

```ts
import { createSolrClient } from "node-solr-lambda";

const solr = createSolrClient({
  baseUrl: "https://solr.example.com/solr",
  collection: "catalog",
  auth: {
    type: "bearer",
    token: process.env.SOLR_TOKEN!
  },
  timeoutMs: 15_000,
  retry: {
    maxAttempts: 3,
    methods: ["GET"]
  }
});
```

The transport supports Basic or Bearer authentication, custom headers and Fetch implementations, request defaults, optional retries, per-request timeouts, and `AbortSignal` cancellation. Use HTTPS when credentials or sensitive data cross a network. Do not put credentials in URLs or log authorization headers, tokens, or unredacted server error bodies.

## API overview

The public client exposes typed methods for the main Solr API families:

- **Query:** `query()` and `queryJson()`, including typed parser options, filters, facets, highlighting, grouping, stats, cursor pagination, and response models.
- **Documents:** `add()`, backpressure-aware `addStream()` for `AsyncIterable` sources, `update()`, `atomicUpdate()`, `updateCommands()`, `delete()`, `commit()`, `softCommit()`, `optimize()`, and `rollback()`.
- **Schema and Config:** `schema()` and `config()` with typed command models.
- **Administration:** `coreAdmin()`, `collections()`, `ping()`, `security()`, `systemInfo()`, and `metrics()`.
- **Replication and backups:** `replication()`, `replicationFile()`, and the SolrCloud backup/restore actions exposed through `collections()`.
- **Streaming:** `stream()`, `export()`, and `exportStream()`.
- **Advanced/custom endpoints:** `request()` and `requestRaw()` use the shared transport. Raw requests are an escape hatch, not a claim that every Solr handler has a dedicated type or has been integration-tested.

Supported options are represented by named TypeScript interfaces and discriminated unions. Custom query parameters use `params`; administrative models provide `customParams` where appropriate. Prefer a typed method when one exists.

## Errors and validation

HTTP failures throw `SolrHttpError`; network failures, timeouts, caller cancellation, and validation failures use `SolrNetworkError`, `SolrTimeoutError`, `SolrAbortError`, and `SolrValidationError`. See [error handling](docs/errors.md).

Runtime input/output validation is opt-in and uses an application-supplied schema interface. Zod is supported as an optional peer dependency; it is not imported by the default runtime path. See [runtime validation](docs/validation.md).

## Solr compatibility

The project targets Solr 8.x, 9.x, and 10.x and runs integration jobs against pinned images Solr 8.11.4, 9.11.0, and 10.1.0. Evidence is operation-specific: a tested query or admin action does not certify every option or every handler on that Solr major. Unverified and excluded behavior is called out in the [compatibility matrix](docs/compatibility.md) and [endpoint inventory](docs/endpoint-inventory.md).

## Product direction\n\nThe primary goal is to build the best Apache Solr client in the world for JavaScript, TypeScript, and Node.js, with measurable leadership in API coverage, correctness, compatibility, testing, performance, and developer experience. See the [north-star strategy and roadmap](docs/roadmap.md#north-star-objective-best-in-class-solr-client) and tracking issue [#311](https://github.com/vsimko/node-solr-lambda/issues/310).\n\n## Documentation

- [Complete documentation index](docs/index.md)
- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Query API](docs/query.md)
- [Update and document API](docs/update.md)
- [Schema API](docs/schema.md)
- [Config API](docs/config.md)
- [Core Admin and Collections](docs/administration.md)
- [Replication API](docs/replication.md)
- [Backup and restore](docs/backup-restore.md)
- [Streaming Expressions](docs/streaming.md)
- [Export API](docs/export.md)
- [Raw requests](docs/raw-requests.md)
- [Error handling](docs/errors.md)
- [Runtime validation](docs/validation.md)
- [Public API reference](docs/api-reference.md)
- [API coverage](docs/api-coverage.md)
- [Collections action coverage](docs/collections-api-coverage.md)
- [Solr endpoint inventory](docs/endpoint-inventory.md)
- [Machine-readable API inventory](docs/api-inventory.json)
- [Public API review](docs/public-api-review.md)
- [Solr compatibility](docs/compatibility.md)
- [Migration from v3 to v4](docs/migration-v3-to-v4.md)
- [Client architecture](docs/architecture.md)
- [Development roadmap](docs/roadmap.md)
- [v4.0.0 release notes (draft)](docs/release-notes-v4.0.0.md)

## Development

Use npm and a supported Node.js version:

```sh
npm ci
npm run typecheck
npm run test:types
npm test
npm run build
npm run release:check
```

Create a short-lived branch from `master`, link changes to a GitHub issue, and open a pull request targeting `master`. CI validates Node.js 20/22/24/26 and the configured Solr integration matrix; Node 20 is legacy-only because upstream EOL has passed. Pull-request merges do not publish the package; releases are published manually after review.

## Release process

Package versioning, prerelease dist-tags, packed-tarball verification, publication, and rollback guidance are documented in [docs/release-process.md](docs/release-process.md).