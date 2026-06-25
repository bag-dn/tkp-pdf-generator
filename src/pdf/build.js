// Top-level builder: lays out all sections, then a single finalize pass draws
// the page border, running header, ЕСКД footers and page numbers once the total
// page count is known (no second render). Asset bytes are injected so the core
// runs in both the browser and Node (tests).
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Doc } from "./doc.js";
import {
  COVER_TOP, TOP, BOT, SCHEMA_BOT, PAGE_W, PAGE_H, BORDER_INSET, BORDER_W, BLACK,
} from "./layout.js";
import { hexRgb } from "./text.js";
import { cover, tech, description, spec, schema } from "./sections.js";
import { drawForma1, drawForma2a, drawCoverFooter, drawHeader } from "./stamps.js";

function drawBorder(page) {
  page.drawRectangle({
    x: BORDER_INSET, y: BORDER_INSET,
    width: PAGE_W - 2 * BORDER_INSET, height: PAGE_H - 2 * BORDER_INSET,
    borderWidth: BORDER_W, borderColor: hexRgb(BLACK),
  });
}

export async function buildPdf({ D, fontBytes, logoBytes, schema: schemaInput }) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const isPng = (b) => b && b[0] === 0x89 && b[1] === 0x50;
  const logo = logoBytes ? await (isPng(logoBytes) ? pdf.embedPng(logoBytes) : pdf.embedJpg(logoBytes)) : null;
  pdf.setTitle("ТКП " + (D.designation || ""));
  pdf.setCreator(D.company?.name || "ТКП generator");
  pdf.setProducer("tkp-pdf-generator");

  let schemaImg = null;
  if (schemaInput && schemaInput.bytes) {
    const img = schemaInput.kind === "jpg"
      ? await pdf.embedJpg(schemaInput.bytes)
      : await pdf.embedPng(schemaInput.bytes);
    schemaImg = { image: img, w: schemaInput.w || img.width, h: schemaInput.h || img.height };
  }

  const doc = new Doc(pdf, font, logo);
  doc.newPage({ footer: "cover", top: COVER_TOP, bottom: BOT }); cover(doc, D);
  doc.newPage({ footer: "f2a", top: TOP, bottom: BOT }); tech(doc, D);
  doc.newPage({ footer: "f2a", top: TOP, bottom: BOT }); description(doc, D);
  doc.newPage({ footer: "f2a", top: TOP, bottom: BOT }); spec(doc, D);
  doc.newPage({ footer: "f1", top: TOP, bottom: SCHEMA_BOT }); schema(doc, D, schemaImg);

  const total = doc.pages.length;
  const listov = Math.max(1, total - 1); // body sheets = all pages minus cover

  doc.pages.forEach((pm, idx) => {
    const list = idx; // cover idx0 (unused); tech idx1 -> Лист 1; last -> listov
    drawBorder(pm.page);
    if (pm.footer === "cover") { drawCoverFooter(pm.page, font, D.date); return; }
    drawHeader(pm.page, font, D.company.headerTitle, D.designation);
    if (pm.footer === "f1") {
      drawForma1(pm.page, font, logo, {
        desig: D.designation,
        objL1: (D.objectShort || [])[0] || "",
        objL2: (D.objectShort || [])[1] || "",
        stampProduct: D.stampProduct,
        dev: D.developer,
        dateStamp: D.dateStamp,
        stage: D.stage,
        docName: D.schemaDocName || ["", ""],
        list, listov,
      });
    } else {
      drawForma2a(pm.page, font, { desig: D.designation, list, listov });
    }
  });

  return { bytes: await pdf.save(), pages: total, listov };
}
