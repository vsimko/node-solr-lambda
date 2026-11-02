# Getting started

Use Node.js 20, 22, or 24. The client targets Solr 8.x, 9.x, and 10.x. Integration evidence is operation-specific and is recorded in the [API coverage matrix](api-coverage.md) and [compatibility policy](compatibility.md); do not infer support for every Solr endpoint from the target version range.

Install the package:

```sh
npm install node-solr-lambda
```

Create a client. Set the Solr base URL and exactly one core or collection name.

```ts
import { createSolrClient } from "node-solr-lambda";

const solr = createSolrClient({
  baseUrl: "http://localhost:8983",
  core: "catalog"
});

const result = await solr.query({ query: "*:*", limit: 10 });
console.log(result);
```

The client does not create a core or collection. Create it on the Solr server before sending requests.

## ESM, CommonJS, and TypeScript

The package provides separate ESM and CommonJS runtime exports. Node.js selects the matching entry point.

ESM:

```js
import { createSolrClient } from "node-solr-lambda";
const solr = createSolrClient({ collection: "catalog" });
```

CommonJS:

```js
const { createSolrClient } = require("node-solr-lambda");
const solr = createSolrClient({ collection: "catalog" });
```

TypeScript consumers use conditional declarations for the selected module system. The package also keeps a top-level `types` entry for TypeScript tooling that does not use NodeNext package conditions.

## Runtime validation

Validation is disabled by default. Zod is an optional peer dependency; install it only when using application-defined input/output schemas:

```sh
npm install zod
```

See [runtime validation](validation.md) for configuration and examples.

## Next steps

- [Client configuration](configuration.md)
- [Query API](query.md)
- [Update API](update.md)
- [API coverage](api-coverage.md)
- [Solr compatibility](compatibility.md)
- [Migration from v3 to v4](migration-v3-to-v4.md)

