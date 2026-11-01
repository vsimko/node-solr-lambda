# node-solr-lambda

A TypeScript client for the Apache Solr JSON API. The active development line uses the Node.js Fetch API and supports Node.js 20, 22, and 24.

The public API is designed to make Solr options discoverable through TypeScript IntelliSense. Typed parameters and nested option models are being expanded incrementally; until a Solr feature has a dedicated type, use the explicit custom-parameter escape hatch where available. See the [roadmap](docs/roadmap.md) and [autocomplete-first API issue](https://github.com/vsimko/node-solr-lambda/issues/121).

## Install

```sh
npm install node-solr-lambda
```

Runtime validation is disabled by default. Zod is an optional peer dependency and is not needed for a normal installation. Install it only when your application uses Zod schemas:

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
  limit: 20,
  offset: 0,
  params: {
    // Custom Solr parameters not yet represented by a dedicated option.
    "q.op": "AND"
  }
});

console.log(result.response.docs);
```

The common query properties are typed. The `params` property is the explicit escape hatch for additional Solr parameters; it preserves flexibility without making arbitrary top-level properties part of the standard query interface.

## Documentation

- [Getting started](docs/getting-started.md)
- [Query API](docs/query.md)
- [API coverage](docs/api-coverage.md)
- [Client architecture](docs/architecture.md)
- [Solr compatibility](docs/compatibility.md)
- [Runtime validation](docs/validation.md)
- [Roadmap](docs/roadmap.md)

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

Work on a short-lived branch created from `master`. Every change must be linked to a GitHub issue, submitted as a pull request targeting `master`, and merged only after review and successful CI. There is one active development line; do not create a permanent version-specific branch.

To publish a release, run `npm run release:publish` manually after review. CI and pull request merges do not publish the package.
