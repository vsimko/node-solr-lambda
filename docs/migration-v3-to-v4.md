# Migration from v3 to v4

Version 4 is a TypeScript redesign. It uses the Node.js Fetch API. It does not use Axios.

Create a client with `createSolrClient()`. Set the core or collection in the configuration.

Use `query()` for query requests. Use `add()` and `delete()` for document updates. Use `commit()` and `rollback()` for update control. Use `schema()` for Schema API commands. Use `config()` for Config API commands.

Version 4 is not API-compatible with v3. Review each request and response model before migration. Do not upgrade a production application without integration tests.
