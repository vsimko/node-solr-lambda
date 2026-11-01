# Core and collection administration

Create a client without a core name to use global administration endpoints.

Use `coreAdmin()` to send a Core Admin action.

```ts
const admin = createSolrClient({ baseUrl: "http://localhost:8983" });
const status = await admin.coreAdmin("STATUS", { core: "catalog" });
```

Use `collections()` to send a SolrCloud Collections API action.

```ts
const result = await admin.collections("LIST");
```

Use `systemInfo()` to read system information. Use `metrics()` to read metrics. Use `security()` to read or update authentication and authorization settings.

```ts
const system = await admin.systemInfo();
const metrics = await admin.metrics({ group: "jvm" });
```

Check the API coverage matrix for endpoint-specific models and version tests. The action parameter is typed. Some action parameters still use a general key-value map.
