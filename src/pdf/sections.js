// Section builders: cover, tech table, two-column description (newspaper flow),
// specification (unbreakable blocks), schema. All draw against the Doc cursor.
import {
  TW, CW, CONTENT_L, CONTENT_R, PAGE_H, BLACK, BLUE, GREY, SZ, PC, SC,
  SPEC_CENTER, SPEC_HEAD, padRow, fitImage, SCHEMA_MAX_W, SCHEMA_MAX_H,
  COVER_LOGO_W, LOGO_ASPECT, COVER_FIELD_LBL,
} from "./layout.js";
import { hexRgb, ascent, wrapText, drawAligned } from "./text.js";
import { drawTable, measureTable } from "./table.js";

const black = hexRgb(BLACK);

function rule(doc, before, after, thickness = 0.75, color = black) {
  doc.moveDown(TW(before));
  doc.page.drawLine({ start: { x: CONTENT_L, y: doc.y }, end: { x: CONTENT_R, y: doc.y }, thickness, color });
  doc.moveDown(TW(after));
}

// ---- section heading with bottom rule ----
export function sectionHeading(doc, text) {
  const size = SZ.heading;
  doc.ensure(TW(80) + size * 1.4 + TW(120));
  doc.moveDown(TW(80));
  const baseline = doc.y - ascent(doc.font, size);
  drawAligned(doc.page, { text, x: CONTENT_L, y: baseline, width: CW, font: doc.font, size, color: black, align: "left", tracking: SZ.headTrack });
  doc.moveDown(size + 3);
  doc.page.drawLine({ start: { x: CONTENT_L, y: doc.y + 2 }, end: { x: CONTENT_R, y: doc.y + 2 }, thickness: 0.75, color: black });
  doc.moveDown(TW(120));
}

// ---- (1) cover ----
function coverFields(D) {
  if (Array.isArray(D.coverFields) && D.coverFields.length) return D.coverFields;
  return [
    ["Наименование", D.productName],
    ["Обозначение", D.designation],
    ["Изготовитель", D.company.name],
    ["Заказчик", D.customer || "—"],
    ["Объект", D.objectFull],
    ["Стадия", D.stage],
    ["Разработал", D.developer],
  ];
}

export function cover(doc, D) {
  const font = doc.font;
  // header: logo (left) + requisites (right)
  const logoH = COVER_LOGO_W * LOGO_ASPECT;
  const reqTop = doc.y;
  if (doc.logo) doc.page.drawImage(doc.logo, { x: CONTENT_L, y: reqTop - logoH, width: COVER_LOGO_W, height: logoH });
  let ry = reqTop;
  (D.company.requisites || []).forEach((t, i) => {
    const size = i === 0 ? SZ.req0 : SZ.req;
    const lh = size * 1.35;
    ry -= ascent(font, size);
    drawAligned(doc.page, { text: t, x: CONTENT_L, y: ry, width: CW, font, size, color: black, align: "right" });
    ry -= lh - ascent(font, size);
  });
  doc.y = Math.min(reqTop - logoH, ry) - 4;

  rule(doc, 160, 60);
  // blue colour bar
  const barH = TW(150);
  doc.page.drawRectangle({ x: CONTENT_L, y: doc.y - barH, width: CW, height: barH, color: hexRgb(BLUE) });
  doc.moveDown(barH);
  rule(doc, 60, 200);

  // title
  doc.moveDown(TW(80));
  const tBase = doc.y - ascent(font, SZ.coverTitle);
  drawAligned(doc.page, { text: D.coverTitle, x: CONTENT_L, y: tBase, width: CW, font, size: SZ.coverTitle, color: black, align: "center", tracking: SZ.coverTrack });
  doc.moveDown(SZ.coverTitle + TW(260));

  // fields table (borderless)
  const LBL = COVER_FIELD_LBL, VAL = CW - LBL, size = SZ.coverField, lh = size * 1.35;
  for (const [k, v] of coverFields(D)) {
    const vlines = wrapText(font, String(v ?? ""), size, VAL - 6);
    const rowH = Math.max(1, vlines.length) * lh + TW(40);
    let top = doc.y - TW(20);
    drawAligned(doc.page, { text: k, x: CONTENT_L, y: top - ascent(font, size), width: LBL, font, size, color: black, align: "left" });
    vlines.forEach((ln, i) => {
      drawAligned(doc.page, { text: ln, x: CONTENT_L + LBL, y: top - ascent(font, size) - i * lh, width: VAL, font, size, color: black, align: "left" });
    });
    doc.moveDown(rowH);
  }

  rule(doc, 200, 80);
  // notes
  doc.moveDown(TW(40));
  drawAligned(doc.page, { text: "Примечания:", x: CONTENT_L, y: doc.y - ascent(font, SZ.notesLbl), width: CW, font, size: SZ.notesLbl, color: black, align: "left" });
  doc.moveDown(SZ.notesLbl + TW(40));
  (D.notes || []).forEach((n, i) => {
    const size = SZ.note, lh = size * 1.3;
    const lines = wrapText(font, (i + 1) + ". " + n, size, CW);
    lines.forEach((ln) => { drawAligned(doc.page, { text: ln, x: CONTENT_L, y: doc.y - ascent(font, size), width: CW, font, size, color: black, align: "left" }); doc.moveDown(lh); });
    doc.moveDown(TW(20));
  });
}

