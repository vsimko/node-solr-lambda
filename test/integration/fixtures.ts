import test from "node:test";
import { randomUUID } from "node:crypto";
import { SolrClient } from "../../src/index.js";

const baseUrl = process.env.SOLR_BASE_URL;
const core = process.env.SOLR_CORE;

export interface SolrIntegrationFixture {
  client: SolrClient;
  createId(prefix?: string): string;
  addDocuments(documents: readonly { id: string }[]): Promise<void>;
  commit(): Promise<void>;
}

/**
 * Run an integration test with a dedicated client and deterministic document cleanup.
 * Tests are skipped when the Solr integration endpoint is not configured.
 */
export function integrationTest(
  name: string,
  run: (fixture: SolrIntegrationFixture) => Promise<void>
): void {
  test(name, { skip: !baseUrl || !core }, async () => {
    const client = new SolrClient({ baseUrl: baseUrl!, core: core!, timeoutMs: 30_000 });
    const documentIds = new Set<string>();

    const fixture: SolrIntegrationFixture = {
      client,
      createId(prefix = "integration") {
        return `${prefix}_${randomUUID().replaceAll("-", "")}`;
      },
      async addDocuments(documents) {
        for (const document of documents) documentIds.add(document.id);
        await client.add(documents);
      },
      async commit() {
        await client.commit({ waitSearcher: true });
      }
    };

    try {
      await run(fixture);
    } finally {
      const cleanupResults = await Promise.allSettled(
        [...documentIds].map(id => client.delete({ id }))
      );

      if (documentIds.size > 0) {
        try {
          await client.commit({ waitSearcher: true });
        } catch (error) {
          cleanupResults.push({ status: "rejected", reason: error });
        }
      }

      const cleanupErrors = cleanupResults
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map(result => result.reason);

      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, "Failed to clean up Solr integration documents");
      }
    }
  });
}
