#!/usr/bin/env node
/**
 * Read-only identity availability experiment for "solr-ts-client".
 * No package is published, no repository/domain is reserved, and no account is modified.
 */
const NAME = "solr-ts-client";
const USER = "vsimko";
const TIMEOUT_MS = 15000;

async function request(url, headers = {}) {
  const response = await fetch(url, {
    headers: { "user-agent": "solr-ts-client-name-check/1.0", accept: "application/json", ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });
  return response;
}

async function probe(label, url, classify) {
  try {
    const response = await request(url);
    const body = await response.text();
    return { label, url, httpStatus: response.status, ...classify(response, body) };
  } catch (error) {
    return { label, url, status: "unknown", error: String(error) };
  }
}

function npmCandidates(name) {
  const parts = name.split("-");
  const separators = ["-", ".", "_"];
  const candidates = new Set([name, parts.join(""), parts.join(".") , parts.join("_")]);
  for (const a of separators) for (const b of separators) {
    candidates.add(`${parts[0]}${a}${parts[1]}${b}${parts[2]}`);
  }
  return [...candidates];
}

const results = {
  checkedAt: new Date().toISOString(),
  candidate: NAME,
  safety: "Read-only checks only; no publish/create/reserve operations.",
  npm: [],
  github: [],
  domains: [],
  trademarks: {
    status: "manual-review-required",
    reason: "DPMAconnect trademark search requires registered DPMAconnect credentials; EUIPO API requires an API subscription/token. This experiment does not claim trademark clearance.",
    dpmaRegisterSearch: "https://register.dpma.de/DPMAregister/marke/basis",
    euipoSearch: "https://www.euipo.europa.eu/en/search-ip",
    tmviewSearch: "https://www.tmdn.org/tmview/",
    terms: [NAME, "solr ts client", "solrts", "SolrTS"],
    classesToReview: ["9", "42"],
  },
};

for (const candidate of npmCandidates(NAME)) {
  results.npm.push(await probe(candidate, `https://registry.npmjs.org/${encodeURIComponent(candidate)}`, (res, body) => {
    if (res.status === 200) {
      let metadata = {};
      try { metadata = JSON.parse(body); } catch {}
      return { status: "taken", packageName: metadata.name ?? candidate, latestVersion: metadata["dist-tags"]?.latest ?? null };
    }
    if (res.status === 404) return { status: "not-found-in-registry" };
    return { status: "unknown", detail: body.slice(0, 200) };
  }));
}

for (const [label, url] of [
  ["owner-repository", `https://api.github.com/repos/${USER}/${NAME}`],
  ["global-exact-repository-search", `https://api.github.com/search/repositories?q=${encodeURIComponent(`repo:${USER}/${NAME}`)}`],
  ["global-name-search", `https://api.github.com/search/repositories?q=${encodeURIComponent(`in:name ${NAME}`)}&per_page=100`],
]) {
  results.github.push(await probe(label, url, (res, body) => {
    let data = {};
    try { data = JSON.parse(body); } catch {}
    if (label === "owner-repository") {
      if (res.status === 200) return { status: "exists", fullName: data.full_name, private: data.private };
      if (res.status === 404) return { status: "not-found-publicly" };
    }
    if (res.status === 200) return { status: "search-completed", totalCount: data.total_count ?? null, matches: (data.items ?? []).slice(0, 20).map(x => x.full_name) };
    return { status: "unknown", detail: data.message ?? body.slice(0, 200) };
  }));
}

for (const domain of [`${NAME}.com`, `${NAME}.dev`, `${NAME}.io`]) {
  results.domains.push(await probe(domain, `https://rdap.org/domain/${domain}`, (res, body) => {
    if (res.status === 200) {
      let data = {};
      try { data = JSON.parse(body); } catch {}
      return { status: "registered", ldhName: data.ldhName ?? domain, events: data.events ?? [] };
    }
    if (res.status === 404) return { status: "not-found-in-rdap-check", caveat: "Confirm with the domain registry/registrar before treating as available." };
    return { status: "unknown", detail: body.slice(0, 200) };
  }));
}

console.log(JSON.stringify(results, null, 2));
