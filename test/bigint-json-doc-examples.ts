import type { SolrClientConfig, SolrJsonCodec } from "../src/index.js";

interface VersionedSolrDocument {
  id: string;
  _version_: bigint;
}

declare function parseLosslessJson(text: string): unknown;
declare function stringifyLosslessJson(value: unknown): string;

const jsonCodec: SolrJsonCodec = {
  parse: parseLosslessJson,
  stringify: stringifyLosslessJson
};

const config = {
  baseUrl: "http://localhost:8983",
  core: "catalog",
  jsonCodec
} satisfies SolrClientConfig;

declare const document: VersionedSolrDocument;
const exactVersion: bigint = document._version_;

void config;
void exactVersion;
