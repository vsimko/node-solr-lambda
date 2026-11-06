import { readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const allowedSeverities = new Set(["error", "warning"]);
const allowedChecks = new Set(["file-exists", "json-contract", "site-data"]);
const allowedStatuses = new Set(["available", "stale", "unavailable"]);
const allowedPriorities = new Set(["P0", "P1", "P2", "P3"]);
const allowedIssueStates = new Set(["open", "closed"]);
const allowedReleaseStates = new Set(["published", "draft", "unreleased"]);

function diagnostic(rule, path, message) {
  return { id: rule.id, severity: rule.severity, path, message };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
    if (!allowedSeverities.has(rule.severity)) errors.push(diagnostic(rule, path, "Severity must be error or warning."));
    if (typeof rule.enabled !== "boolean") errors.push(diagnostic(rule, path, "enabled must be a boolean."));
    if (!allowedChecks.has(rule.check)) errors.push(diagnostic(rule, path, "Unsupported check type."));
    if (rule.check === "file-exists" && !safeRepositoryPath(rule.path)) {
      errors.push(diagnostic(rule, path, "Rule path must be a repository-relative path that stays inside the repository."));
    }
    if (rule.check === "json-contract" && (!safeRepositoryPath(rule.path) || typeof rule.schemaVersion !== "number")) {
      errors.push(diagnostic(rule, path, "json-contract requires a safe path and numeric schemaVersion."));
    }
    if (rule.check === "site-data" && (typeof rule.dataPath !== "string" || !safeRepositoryPath(rule.dataPath))) {
      errors.push(diagnostic(rule, path, "site-data requires a dataPath."));
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
      typeof data.package.version !== "string" || typeof data.package.repository !== "string") {
    errors.push({ id: "site-data-package", severity: "error", path: "package", message: "Package identity, version, and repository are required." });
  }
  if (!Array.isArray(data.sources)) errors.push({ id: "site-data-sources", severity: "error", path: "sources", message: "sources must be an array." });
  const sourceIds = new Set();
  for (const [index, source] of (Array.isArray(data.sources) ? data.sources : []).entries()) {
    const path = `sources[${index}]`;
    if (!isRecord(source) || typeof source.id !== "string" || !source.id ||
        !["repository", "github", "npm", "apache"].includes(source.kind) ||
        typeof source.url !== "string" || typeof source.retrievedAt !== "string" ||
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
    const seen = new Set();
    for (const [index, record] of domain.records.entries()) {
      const recordPath = `${domainName}.records[${index}]`;
      if (!isRecord(record) || typeof record.id !== "string" || !record.id) {
        errors.push({ id: `record-id-${domainName}`, severity: "error", path: recordPath, message: "Each record requires a non-empty id." });
        continue;
      }
      if (seen.has(record.id)) errors.push({ id: `record-unique-${domainName}`, severity: "error", path: recordPath, message: `Duplicate record id: ${record.id}.` });
      seen.add(record.id);
      validateDomainRecord(domainName, record, recordPath, errors);
    }
  }
  for (const [domainName, domain] of Object.entries(data)) {
    if (["upstreamSolr", "typescriptApi", "ciHistory"].includes(domainName) && domain !== undefined) {
      if (!isRecord(domain) || !allowedStatuses.has(domain.status) || !Array.isArray(domain.sourceIds) || !Array.isArray(domain.records)) {
        errors.push({ id: `optional-domain-${domainName}`, severity: "error", path: domainName, message: "Optional P2 domain must use the standard domain envelope." });
      } else {
        for (const sourceId of domain.sourceIds) if (!sourceIds.has(sourceId)) errors.push({ id: `optional-source-${domainName}`, severity: "error", path: domainName, message: `Unknown source reference: ${sourceId}.` });
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
    if (!["implemented", "partial", "unsupported", "unknown"].includes(record.status)) errors.push({ id: "api-coverage-status", severity: "error", path, message: "Unsupported API coverage status." });
    if (!Array.isArray(record.versions) || record.versions.some((v) => !["8", "9", "10"].includes(String(v)))) errors.push({ id: "api-coverage-versions", severity: "error", path, message: "versions must contain supported Solr major keys 8, 9, or 10." });
    if (!Array.isArray(record.evidence) || record.evidence.length === 0) errors.push({ id: "api-coverage-evidence", severity: "error", path, message: "API claims require at least one evidence reference." });
  } else if (domain === "ci") {
    for (const field of ["runUrl", "commit", "ref"]) requireString(field);
    for (const field of ["startedAt", "completedAt"]) validDate(field);
    if (!["queued", "in_progress", "completed"].includes(record.status)) errors.push({ id: "ci-status", severity: "error", path, message: "CI status must describe an observed run state." });
    if (record.status === "completed" && !["success", "failure", "cancelled", "timed_out", "action_required", "neutral", "skipped"].includes(record.conclusion)) errors.push({ id: "ci-conclusion", severity: "error", path, message: "Completed CI runs require a recognized conclusion." });
    if (record.matrixConfigured === true && record.observed === false && record.conclusion === "success") errors.push({ id: "ci-configured-not-observed", severity: "error", path, message: "Configured matrix dimensions cannot be represented as observed successes." });
  } else if (domain === "roadmap") {
    requireString("url");
    if (!Number.isInteger(record.number) || record.number < 1) errors.push({ id: "roadmap-number", severity: "error", path, message: "Roadmap item requires a positive GitHub issue/PR number." });
    if (!allowedPriorities.has(record.priority)) errors.push({ id: "roadmap-priority", severity: "error", path, message: "Unsupported roadmap priority." });
    if (!allowedIssueStates.has(record.state) && !["merged", "missing"].includes(record.state)) errors.push({ id: "roadmap-state", severity: "error", path, message: "Roadmap state must be open, closed, merged, or missing." });
  } else if (domain === "npm") {
    requireString("packageName"); requireString("version"); requireString("window"); requireString("sourceUrl");
    if (!Number.isFinite(record.downloads) || record.downloads < 0) errors.push({ id: "npm-downloads", severity: "error", path, message: "Downloads must be a non-negative observed number." });
    validDate("retrievedAt");
  } else if (domain === "releases") {
    requireString("tag"); requireString("version"); requireString("url");
    const state = record.draft ? "draft" : record.publishedAt ? "published" : "unreleased";
    if (!allowedReleaseStates.has(state)) errors.push({ id: "release-state", severity: "error", path, message: "Release state is invalid." });
    if (state === "published" && !record.changelogUrl) errors.push({ id: "release-changelog", severity: "error", path, message: "Published releases require a changelog reference." });
    if (state !== "published" && record.displayAsPublished === true) errors.push({ id: "release-unpublished-visible", severity: "error", path, message: "Draft or unreleased entries must not be presented as published." });
  } else if (domain === "documentation") {
    requireString("path"); requireString("url"); requireString("owner");
    if (!["generated", "authored"].includes(record.owner)) errors.push({ id: "docs-owner", severity: "error", path, message: "Documentation owner must be generated or authored." });
    if (record.owner === "generated") requireString("sourcePath");
  }
}

function runRules(rules, dataPath) {
  const errors = [];
  for (const rule of rules.rules) {
    if (!rule.enabled) continue;
    if (rule.check === "file-exists") {
      const target = resolve(root, rule.path);
      if (!statSync(target, { throwIfNoEntry: false })?.isFile()) errors.push(diagnostic(rule, rule.path, "Required repository file does not exist."));
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
