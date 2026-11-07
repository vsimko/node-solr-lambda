export function summarizeProgress(apiRecords = [], roadmapRecords = []) {
  const implemented = apiRecords.filter((item) => item.implementation === "implemented").length;
  const typed = apiRecords.filter((item) => item.typeCoverage === "complete").length;
  const verified = apiRecords.filter((item) => item.status === "verified").length;
  const done = roadmapRecords.filter((item) => item.state === "closed" || item.state === "merged").length;
  return [
    { id: "implemented", label: "API operations implemented", value: implemented, total: apiRecords.length, detail: "Public operations present in the client" },
    { id: "typed", label: "Complete TypeScript contracts", value: typed, total: apiRecords.length, detail: "Operations with complete type coverage" },
    { id: "verified", label: "Runtime verified", value: verified, total: apiRecords.length, detail: "Verified on every pinned Solr version listed" },
    { id: "roadmap", label: "Roadmap work completed", value: done, total: roadmapRecords.length, detail: "Closed issues and merged pull requests" }
  ];
}
