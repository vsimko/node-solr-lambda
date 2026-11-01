# Getting started

Use Node.js 20, 22, or 24. The target Solr server lines are 8.x, 9.x, and 10.x. Real-server compatibility is not yet verified. Check the [API coverage matrix](api-coverage.md) and [compatibility policy](compatibility.md) before you depend on an endpoint.

Install the package:

```sh
npm install node-solr-lambda
```

Create a client. Set the Solr base URL and the core or collection name.

```ts
import { createSolrClient } from "node-solr-lambda";

const solr = createSolrClient({
  baseUrl: "http://localhost:8983",
  core: "catalog"
});

const result = await solr.query({ query: "*:*", limit: 10 });
console.log(result);
```

Common query properties are typed. The type model is being expanded so that supported Solr parameters and nested options are discoverable through IDE autocomplete. Use the explicit `params` property for additional parameters that do not yet have a dedicated public type. See the [development roadmap](roadmap.md).

The client does not create a core or collection. Create it before you send a request.

## Local development

Install the exact dependency tree from the lockfile and run the checks:

```sh
npm ci
npm run typecheck
npm run test:types
npm test
npm run build
```
