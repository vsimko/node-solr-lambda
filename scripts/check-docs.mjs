import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const docsRoot = join(root, "docs");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const inventory = JSON.parse(readFileSync(join(docsRoot, "api-inventory.json"), "utf8"));
const apiReferencePath = join(docsRoot, "api-reference.md");
const apiReference = readFileSync(apiReferencePath, "utf8");

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function parseClassMethods(path, className) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((statement) =>
    ts.isClassDeclaration(statement) && statement.name?.text === className
  );
  assert.ok(declaration, `Could not find class ${className} in ${path}`);
  return declaration.members
    .filter((member) => ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name))
    .filter((member) => !member.modifiers?.some((modifier) =>
      modifier.kind === ts.SyntaxKind.PrivateKeyword || modifier.kind === ts.SyntaxKind.ProtectedKeyword
    ))
    .map((member) => member.name.text);
}

const v2Methods = parseClassMethods(join(root, "src/v2.ts"), "SolrV2Client");
const v2CoreAdminMethods = parseClassMethods(join(root, "src/v2.ts"), "SolrV2CoreAdminClient");
const publicMethods = new Set([
  ...parseClassMethods(join(root, "src/client.ts"), "SolrClient"),
  ...parseClassMethods(join(root, "src/transport.ts"), "SolrTransport"),
  ...v2Methods.map((method) => `v2.${method}`),
  ...v2CoreAdminMethods.map((method) => `v2.coreAdmin.${method}`)
]);
const documentedMethods = new Set(
  [...apiReference.matchAll(/\x60SolrClient\.([A-Za-z_$][\w$]*)\(\)\x60/g)].map((match) => match[1])
);
for (const method of publicMethods) {
  if (method.startsWith("v2.")) continue;
  assert.ok(documentedMethods.has(method), `API reference is missing SolrClient.${method}()`);
}
for (const method of v2Methods) {
  assert.match(apiReference, new RegExp(`SolrV2Client\\.${method}\\(\\)`),
    `API reference is missing SolrV2Client.${method}()`);
}
for (const entry of inventory.entries) {
  const methods = entry.clientMethod.split(/\s*\/\s*/);
  for (const method of methods) {
    assert.ok(publicMethods.has(method), `API inventory method is not public: ${method} (entry ${entry.id})`);
  }
  assert.equal(entry.methodImplemented, true, `API inventory marks ${entry.id} as unimplemented`);
}

assert.match(apiReference, /\x60createSolrClient\x60/);
assert.match(apiReference, /\x60SolrClient\x60/);
assert.ok(packageJson.exports?.["."], "package.json must expose the root entry point");
const rootExport = packageJson.exports["."];
const declarationPaths = [
  packageJson.types,
  rootExport.import?.types,
  rootExport.require?.types
].filter(Boolean);
const runtimePaths = [rootExport.import?.default, rootExport.require?.default].filter(Boolean);
for (const relativePath of [...declarationPaths, ...runtimePaths]) {
  assert.ok(relativePath.startsWith("./"), `Package export must be relative: ${relativePath}`);
  assert.ok(statSync(join(root, relativePath.slice(2)), { throwIfNoEntry: false })?.isFile(),
    `Package export target does not exist after build: ${relativePath}`);
}
assert.ok(declarationPaths.length >= 3, "Expected top-level, ESM, and CommonJS declaration entry points");

const markdownFiles = [join(root, "README.md"), ...walk(docsRoot).filter((path) => extname(path) === ".md")];
const docsIndexPath = join(docsRoot, "index.md");
const docsIndex = readFileSync(docsIndexPath, "utf8");
const indexedDocTargets = new Set(
  [...docsIndex.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim().replace(/^<|>$/g, "").split("#", 2)[0])
    .filter(Boolean)
    .map((target) => resolve(docsRoot, decodeURIComponent(target)))
);
const readme = readFileSync(join(root, "README.md"), "utf8");
for (const match of readme.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
  const rawTarget = match[1].trim().replace(/^<|>$/g, "");
  if (!rawTarget || /^(?:https?:|mailto:|tel:|data:|#)/i.test(rawTarget)) continue;
  const targetPath = rawTarget.split("#", 2)[0];
  const destination = resolve(root, decodeURIComponent(targetPath));
  if (destination.startsWith(docsRoot) && destination !== docsIndexPath) {
    assert.ok(indexedDocTargets.has(destination),
      `README documentation link is missing from docs/index.md: ${rawTarget}`);
  }
}
assert.ok(indexedDocTargets.has(join(docsRoot, "update.md")),
  "docs/index.md must link to the canonical detailed Update API guide");
assert.match(readFileSync(join(docsRoot, "documents.md"), "utf8"), /\]\(update\.md\)/,
  "The concise Document API overview must link to the canonical Update API guide");

let checkedLinks = 0;
let checkedExamples = 0;
for (const markdownPath of markdownFiles) {
  const markdown = readFileSync(markdownPath, "utf8");
  const relativeFile = markdownPath.slice(root.length + 1);
  const headings = new Set(markdown.split("\n")
    .filter((line) => /^#{1,6}\s+/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim().toLowerCase()
      .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")));
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || /^(?:https?:|mailto:|tel:|data:|#)/i.test(rawTarget)) continue;
    const [targetPath, fragment] = rawTarget.split("#", 2);
    const destination = targetPath ? resolve(dirname(markdownPath), decodeURIComponent(targetPath)) : markdownPath;
    assert.ok(destination.startsWith(root), `Link escapes repository in ${relativeFile}: ${rawTarget}`);
    assert.ok(statSync(destination, { throwIfNoEntry: false })?.isFile(),
      `Broken local Markdown link in ${relativeFile}: ${rawTarget}`);
    if (fragment && destination === markdownPath) {
      assert.ok(headings.has(decodeURIComponent(fragment).toLowerCase()),
        `Broken heading link in ${relativeFile}: ${rawTarget}`);
    }
    checkedLinks++;
  }

  const fencePattern = /^\x60{3,}(\w+)?[^\n]*\n([\s\S]*?)^\x60{3,}\s*$/gm;
  let fence;
  while ((fence = fencePattern.exec(markdown))) {
    const language = (fence[1] ?? "").toLowerCase();
    const code = fence[2].trim();
    assert.ok(code.length > 0, `Empty code example in ${relativeFile}`);
    if (["ts", "tsx", "typescript", "js", "jsx", "javascript", "mjs", "cjs"].includes(language)) {
      const scriptKind = language.startsWith("ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;
      const parsed = ts.createSourceFile(relativeFile, code, ts.ScriptTarget.Latest, true, scriptKind);
      assert.equal(parsed.parseDiagnostics.length, 0,
        `Syntax error in ${language} example in ${relativeFile}: ${parsed.parseDiagnostics.map((item) => item.messageText).join("; ")}`);
      checkedExamples++;
    }
  }
}

console.log(`Validated ${publicMethods.size} public client/transport methods, ${inventory.entries.length} API inventory entries, ${checkedLinks} local Markdown links, ${checkedExamples} JavaScript/TypeScript examples, and ${declarationPaths.length + runtimePaths.length} package export targets.`);
