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
