// Foundation smoke test (Node): embed the OpenGost subset, draw an A3 page with
// the ЕСКД border + Cyrillic text, then read the text back via pdf.js to confirm
// it is selectable. Run: node test/foundation.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PAGE_W, PAGE_H, BORDER_INSET, BORDER_W, SZ, BLACK, BLUE, ML } from "../src/pdf/layout.js";
import { hexRgb, ascent, drawAligned, wrapText } from "../src/pdf/text.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.OUT || join(here, "..", "..", "..", "AppData", "Local", "Temp", "claude", "foundation.pdf");

const fontBytes = readFileSync(join(here, "../src/assets/fonts/OpenGostTypeA-Regular.ttf"));

const pdf = await PDFDocument.create();
pdf.registerFontkit(fontkit);
const font = await pdf.embedFont(fontBytes, { subset: true });

const page = pdf.addPage([PAGE_W, PAGE_H]);
// ЕСКД page border
page.drawRectangle({
  x: BORDER_INSET, y: BORDER_INSET,
  width: PAGE_W - 2 * BORDER_INSET, height: PAGE_H - 2 * BORDER_INSET,
  borderWidth: BORDER_W, borderColor: hexRgb(BLACK),
});

const title = "ПУНКТ ТЕПЛОВОЙ ИНДИВИДУАЛЬНЫЙ «DN»";
let y = PAGE_H - 120;
drawAligned(page, { text: title, x: ML, y, width: PAGE_W - 2 * ML, font, size: SZ.coverTitle, color: hexRgb(BLUE), align: "center", tracking: SZ.coverTrack });

y -= 60;
const para = "ПТИ предназначен для присоединения системы отопления к тепловым сетям, учёта и регулирования тепловой энергии — пример переноса строк, кавычки «ёлочки», тире — и символы № ° ≤ ± × ·.";
const lines = wrapText(font, para, SZ.prose, 600);
for (const ln of lines) {
  drawAligned(page, { text: ln, x: ML, y, width: 600, font, size: SZ.prose, color: hexRgb(BLACK) });
  y -= SZ.proseLine;
}

const bytes = await pdf.save();
writeFileSync(out, bytes);
console.log("WROTE", out, bytes.length, "bytes;", "pages:", pdf.getPageCount(), "size:", PAGE_W.toFixed(1), "x", PAGE_H.toFixed(1));

// read text back via pdf.js to verify selectability
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, isEvalSupported: false }).promise;
const p1 = await doc.getPage(1);
const tc = await p1.getTextContent();
const text = tc.items.map((i) => i.str).join("");
console.log("EXTRACTED TEXT:", JSON.stringify(text.slice(0, 200)));
console.log("HAS_TITLE:", text.includes("ПУНКТ"), "HAS_GUILLEMET:", text.includes("«"), "HAS_NUMERO:", text.includes("№"));
