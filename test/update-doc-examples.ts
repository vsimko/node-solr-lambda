/**
 * Compile-only fixtures for the public examples in docs/update.md.
 * Included by test/tsconfig.json and checked by npm run test:types.
 */
import type {
  SolrAtomicUpdateDocument,
  SolrClient,
  SolrCommitOptions,
  SolrDeleteOptions,
  SolrJsonUpdateCommands,
  SolrOptimizeOptions,
  SolrSoftCommitOptions,
  SolrUpdateOptions,
  SolrUpdateResponse
} from "../src/index.js";

interface Product {
  id: string;
  title: string;
  price: number;
  tags: string[];
}

interface ProductWithSku extends Product {
  sku: string;
}

export function compileUpdateDocumentationExamples(client: SolrClient): void {
  const updateOptions: SolrUpdateOptions = {
    overwrite: true,
    commitWithin: 5_000,
    route: "tenant-a"
  };
  void client.add({ id: "book-1", title: "Solr in Action" }, updateOptions);
  void client.update(
    [{ id: "book-2", title: "Lucene Guide" }],
    { overwrite: false, route: "tenant-b" }
  );

  const commands: SolrJsonUpdateCommands = {
    add: {
      doc: { id: "book-4", title: "Command document" },
      overwrite: true,
      commitWithin: 5_000
    },
    delete: { query: "status:expired" },
    commit: { waitSearcher: true }
  };
  void client.updateCommands(commands);

  const atomic: SolrAtomicUpdateDocument<Product> = {
    id: "book-1",
    title: { set: "Revised title" },
    price: { inc: 2.5 },
    tags: { "add-distinct": "featured" }
  };
  void client.atomicUpdate<Product>(atomic);

  const customKey: SolrAtomicUpdateDocument<ProductWithSku, "sku"> = {
    sku: "SKU-1",
    title: { set: "Updated by custom key" }
  };
  void client.atomicUpdate<ProductWithSku, "sku">(customKey);

  const deleteOptions: SolrDeleteOptions = { route: "tenant-a", commitWithin: 1_000 };
  void client.delete("book-1", deleteOptions);
  void client.delete({ query: "status:expired" }, { route: "tenant-b" });

  const commitOptions: SolrCommitOptions = {
    waitSearcher: true,
    openSearcher: true,
    expungeDeletes: true
  };
  const softCommitOptions: SolrSoftCommitOptions = { waitSearcher: true, openSearcher: false };
  const optimizeOptions: SolrOptimizeOptions = { maxSegments: 2, waitSearcher: true };
  void client.commit(commitOptions);
  void client.softCommit(softCommitOptions);
  void client.optimize(optimizeOptions);
  void client.rollback();

  const addResponse: Promise<SolrUpdateResponse> = client.add({ id: "typed-response" });
  const deleteResponse: Promise<SolrUpdateResponse> = client.delete("typed-response");
  void [addResponse, deleteResponse];

  // @ts-expect-error expungeDeletes is a hard-commit-only option.
  void client.softCommit({ expungeDeletes: true });
  // @ts-expect-error maxSegments belongs to optimize(), not commit().
  void client.commit({ maxSegments: 2 });
  // @ts-expect-error Numeric increments are restricted to numeric document fields.
  void client.atomicUpdate<Product>({ id: "book-1", title: { inc: 1 } });
  // @ts-expect-error Unknown JSON update commands are rejected.
  void client.updateCommands({ replace: { id: "book-1" } });
  // @ts-expect-error route is a string, not a number.
  void client.add({ id: "book-1" }, { route: 42 });
}
