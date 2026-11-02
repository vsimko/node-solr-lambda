import { createSolrClient, type SolrExportFieldType, type SolrExportParams, type SolrExportSort } from "../src/index.js";

const client = createSolrClient({ core: "catalog" });
const supportedFieldType: SolrExportFieldType = "date";
const sort: SolrExportSort = [
  { field: "price_d", direction: "asc" },
  { field: "id", direction: "desc" }
];
const params: SolrExportParams = {
  q: "*:*",
  fq: ["active:true", "tenant:one"],
  fl: ["id", "price_d", "created_at_dt"],
  sort,
  batchSize: 1000,
  wt: "json"
};
void client.export(params);
void client.exportStream({ fl: "id,title_s", sort: "id asc" });
void supportedFieldType;

// @ts-expect-error Export requires a field list.
void client.export({ sort: "id asc" });
// @ts-expect-error Export requires a sort expression.
void client.export({ fl: "id" });
// @ts-expect-error Sort direction is restricted.
void client.export({ fl: "id", sort: [{ field: "id", direction: "sideways" }] });
// @ts-expect-error Export response writers are restricted to Solr's supported writers.
void client.export({ fl: "id", sort: "id asc", wt: "csv" });
