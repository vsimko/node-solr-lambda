import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = process.cwd();
const output = resolve(root, "dist-site");
rmSync(output, { recursive: true, force: true });
cpSync(resolve(root, "website"), output, { recursive: true });
mkdirSync(resolve(output, "data"), { recursive: true });
writeFileSync(resolve(output, "data/site-data.json"), readFileSync(resolve(root, "build/site-data.json")));
console.log("Static website assembled in dist-site/.");
