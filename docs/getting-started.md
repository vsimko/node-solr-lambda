# Getting started

Use Node.js 26 (Active LTS), 24 or 22 (Maintenance LTS). Node.js 20 reached EOL on 2026-04-30 and is not supported by v4. The current Solr baselines are 10.1.0 (primary), 9.11.0 (compatibility), and 8.11.4 (legacy only because Solr 8.x is upstream EOL). Integration evidence is operation-specific; see the [API coverage matrix](api-coverage.md) and [compatibility policy](compatibility.md). Do not infer support for every patch release or endpoint.

Install the package:

```sh
npm install solr-ts-client
```

Create a client. Set the Solr base URL and exactly one core or collection name.

```ts
import { createSolrClient } from "solr-ts-client";

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
import { createSolrClient } from "solr-ts-client";
const solr = createSolrClient({ collection: "catalog" });
```

CommonJS:

```js
const { createSolrClient } = require("solr-ts-client");
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