// ---- (2) tech characteristics ----
export function tech(doc, D) {
  sectionHeading(doc, "Технические характеристики");
  const rows = [["Параметр", "Значение", "Параметр", "Значение"], ...(D.techChars || []).map((r) => padRow(r, 4))];
  drawTable(doc, rows, {
    colWidths: PC, font: doc.font, size: SZ.tech, headerSize: SZ.tech, headerRows: 1,
    padX: TW(70), padY: TW(26), headerPadY: TW(26),
    alignOf: (c, isH) => (isH || c % 2 === 1) ? "center" : "left",
  });
}

// ---- (3) description — two-column newspaper flow ----
export function description(doc, D) {
  const font = doc.font;
  const colW = TW(10945), gap = TW(560), colW2 = TW(10946);
  let col = 0;
  let y = doc.y;
  const colTop = () => PAGE_H - doc.cur.topMargin;
  const bottom = () => doc.cur.bottomLimit;
  const colX = () => (col === 0 ? CONTENT_L : CONTENT_L + colW + gap);
  const width = () => (col === 0 ? colW : colW2);
  const nextCol = () => { if (col === 0) { col = 1; y = colTop(); } else { doc.carry(); col = 0; y = colTop(); } };

  const hSize = SZ.heading, hLH = hSize * 1.2;
  const pSize = SZ.prose, pLH = SZ.proseLine;

  for (const [head, paras] of (D.description || [])) {
    // heading kept with at least one following line
    const need = TW(160) + hLH + TW(60) + pLH;
    if (y - need < bottom()) nextCol();
    y -= TW(160);
    const hlines = wrapText(font, head, hSize, width());
    for (const ln of hlines) {
      if (y - hLH < bottom()) nextCol();
      drawAligned(doc.page, { text: ln, x: colX(), y: y - ascent(font, hSize), width: width(), font, size: hSize, color: black, align: "left", tracking: SZ.descTrack });
      y -= hLH;
    }
    doc.page.drawLine({ start: { x: colX(), y: y + 2 }, end: { x: colX() + width(), y: y + 2 }, thickness: 0.5, color: black });
    y -= TW(60);

    for (const p of (paras || [])) {
      const lines = wrapText(font, p, pSize, width());
      for (const ln of lines) {
        if (y - pLH < bottom()) nextCol();
        drawAligned(doc.page, { text: ln, x: colX(), y: y - ascent(font, pSize), width: width(), font, size: pSize, color: black, align: "left" });
        y -= pLH;
      }
      y -= TW(60);
    }
  }
  doc.y = bottom(); // section consumed
}

// ---- (4) specification — unbreakable blocks ----
const specOpt = (font) => ({
  colWidths: SC, font, size: SZ.spec, headerSize: SZ.spec, headerRows: 1,
  padX: TW(60), padY: TW(30), headerPadY: TW(38),
  alignOf: (c) => (SPEC_CENTER.has(c) ? "center" : "left"),
});

export function spec(doc, D) {
  sectionHeading(doc, "Спецификация оборудования, изделий и материалов");
  const font = doc.font;
  const opt = specOpt(font);
  const subSize = SZ.blockSub, subLH = subSize * 1.2;
  const pageH = PAGE_H - doc.cur.topMargin - doc.cur.bottomLimit;

  for (const b of (D.specBlocks || [])) {
    const subText = (b.sub || "") + "   " + (b.desig || "");
    const subLines = wrapText(font, subText, subSize, CW);
    const subH = TW(120) + subLines.length * subLH + TW(70);
    const rows = [SPEC_HEAD, ...(b.rows || []).map((r) => padRow(r, 7))];
    const { total } = measureTable(rows, opt);
    const blockH = subH + total;
    if (doc.space() < blockH && blockH <= pageH) doc.carry();

    doc.moveDown(TW(120));
    for (const ln of subLines) {
      drawAligned(doc.page, { text: ln, x: CONTENT_L, y: doc.y - ascent(font, subSize), width: CW, font, size: subSize, color: black, align: "left" });
      doc.moveDown(subLH);
    }
    doc.moveDown(TW(70));
    drawTable(doc, rows, opt);
    doc.moveDown(TW(80));
  }

  if (D.reserve) {
    doc.moveDown(TW(40));
    const size = SZ.reserve, lh = size * 1.35;
    for (const ln of wrapText(font, D.reserve, size, CW)) {
      doc.ensure(lh);
      drawAligned(doc.page, { text: ln, x: CONTENT_L, y: doc.y - ascent(font, size), width: CW, font, size, color: black, align: "left" });
      doc.moveDown(lh);
    }
  }
}

// ---- (5) schema ----
export function schema(doc, D, schemaImg) {
  sectionHeading(doc, "Схема гидравлическая принципиальная");
  const font = doc.font;
  if (!schemaImg) {
    doc.moveDown(TW(800));
    const size = 12;
    drawAligned(doc.page, { text: "[ место для схемы — приложите изображение ]", x: CONTENT_L, y: doc.y, width: CW, font, size, color: hexRgb(GREY), align: "center" });
    return;
  }
  doc.moveDown(TW(60));
  const availW = Math.min(SCHEMA_MAX_W, CW);
  const availH = Math.min(SCHEMA_MAX_H, doc.space());
  const { w, h } = fitImage(schemaImg.w, schemaImg.h, availW, availH);
  const x = CONTENT_L + (CW - w) / 2;
  doc.page.drawImage(schemaImg.image, { x, y: doc.y - h, width: w, height: h });
  doc.moveDown(h);
}
