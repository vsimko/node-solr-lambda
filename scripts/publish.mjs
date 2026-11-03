import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { npmDistTagForVersion } from "./release-policy.mjs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tag = npmDistTagForVersion(manifest.version);
const args = ["publish", "--access", "public", "--tag", tag];
if (process.argv.includes("--provenance")) args.push("--provenance");
if (process.argv.includes("--dry-run")) args.push("--dry-run");

// Publication is intentionally an explicit command; prereleases never move the latest tag.
// Pass --provenance only from a supported OIDC publishing workflow.
execFileSync("npm", args, { stdio: "inherit" });
