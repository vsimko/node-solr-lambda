import { readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const allowedSeverities = new Set(["error", "warning"]);
const allowedChecks = new Set(["file-exists", "json-contract", "site-data", "local-links", "text-contains"]);
const allowedStatuses = new Set(["available", "stale", "unavailable"]);
const allowedPriorities = new Set(["P0", "P1", "P2", "P3"]);
const allowedIssueStates = new Set(["open", "in-progress", "closed", "unknown"]);
const allowedReleaseStates = new Set(["published", "draft", "unreleased"]);
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function diagnostic(rule, path, message) {
  return { id: rule.id, severity: rule.severity, path, message };
}

function ruleDefinitionError(rule, path, message) {
  return { id: typeof rule.id === "string" ? rule.id : "rules", severity: "error", path, message };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isHttpUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function safeRepositoryPath(path) {
  if (typeof path !== "string" || path.length === 0 || isAbsolute(path)) return false;
  const resolved = resolve(root, path);
  return resolved === root || resolved.startsWith(root + "/");
}

function validateRules(rules) {
  const errors = [];
  if (!isRecord(rules) || rules.version !== 1 || !Array.isArray(rules.rules)) {
    return [{ id: "rules", severity: "error", path: "scripts/site/rules.json", message: "Expected rule inventory version 1 with a rules array." }];
  }
  const ids = new Set();
  for (const rule of rules.rules) {
    const path = isRecord(rule) && typeof rule.path === "string" ? rule.path : "scripts/site/rules.json";
    if (!isRecord(rule)) {
      errors.push({ id: "rules", severity: "error", path, message: "Each rule must be an object." });
      continue;
    }
    if (typeof rule.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(rule.id)) {
      errors.push({ id: "rules", severity: "error", path, message: "Rule id must be a lowercase kebab-case identifier." });
    } else if (ids.has(rule.id)) {
      errors.push({ id: rule.id, severity: "error", path, message: "Rule id is duplicated." });
    } else {
      ids.add(rule.id);
    }
    if (!allowedSeverities.has(rule.severity)) errors.push(ruleDefinitionError(rule, path, "Severity must be error or warning."));
    if (typeof rule.enabled !== "boolean") errors.push(ruleDefinitionError(rule, path, "enabled must be a boolean."));
    if (!allowedChecks.has(rule.check)) errors.push(ruleDefinitionError(rule, path, "Unsupported check type."));
    if (rule.check === "file-exists" && !safeRepositoryPath(rule.path)) {
      errors.push(ruleDefinitionError(rule, path, "Rule path must be a repository-relative path that stays inside the repository."));
    }
    if (rule.check === "json-contract" && (!safeRepositoryPath(rule.path) || typeof rule.schemaVersion !== "number")) {
      errors.push(ruleDefinitionError(rule, path, "json-contract requires a safe path and numeric schemaVersion."));
    }
    if (rule.check === "site-data" && (typeof rule.dataPath !== "string" || !safeRepositoryPath(rule.dataPath))) {
      errors.push(ruleDefinitionError(rule, path, "site-data requires a dataPath."));
    }
    if (["local-links", "text-contains"].includes(rule.check) && !safeRepositoryPath(rule.path)) {
      errors.push(ruleDefinitionError(rule, path, "This check requires a safe repository-relative file path."));
    }
    if (rule.check === "text-contains" && (typeof rule.text !== "string" || rule.text.length === 0)) {
      errors.push(ruleDefinitionError(rule, path, "text-contains requires a non-empty text value."));
    }
  }
  return errors;
}

function validateSiteData(data, rules) {
  const errors = [];
  if (!isRecord(data)) return [{ id: "site-data-shape", severity: "error", path: "site-data", message: "Site data must be a JSON object." }];
  if (data.schemaVersion !== 1) errors.push({ id: "site-data-version", severity: "error", path: "schemaVersion", message: "Expected site-data schemaVersion 1." });
  if (typeof data.generatedAt !== "string" || !Number.isFinite(Date.parse(data.generatedAt))) {
    errors.push({ id: "site-data-generated-at", severity: "error", path: "generatedAt", message: "generatedAt must be a valid ISO date-time." });
  }
  if (!isRecord(data.package) || data.package.name !== "node-solr-lambda" ||
      typeof data.package.version !== "string" || !isHttpUrl(data.package.repository) ||
      typeof data.package.source !== "string" || !data.package.source) {
    errors.push({ id: "site-data-package", severity: "error", path: "package", message: "Package identity, version, repository URL, and source reference are required." });
  }
  if (!Array.isArray(data.sources)) errors.push({ id: "site-data-sources", severity: "error", path: "sources", message: "sources must be an array." });
  const sourceIds = new Set();
  for (const [index, source] of (Array.isArray(data.sources) ? data.sources : []).entries()) {
    const path = `sources[${index}]`;
    if (!isRecord(source) || typeof source.id !== "string" || !source.id ||
        !["repository", "github", "npm", "apache"].includes(source.kind) ||
        !isHttpUrl(source.url) || typeof source.retrievedAt !== "string" ||
        !Number.isFinite(Date.parse(source.retrievedAt)) || !allowedStatuses.has(source.status)) {
      errors.push({ id: "source-record", severity: "error", path, message: "Source requires unique id, allowed kind/status, URL, and valid retrievedAt." });
      continue;
    }
    if (sourceIds.has(source.id)) errors.push({ id: "source-unique-id", severity: "error", path, message: `Duplicate source id: ${source.id}.` });
    sourceIds.add(source.id);
  }
  const requiredDomains = ["apiCoverage", "ci", "roadmap", "npm", "releases", "documentation"];
  for (const domainName of requiredDomains) {
    const domain = data[domainName];
    const path = domainName;
    if (!isRecord(domain) || !allowedStatuses.has(domain.status) ||
        !Array.isArray(domain.sourceIds) || !Array.isArray(domain.records)) {
      errors.push({ id: `domain-${domainName}`, severity: "error", path, message: "Domain requires an allowed status, sourceIds array, and records array." });
      continue;
    }
    for (const sourceId of domain.sourceIds) {
      if (!sourceIds.has(sourceId)) errors.push({ id: `domain-source-${domainName}`, severity: "error", path, message: `Unknown source reference: ${sourceId}.` });
    }
    if (domain.status === "unavailable" && domain.records.length > 0) {
      errors.push({ id: `domain-unavailable-${domainName}`, severity: "error", path, message: "Unavailable domains must not expose records." });
    }
    if (domain.status === "available" && domain.records.length === 0) {
      errors.push({ id: `domain-empty-${domainName}`, severity: "warning", path, message: "An available domain with no records must be explicitly reviewed; do not use it to represent an unavailable feed." });
    }
    if (domainName === "ci" && domain.configuredMatrix !== undefined) {
      if (!Array.isArray(domain.configuredMatrix)) {
        errors.push({ id: "ci-configured-matrix", severity: "error", path, message: "configuredMatrix must be an array separate from observed run records." });
      } else {
        for (const [index, matrix] of domain.configuredMatrix.entries()) {
          const matrixPath = `ci.configuredMatrix[${index}]`;
          if (!isRecord(matrix) || typeof matrix.dimension !== "string" || !matrix.dimension ||
              !Array.isArray(matrix.values) || matrix.values.length === 0 ||
              typeof matrix.sourcePath !== "string" || !safeRepositoryPath(matrix.sourcePath) ||
              !statSync(resolve(root, matrix.sourcePath), { throwIfNoEntry: false })?.isFile()) {
            errors.push({ id: "ci-configured-matrix-entry", severity: "error", path: matrixPath, message: "Configured matrix entries require a dimension, non-empty values, and an existing repository sourcePath." });
          }
        }
      }
    }
    if (domainName === "releases" && domain.unreleased !== undefined) {
      const item = domain.unreleased;
      if (!isRecord(item) || typeof item.sourceId !== "string" || !sourceIds.has(item.sourceId) ||
          typeof item.path !== "string" || !safeRepositoryPath(item.path) ||
          !statSync(resolve(root, item.path), { throwIfNoEntry: false })?.isFile() ||
          typeof item.url !== "string" || !isHttpUrl(item.url) || typeof item.content !== "string") {
        errors.push({ id: "release-unreleased-changelog", severity: "error", path: "releases.unreleased", message: "Unreleased changelog requires a known source, existing repository path, HTTP(S) URL, and content." });
      }
    }
    const seen = new Set();
    const operationIds = new Set();
    for (const [index, record] of domain.records.entries()) {
      const recordPath = `${domainName}.records[${index}]`;
      if (!isRecord(record) || typeof record.id !== "string" || !record.id) {
        errors.push({ id: `record-id-${domainName}`, severity: "error", path: recordPath, message: "Each record requires a non-empty id." });
        continue;
      }
      if (seen.has(record.id)) errors.push({ id: `record-unique-${domainName}`, severity: "error", path: recordPath, message: `Duplicate record id: ${record.id}.` });
      seen.add(record.id);
      if (domainName === "apiCoverage" && typeof record.operationId === "string") {
        if (operationIds.has(record.operationId)) errors.push({ id: "api-coverage-operation-unique", severity: "error", path: recordPath, message: "API operation IDs must be unique." });
        operationIds.add(record.operationId);
      }
      validateDomainRecord(domainName, record, recordPath, errors);
    }
  }
  for (const [domainName, domain] of Object.entries(data)) {
    if (["upstreamSolr", "typescriptApi", "ciHistory"].includes(domainName) && domain !== undefined) {
      if (!isRecord(domain) || !allowedStatuses.has(domain.status) || !Array.isArray(domain.sourceIds) || !Array.isArray(domain.records)) {
        errors.push({ id: `optional-domain-${domainName}`, severity: "error", path: domainName, message: "Optional P2 domain must use the standard domain envelope." });
      } else {
        if (domain.status === "unavailable" && domain.records.length > 0) errors.push({ id: `optional-unavailable-${domainName}`, severity: "error", path: domainName, message: "Unavailable optional domains must not expose records." });
        if (domain.status === "available" && domain.records.length === 0) errors.push({ id: `optional-empty-${domainName}`, severity: "warning", path: domainName, message: "An available optional domain with no records must be reviewed." });
        if (new Set(domain.sourceIds).size !== domain.sourceIds.length) errors.push({ id: `optional-source-unique-${domainName}`, severity: "error", path: domainName, message: "Optional domain sourceIds must be unique." });
        for (const sourceId of domain.sourceIds) if (!sourceIds.has(sourceId)) errors.push({ id: `optional-source-${domainName}`, severity: "error", path: domainName, message: `Unknown source reference: ${sourceId}.` });
        const seen = new Set();
        for (const [index, record] of domain.records.entries()) {
          const path = `${domainName}.records[${index}]`;
          if (!isRecord(record) || typeof record.id !== "string" || !record.id || seen.has(record.id)) {
            errors.push({ id: `optional-record-id-${domainName}`, severity: "error", path, message: "Each optional record requires a unique non-empty id." });
            continue;
          }
          seen.add(record.id);
          if (domainName === "upstreamSolr") {
            if (typeof record.version !== "string" || !/^\d+\.\d+(?:\.\d+)?$/.test(record.version)) errors.push({ id: "solr-release-version", severity: "error", path, message: "Solr release requires a numeric version." });
            if (typeof record.releaseDate !== "string" || !Number.isFinite(Date.parse(record.releaseDate))) errors.push({ id: "solr-release-date", severity: "error", path, message: "Solr release requires a valid release date." });
            if (typeof record.sourceUrl !== "string" || !/^https:\/\/(?:solr\.apache\.org|archive\.apache\.org|downloads\.apache\.org)\//.test(record.sourceUrl)) errors.push({ id: "solr-release-source", severity: "error", path, message: "Solr release source must use an official Apache Solr/Apache archive host." });
          } else if (domainName === "typescriptApi") {
            for (const field of ["path", "sourcePath", "exportName"]) if (typeof record[field] !== "string" || !record[field]) errors.push({ id: `typescript-api-${field}`, severity: "error", path, message: `${field} is required for generated API provenance.` });
            if (record.visibility !== "public" && record.visibility !== "internal") errors.push({ id: "typescript-api-visibility", severity: "error", path, message: "API declaration visibility must be public or internal." });
            if (record.visibility === "internal" && record.includedInPublicReference === true) errors.push({ id: "typescript-api-private-export", severity: "error", path, message: "Internal declarations must not appear in the public API reference." });
          } else if (domainName === "ciHistory") {
            if (typeof record.runId !== "string" || !record.runId) errors.push({ id: "ci-history-run-id", severity: "error", path, message: "Historical CI record requires a run ID." });
            if (!Number.isFinite(record.durationSeconds) || record.durationSeconds < 0) errors.push({ id: "ci-history-duration", severity: "error", path, message: "CI duration must be a non-negative number of seconds." });
            if (typeof record.url !== "string" || !/^https:\\/\\/github\\.com\\//.test(record.url)) errors.push({ id: "ci-history-url", severity: "error", path, message: "Historical CI record requires a GitHub run URL." });
            if (typeof record.completedAt !== "string" || !Number.isFinite(Date.parse(record.completedAt))) errors.push({ id: "ci-history-date", severity: "error", path, message: "Historical CI record requires a valid completion timestamp." });
          }
        }
      }
    }
  }
  return errors;
}

function validateDomainRecord(domain, record, path, errors) {
  const requireString = (field) => {
    if (typeof record[field] !== "string" || record[field].length === 0) {
      errors.push({ id: `record-${domain}-${field}`, severity: "error", path, message: `${field} must be a non-empty string.` });
    }
  };
  const validDate = (field) => {
    if (typeof record[field] !== "string" || !Number.isFinite(Date.parse(record[field]))) {
      errors.push({ id: `record-${domain}-${field}`, severity: "error", path, message: `${field} must be a valid date-time.` });
    }
  };
  if (domain === "apiCoverage") {
    requireString("operationId");
    if (!["verified", "partial", "unverified", "unsupported", "unknown"].includes(record.status)) errors.push({ id: "api-coverage-status", severity: "error", path, message: "Unsupported API coverage status." });
    if (!Array.isArray(record.versions) || record.versions.some((v) => !["8", "9", "10"].includes(String(v))) || new Set(record.versions.map(String)).size !== record.versions.length) errors.push({ id: "api-coverage-versions", severity: "error", path, message: "versions must contain unique supported Solr major keys 8, 9, or 10." });
    if (!["complete", "partial", "generic-by-design"].includes(record.typeCoverage)) errors.push({ id: "api-coverage-type", severity: "error", path, message: "Unsupported API type-coverage state." });
    if (record.unitTests !== "present") errors.push({ id: "api-coverage-unit-tests", severity: "error", path, message: "unitTests must describe observed test presence." });
    if (!["tested", "partial", "not-run"].includes(record.integrationTests)) errors.push({ id: "api-coverage-integration-tests", severity: "error", path, message: "Unsupported integration-test state." });
    if (record.documentation && (!safeRepositoryPath(record.documentation) || !statSync(resolve(root, record.documentation), { throwIfNoEntry: false })?.isFile())) errors.push({ id: "api-coverage-documentation", severity: "error", path, message: "API documentation reference must resolve to an existing repository file." });
    if (record.testFiles !== undefined && (!Array.isArray(record.testFiles) || record.testFiles.some((testPath) => !safeRepositoryPath(testPath) || !statSync(resolve(root, testPath), { throwIfNoEntry: false })?.isFile()))) errors.push({ id: "api-coverage-tests", severity: "error", path, message: "API test references must resolve to existing repository files." });
    if (!isRecord(record.evidence) || !Array.isArray(record.evidence.sourceIds) ||
        record.evidence.sourceIds.length === 0 || typeof record.evidence.description !== "string" ||
        record.evidence.description.length === 0) {
      errors.push({ id: "api-coverage-evidence", severity: "error", path, message: "API claims require evidence sourceIds and a non-empty description." });
    } else {
      for (const sourceId of record.evidence.sourceIds) {
        if (!sourceIds.has(sourceId)) errors.push({ id: "api-coverage-evidence-source", severity: "error", path, message: `Unknown evidence source reference: ${sourceId}.` });
      }
      if (record.evidence.path && (!safeRepositoryPath(record.evidence.path) ||
          !statSync(resolve(root, record.evidence.path), { throwIfNoEntry: false })?.isFile())) {
        errors.push({ id: "api-coverage-evidence-path", severity: "error", path, message: "Evidence path must resolve to an existing repository file." });
      }
      if (record.evidence.url && !isHttpUrl(record.evidence.url)) {
        errors.push({ id: "api-coverage-evidence-url", severity: "error", path, message: "Evidence URL must be an HTTP(S) URL." });
      }
    }
  } else if (domain === "ci") {
    for (const field of ["runId", "workflow", "event", "runUrl", "commit", "ref"]) requireString(field);
    if (!isHttpUrl(record.runUrl)) errors.push({ id: "ci-run-url", severity: "error", path, message: "CI runUrl must be an HTTP(S) URL." });
    validDate("startedAt");
    if (record.status === "completed") validDate("completedAt");
    if (!["queued", "in_progress", "completed"].includes(record.status)) errors.push({ id: "ci-status", severity: "error", path, message: "CI status must describe an observed run state." });
    if (record.status === "completed" && !["success", "failure", "cancelled", "timed_out", "action_required", "neutral", "skipped", "stale", "startup_failure"].includes(record.conclusion)) errors.push({ id: "ci-conclusion", severity: "error", path, message: "Completed CI runs require a recognized conclusion." });
    if (record.matrixConfigured === true && record.observed === false && record.conclusion === "success") errors.push({ id: "ci-configured-not-observed", severity: "error", path, message: "Configured matrix dimensions cannot be represented as observed successes." });
  } else if (domain === "roadmap") {
    requireString("url");
    if (typeof record.url !== "string" || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/(?:issues|pull)\/\d+$/.test(record.url)) errors.push({ id: "roadmap-url", severity: "error", path, message: "Roadmap URL must identify a GitHub issue or pull request." });
    if (!Number.isInteger(record.number) || record.number < 1) errors.push({ id: "roadmap-number", severity: "error", path, message: "Roadmap item requires a positive GitHub issue/PR number." });
    if (!allowedPriorities.has(record.priority)) errors.push({ id: "roadmap-priority", severity: "error", path, message: "Unsupported roadmap priority." });
    if (!allowedIssueStates.has(record.state) && !["merged", "missing"].includes(record.state)) errors.push({ id: "roadmap-state", severity: "error", path, message: "Roadmap state must be open, closed, merged, or missing." });
  } else if (domain === "npm") {
    requireString("packageName"); requireString("version"); requireString("window"); requireString("sourceUrl");
    validDate("windowStart"); validDate("windowEnd");
    if (typeof record.windowStart === "string" && typeof record.windowEnd === "string" && Date.parse(record.windowStart) > Date.parse(record.windowEnd)) errors.push({ id: "npm-window-range", severity: "error", path, message: "Download window start must not be after its end." });
    if (typeof record.version !== "string" || !semverPattern.test(record.version)) errors.push({ id: "npm-version", severity: "error", path, message: "npm version must be valid semver." });
    if (!isHttpUrl(record.sourceUrl)) errors.push({ id: "npm-source-url", severity: "error", path, message: "npm sourceUrl must be an HTTP(S) URL." });
    if (!Number.isFinite(record.downloads) || record.downloads < 0) errors.push({ id: "npm-downloads", severity: "error", path, message: "Downloads must be a non-negative observed number." });
    validDate("retrievedAt");
  } else if (domain === "releases") {
    requireString("tag"); requireString("version"); requireString("url");
    if (typeof record.version !== "string" || !semverPattern.test(record.version)) errors.push({ id: "release-version", severity: "error", path, message: "Release version must be valid semver." });
    if (record.version && record.tag !== record.version && record.tag !== `v${record.version}`) errors.push({ id: "release-tag-version", severity: "error", path, message: "Release tag must match its version, optionally prefixed with v." });
    const state = record.draft ? "draft" : record.publishedAt ? "published" : "unreleased";
    if (!allowedReleaseStates.has(state)) errors.push({ id: "release-state", severity: "error", path, message: "Release state is invalid." });
    if (state === "published" && !record.changelogUrl) errors.push({ id: "release-changelog", severity: "error", path, message: "Published releases require a changelog reference." });
    if (state !== "published" && record.displayAsPublished === true) errors.push({ id: "release-unpublished-visible", severity: "error", path, message: "Draft or unreleased entries must not be presented as published." });
  } else if (domain === "documentation") {
    requireString("path"); requireString("url"); requireString("owner");
    if (!safeRepositoryPath(record.path) || !statSync(resolve(root, record.path), { throwIfNoEntry: false })?.isFile()) errors.push({ id: "docs-path", severity: "error", path, message: "Documentation path must resolve to an existing repository file." });
    if (!isHttpUrl(record.url)) errors.push({ id: "docs-url", severity: "error", path, message: "Documentation URL must be an HTTP(S) URL." });
    if (!["generated", "authored"].includes(record.owner)) errors.push({ id: "docs-owner", severity: "error", path, message: "Documentation owner must be generated or authored." });
    if (record.owner === "generated") {
      requireString("sourcePath");
      if (record.sourcePath && (!safeRepositoryPath(record.sourcePath) || !statSync(resolve(root, record.sourcePath), { throwIfNoEntry: false })?.isFile())) errors.push({ id: "docs-source-path", severity: "error", path, message: "Generated documentation sourcePath must resolve to an existing repository file." });
    }
  }
}

function runRules(rules, dataPath) {
  const errors = [];
  for (const rule of rules.rules) {
    if (!rule.enabled) continue;
    if (rule.check === "file-exists") {
      const target = resolve(root, rule.path);
      if (!statSync(target, { throwIfNoEntry: false })?.isFile()) errors.push(diagnostic(rule, rule.path, "Required repository file does not exist."));
    } else if (rule.check === "text-contains") {
      try {
        const content = readFileSync(resolve(root, rule.path), "utf8");
        if (!content.includes(rule.text)) errors.push(diagnostic(rule, rule.path, "Required text was not found: " + rule.text));
      } catch (error) {
        errors.push(diagnostic(rule, rule.path, "Cannot read file for text check: " + error.message));
      }
    } else if (rule.check === "local-links") {
      try {
        const filePath = resolve(root, rule.path);
        const content = readFileSync(filePath, "utf8");
        const targets = [
          ...[...content.matchAll(/!?\\[[^\\]]*\\]\\(([^)\\s]+)(?:\\s+[^)]*)?\\)/g)].map((match) => match[1]),
          ...[...content.matchAll(/\\b(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1])
        ];
        for (const target of targets) {
          if (/^(?:[a-z][a-z0-9+.-]*:|#|\\/\\/)/i.test(target)) continue;
          const localTarget = target.split(/[?#]/, 1)[0];
          if (!localTarget) continue;
          const resolved = resolve(dirname(filePath), localTarget);
          if (resolved !== root && !resolved.startsWith(root + "/")) {
            errors.push(diagnostic(rule, rule.path, "Local link escapes the repository: " + target));
            continue;
          }
          const stat = statSync(resolved, { throwIfNoEntry: false });
          if (!stat?.isFile() && !stat?.isDirectory()) errors.push(diagnostic(rule, rule.path, "Local link target does not exist: " + target));
        }
      } catch (error) {
        errors.push(diagnostic(rule, rule.path, "Cannot read file for local-link check: " + error.message));
      }
    } else if (rule.check === "json-contract") {
      try {
        const parsed = readJson(resolve(root, rule.path));
        if (parsed.$schema !== "https://json-schema.org/draft/2020-12/schema" || parsed.properties?.schemaVersion?.const !== rule.schemaVersion) {
          errors.push(diagnostic(rule, rule.path, "JSON contract schema/version does not match the configured rule."));
        }
      } catch (error) {
        errors.push(diagnostic(rule, rule.path, `Cannot read JSON contract: ${error.message}`));
      }
    } else if (rule.check === "site-data" && dataPath) {
      try {
        const data = readJson(dataPath);
        errors.push(...validateSiteData(data, rules));
      } catch (error) {
        errors.push(diagnostic(rule, dataPath, `Cannot read site data: ${error.message}`));
      }
    }
  }
  return errors;
}

function parseArgs(args) {
  const result = { rules: resolve(root, "scripts/site/rules.json"), data: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--rules" && args[i + 1]) result.rules = resolve(root, args[++i]);
    else if (args[i] === "--data" && args[i + 1]) result.data = resolve(root, args[++i]);
    else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  return result;
}

export { validateRules, validateSiteData };

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const options = parseArgs(process.argv.slice(2));
  const rules = readJson(options.rules);
  const ruleErrors = validateRules(rules);
  const diagnostics = [...ruleErrors, ...runRules(rules, options.data)];
  diagnostics.sort((a, b) => a.id.localeCompare(b.id) || a.path.localeCompare(b.path) || a.message.localeCompare(b.message));
  for (const item of diagnostics) {
    console.log(`[${item.severity.toUpperCase()}] ${item.id} ${item.path}: ${item.message}`);
  }
  const failures = diagnostics.filter((item) => item.severity === "error");
  console.log(`Site data validation: ${failures.length} error(s), ${diagnostics.length - failures.length} warning(s).`);
  if (failures.length) process.exitCode = 1;
}
