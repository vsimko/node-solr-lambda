# Migration to Solr TS Client

This guide covers the package-identity change from `node-solr-lambda` to `solr-ts-client`. It is separate from the v3-to-v4 API migration described in [Migration from v3 to v4](migration-v3-to-v4.md).

## What changes

- New package name: `solr-ts-client`
- New import specifier: `solr-ts-client`
- Project display name: **Solr TS Client**
- Intended canonical repository: [github.com/vsimko/solr-ts-client](https://github.com/vsimko/solr-ts-client)

The package identity change does not itself change the v4 client API. Existing v4 code should need only the package installation and import-specifier changes below. If you are also upgrading from v3 to v4, follow the separate v3-to-v4 guide for API and runtime changes.

## Update the dependency

Replace the dependency in your project:

```sh
npm uninstall node-solr-lambda
npm install solr-ts-client
```

If your project uses a package manifest or lockfile managed by another package manager, update the dependency there using the equivalent commands and commit the regenerated lockfile.

## Update imports

Replace imports from the old package name:

```ts
import { createSolrClient } from "node-solr-lambda";
```

with:

```ts
import { createSolrClient } from "solr-ts-client";
```

For CommonJS:

```js
const { createSolrClient } = require("solr-ts-client");
```

No API renaming is implied by this package-name change. Keep your existing v4 client configuration and method calls unless you are independently performing the v3-to-v4 migration.

## Verify the application

After updating the dependency and imports:

1. Remove stale installed dependencies and perform a clean install.
2. Run your TypeScript compiler and application tests.
3. Verify ESM or CommonJS loading according to your application.
4. Run an integration test against the Solr versions and deployment topology you operate.
5. Review deployment manifests, Docker build contexts, workspace manifests, and CI caches for references to the old package name.

## Legacy package

The existing npm package `node-solr-lambda` is retained as a separate legacy package. It is not being unpublished or transferred. Once the new package is publicly available and verified, the legacy package is intended to receive an npm deprecation notice directing users here and to `solr-ts-client`.

Do not infer that the legacy package will receive new releases, API compatibility work, or security backports. Do not deprecate or publish either package as part of following this guide; those are maintainer-controlled release actions.

## Rollback

If the new package is not available or the migration cannot be completed, keep the existing dependency and imports unchanged. Do not remove the legacy package. Report the issue to the project maintainers before retrying the migration.
