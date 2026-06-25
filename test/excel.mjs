// Round-trip test (Node): generate the .xlsx templates, parse them back, merge
// over defaults and build the PDF. Verifies parsers produce valid input.
// Run: node test/excel.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as XLSX from "xlsx";
import { techTemplateWB, specTemplateWB } from "../src/parse/templates.js";
import { parseTech } from "../src/parse/excelTech.js";
import { parseSpec } from "../src/parse/excelSpec.js";
import { merge } from "../src/data/merge.js";
import DEFAULTS from "../src/data/defaults.js";
import { buildPdf } from "../src/pdf/build.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.OUT || join(here, "tkp-excel.pdf");

// generate -> bytes -> re-read (full round trip)
const techBytes = XLSX.write(techTemplateWB(), { type: "array", bookType: "xlsx" });
const specBytes = XLSX.write(specTemplateWB(), { type: "array", bookType: "xlsx" });
const techWB = XLSX.read(techBytes, { type: "array", cellDates: true });
const specWB = XLSX.read(specBytes, { type: "array", cellDates: true });

const tech = parseTech(techWB);
const spec = parseSpec(specWB);
console.log("TECH errors:", tech.errors, "warnings:", tech.warnings);
console.log("SPEC errors:", spec.errors, "warnings:", spec.warnings);
console.log("parsed designation:", tech.data.designation);
console.log("parsed objectShort:", tech.data.objectShort);
console.log("parsed notes:", tech.data.notes);
console.log("parsed techChars rows:", (tech.data.techChars || []).length);
console.log("parsed spec blocks:", spec.specBlocks.map((b) => `${b.sub} [${b.rows.length} rows]`));

const D = merge(DEFAULTS, { ...tech.data, specBlocks: spec.specBlocks });
const fontBytes = readFileSync(join(here, "../src/assets/fonts/OpenGostTypeA-Regular.ttf"));
const logoBytes = readFileSync(join(here, "../src/assets/logo.jpg"));
const { bytes, pages, listov } = await buildPdf({ D, fontBytes, logoBytes, schema: null });
writeFileSync(out, bytes);
console.log("WROTE", out, bytes.length, "bytes; pages:", pages, "listov:", listov);
