import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

function copyDeclarations(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name);
    const destinationPath = join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDeclarations(sourcePath, destinationPath);
    } else if (entry.isFile() && entry.name.endsWith(".d.ts")) {
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

copyDeclarations("dist/types", "dist/esm");
copyDeclarations("dist/types", "dist/cjs");
