import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";

const root = resolve(process.cwd(), "dist-site");
if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error("dist-site/ does not exist. Run npm run build:site first.");
}
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
const server = createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const requested = resolve(root, "." + pathname);
    if (requested !== root && !requested.startsWith(root + "/")) {
      response.writeHead(403).end("Forbidden"); return;
    }
    const file = statSync(requested, { throwIfNoEntry: false })?.isDirectory() ? resolve(requested, "index.html") : requested;
    if (!statSync(file, { throwIfNoEntry: false })?.isFile()) {
      response.writeHead(404).end("Not found"); return;
    }
    response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "x-content-type-options": "nosniff" });
    response.end(readFileSync(file));
  } catch {
    response.writeHead(400).end("Bad request");
  }
});
const port = Number(process.env.SITE_PORT || 4173);
server.listen(port, "127.0.0.1", () => console.log("Website preview: http://127.0.0.1:" + port));
