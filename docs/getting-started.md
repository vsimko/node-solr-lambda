# Getting started

Use Node.js 20, 22, or 24. Use Apache Solr 8.x, 9.x, or 10.x.

Install the package:

```sh
npm install node-solr-lambda
```

Create a client. Set the Solr base URL and the core or collection name.

```ts
import { createSolrClient } from "node-solr-lambda";
const solr = createSolrClient({ baseUrl: "http://localhost:8983", core: "catalog" });
const result = await solr.query({ query: "*:*", limit: 10 });
console.log(result);
```

The client does not create a core or collection. Create it before you send a request.
