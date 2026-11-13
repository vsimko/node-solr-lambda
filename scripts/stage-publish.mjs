import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { npmDistTagForVersion } from "./release-policy.mjs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tag = npmDistTagForVersion(manifest.version);

// Stage-only publishing keeps the final 2FA approval with a human maintainer.
// npm generates provenance automatically for supported GitHub Actions OIDC publishing.
execFileSync("npm", ["stage", "publish", "--access", "public", "--tag", tag], {
  stdio: "inherit",
});
