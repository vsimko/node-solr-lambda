import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { SolrClient } from "../../src/index.js";

const baseUrl = process.env.SOLR_BASE_URL;
const core = process.env.SOLR_CORE;

test("Solr supports basic add, commit, query, and delete operations", {
  skip: !baseUrl || !core
}, async () => {
  const client = new SolrClient({ baseUrl: baseUrl!, core: core!, timeoutMs: 30_000 });
  const id = `integration_${randomUUID().replaceAll("-", "")}`;

  try {
    await client.add({ id });
    await client.commit({ waitSearcher: true });

    const result = await client.query<{ response?: { docs?: Array<{ id: string }> } }>({
      query: `id:${id}`,
      fields: ["id"],
      limit: 10
    });

    assert.deepEqual(result.response?.docs?.map(document => document.id), [id]);
  } finally {
    await client.delete({ id });
    await client.commit({ waitSearcher: true });
  }
});
