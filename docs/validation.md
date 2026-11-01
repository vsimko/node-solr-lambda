# Runtime validation

Validation is disabled by default. Zod is an optional peer dependency. The client does not import Zod from its runtime modules, and a normal package install does not need Zod. Install Zod only when your application uses Zod schemas. The default request path does not call a schema parser.

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
  validation: { inputs: { query: querySchema }, outputs: { query: responseSchema }, onError: "throw" }
});
```

Use `inputs` to validate request data. Use `outputs` to validate response data. The operation key is the client method name. The keys match the client method names. They include `query`, `queryJson`, `add`, `update`, `delete`, `commit`, `softCommit`, `optimize`, `rollback`, `ping`, `schema`, `config`, `coreAdmin`, `collections`, `systemInfo`, `metrics`, `security`, `stream`, and `export`. The raw `export()` response is not output-validated. A failed check throws `SolrValidationError`. Set `onError: "ignore"` to return the original value after a failed check.

The application owns the schemas. This design keeps Zod out of the client's default runtime path.

## Validation behavior

- If validation is not configured, the client does not call a schema parser.
- If no schema exists for an operation and direction, the value passes through unchanged.
- The client awaits `safeParseAsync()`. Async refinements are supported.
- A schema rejection throws `SolrValidationError` with the operation and issue list.
- If a schema parser itself throws, the client throws `SolrValidationError` with the original exception in `cause`. The issue list is empty because the parser did not return a validation result.
- `onError: "ignore"` returns the original value after a normal schema rejection. It does not suppress exceptions thrown by the schema parser.

Use the `cause` property to diagnose schema implementation errors. Use `issues` to display input or output validation messages.


## Verify an install without Zod

The CI workflow builds the package, packs it, installs it into a clean temporary consumer without Zod, and imports the public client. This checks that the default package entry point does not require Zod at runtime.

