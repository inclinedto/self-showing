// pdf.js needs its worker, CJK character maps and font data served as static files.
// They are copied from node_modules at dev/build time instead of being committed.
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "pdfjs-dist");
const target = join(root, "public", "pdfjs");

mkdirSync(target, { recursive: true });
cpSync(join(source, "legacy", "build", "pdf.worker.min.mjs"), join(target, "pdf.worker.min.mjs"));
for (const dir of ["cmaps", "standard_fonts", "wasm"]) {
  cpSync(join(source, dir), join(target, dir), { recursive: true });
}

console.log("Copied pdf.js assets to public/pdfjs");
