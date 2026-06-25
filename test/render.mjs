// Full-document smoke test (Node): build the PDF from the example data merged
// over defaults, then verify page count / Листов / per-page selectable text.
// Run: node test/render.mjs [path-to-example.json] [schema.png]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildPdf } from "../src/pdf/build.js";
import { merge } from "../src/data/merge.js";
import DEFAULTS from "../src/data/defaults.js";

const here = dirname(fileURLToPath(import.meta.url));
const examplePath = process.argv[2] || join(here, "..", "..", "ТКП pdf generator", "pti-app", "data", "example.json");
const schemaPath = process.argv[3] || null;
const out = process.env.OUT || join(here, "tkp.pdf");

const fontBytes = readFileSync(join(here, "../src/assets/fonts/OpenGostTypeA-Regular.ttf"));
const logoBytes = readFileSync(join(here, "../src/assets/logo.jpg"));
const input = JSON.parse(readFileSync(examplePath, "utf8"));
const D = merge(DEFAULTS, input);

let schema = null;
if (schemaPath) {
  const b = readFileSync(schemaPath);
  schema = { bytes: new Uint8Array(b), kind: schemaPath.endsWith(".jpg") || schemaPath.endsWith(".jpeg") ? "jpg" : "png" };
}

const { bytes, pages, listov } = await buildPdf({ D, fontBytes, logoBytes, schema });
writeFileSync(out, bytes);
console.log("WROTE", out, bytes.length, "bytes; pages:", pages, "listov:", listov);

// per-page text extraction
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, isEvalSupported: false }).promise;
for (let i = 1; i <= doc.numPages; i++) {
  const p = await doc.getPage(i);
  const tc = await p.getTextContent();
  const text = tc.items.map((t) => t.str).join("");
  console.log(`--- page ${i} (${text.length} chars) ---`);
  console.log("  ", JSON.stringify(text.slice(0, 110)));
}
