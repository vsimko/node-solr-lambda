# Client configuration

Pass a configuration object to `createSolrClient`.

| Option | Default | Description |
| --- | --- | --- |
| `baseUrl` | `http://localhost:8983` | Solr base URL. |
| `core` | none | Core name for core-scoped requests. |
| `collection` | none | Collection name for collection-scoped requests. |
| `timeoutMs` | `30000` | Request timeout in milliseconds. |
| `headers` | none | Extra HTTP headers. |
| `username` | none | Basic authentication user name. |
| `password` | empty | Basic authentication password. |
| `fetch` | global fetch | Custom Fetch API implementation. |
| `validation` | disabled | Optional input and output schemas. |

Use HTTPS when you send credentials over a network. Do not store passwords in source files.
