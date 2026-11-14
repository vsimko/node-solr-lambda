import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = resolve(root, ".agents/skills");
const linkPattern = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
const frontmatterPattern = /^---\s*\n([\s\S]*?)\n---\s*\n/;

function fail(message) {
  throw new Error(message);
}

function localTargets(markdown, sourcePath) {
  const targets = [];
  for (const match of markdown.matchAll(linkPattern)) {
    const raw = match[1].trim().replace(/^<|>$/g, "");
    if (!raw || /^(?:https?:|mailto:|tel:|data:|#)/i.test(raw)) continue;
    const path = decodeURIComponent(raw.split("#", 1)[0]);
    if (!path) continue;
    targets.push(resolve(dirname(sourcePath), path));
  }
  return targets;
}

assert.ok(existsSync(skillsRoot) && statSync(skillsRoot).isDirectory(),
  "Missing .agents/skills directory");

const skillFiles = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(skillsRoot, entry.name, "SKILL.md"))
  .filter((path) => existsSync(path))
  .sort();

assert.ok(skillFiles.length > 0, "No .agents/skills/*/SKILL.md files found");

for (const skillPath of skillFiles) {
  const markdown = readFileSync(skillPath, "utf8");
  const relativePath = relative(root, skillPath);
  const match = markdown.match(frontmatterPattern);
  assert.ok(match, `${relativePath}: YAML frontmatter is required`);

  const fields = new Map();
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-z][a-z0-9_-]*):\s*(.*?)\s*$/);
    if (field) fields.set(field[1], field[2].replace(/^["']|["']$/g, ""));
  }

  const expectedName = relative(dirname(skillPath), root).split(/[\\/]/).at(-1);
  assert.equal(fields.get("name"), expectedName,
    `${relativePath}: frontmatter name must match directory ${expectedName}`);
  assert.ok(fields.get("description"), `${relativePath}: description is required`);
  assert.match(expectedName, /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    `${relativePath}: skill directory must use kebab-case`);

  for (const target of localTargets(markdown, skillPath)) {
    assert.ok(target.startsWith(root), `${relativePath}: local link escapes repository: ${target}`);
    assert.ok(existsSync(target), `${relativePath}: broken local link: ${relative(root, target)}`);
  }
}

for (const sourcePath of [resolve(skillsRoot, "README.md"), resolve(root, "AGENTS.md")]) {
  assert.ok(existsSync(sourcePath), `${relative(root, sourcePath)} is required`);
  const markdown = readFileSync(sourcePath, "utf8");
  const discovered = new Set(localTargets(markdown, sourcePath));
  for (const skillPath of skillFiles) {
    assert.ok(discovered.has(skillPath),
      `${relative(root, sourcePath)} must link to ${relative(root, skillPath)}`);
  }
}

console.log(`Validated ${skillFiles.length} Agent Skills: metadata, local links, and discovery indexes.`);
