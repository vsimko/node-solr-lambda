import assert from "node:assert/strict";
import { integrationTest } from "./fixtures.js";
import { solrGeoDistance } from "../../src/index.js";

integrationTest("geofilt, bbox, and geodist return the expected spatial results", async ({
  client,
  createId,
  addSchemaFieldType,
  addSchemaField,
  addDocuments,
  commit
}) => {
  const fieldType = createId("spatial_type");
  const field = createId("spatial_location");
  await addSchemaFieldType({ name: fieldType, class: "solr.LatLonPointSpatialField" });
  await addSchemaField(field, fieldType);

  const centerId = createId("spatial_center");
  const nearId = createId("spatial_near");
  const farId = createId("spatial_far");
  const center = "45.15,-93.85";

  await addDocuments([
    { id: centerId, [field]: center },
    { id: nearId, [field]: "45.16,-93.85" },
    { id: farId, [field]: "46.0,-93.85" }
  ]);
  await commit();

  const spatialIds = async (parser: "geofilt" | "bbox") => {
    const result = await client.query<{ response?: { docs?: Array<{ id: string }> } }>({
      query: "*:*",
      spatial: { parser, field, point: center, distance: 5 },
      fields: ["id"],
      sort: "id asc",
      limit: 10
    });
    return result.response?.docs?.map(document => document.id) ?? [];
  };

  const expectedNearby = [centerId, nearId].sort();
  assert.deepEqual(await spatialIds("geofilt"), expectedNearby);
  assert.deepEqual(await spatialIds("bbox"), expectedNearby);

  const distanceExpression = solrGeoDistance(field, 45.15, -93.85);
  const sorted = await client.query<{ response?: { docs?: Array<{ id: string }> } }>({
    query: "*:*",
    fields: ["id"],
    sort: `${distanceExpression} asc`,
    limit: 10
  });
  assert.deepEqual(
    sorted.response?.docs?.map(document => document.id),
    [centerId, nearId, farId]
  );
});
