import assert from "node:assert/strict";
import { SolrClient, type SolrQueryResponse, type SolrSpellcheckCollation, type SolrSpellcheckTermResult } from "../../src/index.js";
import { query as executeQuery } from "../../src/apis/query.js";
import { integrationTest } from "./fixtures.js";

integrationTest("SpellCheck returns indexed suggestions, frequencies, and a collation on the configured default handler", async ({
  createCore,
  createId
}) => {
  const core = await createCore("spellcheck");
  const baseUrl = process.env.SOLR_BASE_URL!;
  const username = process.env.SOLR_USERNAME;
  const password = process.env.SOLR_PASSWORD;
  const client = new SolrClient({
    baseUrl,
    core,
    timeoutMs: 30_000,
    ...(username && password ? { auth: { type: "basic" as const, username, password } } : {})
  });

  await client.add([
    { id: createId("spellcheck"), _text_: "solr client search" },
    { id: createId("spellcheck"), _text_: "solr client integration" },
    { id: createId("spellcheck"), _text_: "client libraries for solr" }
  ]);
  await client.commit({ waitSearcher: true });

  const path = `${baseUrl.replace(/\/+$/, "")}/${core}/spell`;
  const response = await executeQuery<SolrQueryResponse<{ id: string }>>(client, path, {
    query: "*:*",
    limit: 10,
    spellcheck: {
      enabled: true,
      query: "solr clent",
      count: 5,
      extendedResults: true,
      collate: true,
      collateExtendedResults: true,
      maxCollations: 3,
      maxCollationTries: 10,
      dictionary: "default"
    },
    params: { "json.nl": "map" }
  });

  const spellcheck = response.spellcheck;
  assert.ok(spellcheck);
  assert.equal(spellcheck.correctlySpelled, false);

  const rawSuggestions = spellcheck.suggestions;
  assert.ok(rawSuggestions);
  let termValue: unknown;
  if (Array.isArray(rawSuggestions)) {
    const termIndex = rawSuggestions.indexOf("clent");
    termValue = termIndex >= 0 ? rawSuggestions[termIndex + 1] : undefined;
  } else {
    termValue = (rawSuggestions as Readonly<Record<string, unknown>>)["clent"];
  }
  assert.ok(termValue && typeof termValue === "object" && "suggestion" in termValue);
  const term = termValue as SolrSpellcheckTermResult;
  assert.equal(term.origFreq, 0);
  const alternatives = term.suggestion ?? [];
  const clientSuggestion = alternatives.find(alternative =>
    typeof alternative === "string"
      ? alternative === "client"
      : Array.isArray(alternative)
        ? alternative[0] === "client"
        : (alternative as { word: string }).word === "client"
  );
  assert.ok(clientSuggestion, "expected 'client' among spelling alternatives");
  assert.ok(
    alternatives.some(alternative =>
      Array.isArray(alternative)
        ? Number.isFinite(alternative[1])
        : typeof alternative === "object" && Number.isFinite((alternative as { freq?: number; frequency?: number }).freq ?? (alternative as { frequency?: number }).frequency)
    ),
    "extended results should include an alternative frequency"
  );

  const rawCollations = spellcheck.collations ??
    (Array.isArray(rawSuggestions)
      ? (() => {
          const index = rawSuggestions.indexOf("collation");
          return index >= 0 ? [rawSuggestions[index], rawSuggestions[index + 1]] : undefined;
        })()
      : (rawSuggestions as Readonly<Record<string, unknown>>)["collation"]);
  let collationValue: unknown;
  if (Array.isArray(rawCollations)) {
    const collationIndex = rawCollations.indexOf("collation");
    collationValue = collationIndex >= 0 ? rawCollations[collationIndex + 1] : undefined;
  } else if (rawCollations && typeof rawCollations === "object" && "collation" in rawCollations) {
    collationValue = rawCollations["collation"];
  } else {
    collationValue = rawCollations;
  }
  const collationText = typeof collationValue === "string"
    ? collationValue
    : collationValue && typeof collationValue === "object"
      ? (collationValue as SolrSpellcheckCollation).collationQuery
      : undefined;
  assert.ok(collationText?.includes("client"), "expected a corrected query collation");
}, 60_000);
