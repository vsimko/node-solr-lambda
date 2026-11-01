# node-solr-lambda

A TypeScript client for the Apache Solr JSON API. Version 4 uses the Node.js Fetch API and supports Node.js 20, 22, and 24.

## Install

```sh
npm install node-solr-lambda
```

Zod is optional. Install it only when you need runtime validation:

```sh
npm install zod
```

## Quick start

```ts
import { createSolrClient } from "node-solr-lambda";
const solr = createSolrClient({ baseUrl: "http://localhost:8983", core: "products" });
const result = await solr.query({ query: "category:books", fields: ["id", "title"], limit: 20 });
await solr.add({ id: "book-1", title: "Example" });
await solr.commit();
console.log(result);
```

Validation is disabled by default. See [validation](docs/validation.md).
Read the [API coverage matrix](docs/api-coverage.md) before you depend on an endpoint.

## Development

Use npm with Node.js 20, 22, or 24:

```sh
npm ci
npm run typecheck
npm run test:types
npm test
npm run build
npm run release:check
```

To publish a release, run `npm run release:publish` manually after review. CI and pull request merges do not publish the package.
