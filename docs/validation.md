# Runtime validation

Validation is disabled by default. The client does not import Zod. The default request path does not call a schema parser.

Install Zod when you need validation:

```sh
npm install zod
```

Pass Zod schemas to the client:

```ts
import { z } from "zod";
import { createSolrClient } from "node-solr-lambda";
const querySchema = z.object({ q: z.string().min(1) });
const responseSchema = z.object({ response: z.object({ numFound: z.number() }) });
const solr = createSolrClient({
  core: "catalog",
  validation: { inputs: { GET: querySchema }, outputs: { GET: responseSchema }, onError: "throw" }
});
```

Use `inputs` to validate request data. Use `outputs` to validate response data. The operation key is the HTTP method. A failed check throws `SolrValidationError`. Set `onError: "ignore"` to return the original value after a failed check.

The application owns the schemas. This design keeps Zod out of the client's default runtime path.
