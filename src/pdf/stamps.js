// ЕСКД main inscriptions (Форма 1 + Форма 2а), running header and cover-date
// footer. Drawn at absolute coordinates in the bottom-right of the frame.
// Cells (incl. merged ones) are explicit rectangles, so the grid is exact.
import { hexRgb, ascent, drawAligned, wrapText } from "./text.js";
import {
  BLACK, BLUE, CONTENT_L, CONTENT_R, PAGE_H, PAGE_W, MR, ML, CW,
  BORDER_INSET, F1, F1_ROWS, F2A, F2A_ROW, SZ, LOGO_ASPECT,
} from "./layout.js";

const LINE = 0.5;
const prefix = (arr) => { const o = [0]; arr.forEach((v) => o.push(o[o.length - 1] + v)); return o; };

// def: { cols, rows, cells } ; cells: { c, r, cs?, rs?, text?, lines?, align?, size?, image?, noBorder? }
function renderStamp(page, font, logo, def, x, bottom) {
  const colX = prefix(def.cols);
  const rowY = prefix(def.rows); // from stamp top, downward
  const totalH = rowY[rowY.length - 1];
  const top = bottom + totalH;
  const black = hexRgb(BLACK);

  for (const cell of def.cells) {
    const cs = cell.cs || 1, rs = cell.rs || 1;
    const cx = x + colX[cell.c];
    const cw = colX[cell.c + cs] - colX[cell.c];
    const cTop = top - rowY[cell.r];
    const ch = rowY[cell.r + rs] - rowY[cell.r];
    if (!cell.noBorder) {
      page.drawRectangle({ x: cx, y: cTop - ch, width: cw, height: ch, borderWidth: LINE, borderColor: black });
    }
    if (cell.image && logo) {
      const padX = 6, maxW = cw - 2 * padX, maxH = ch - 6;
      let w = maxW, h = w * LOGO_ASPECT;
      if (h > maxH) { h = maxH; w = h / LOGO_ASPECT; }
      page.drawImage(logo, { x: cx + (cw - w) / 2, y: cTop - (ch + h) / 2, width: w, height: h });
      continue;
    }
    const size = cell.size || SZ.stampS;
    const lh = size * 1.15;
    const lines = cell.lines
      || (cell.text != null && cell.text !== "" ? wrapText(font, cell.text, size, cw - 4) : null);
    if (!lines || lines.length === 0) continue;
    const contentH = lines.length * lh;
    let lineTop = cTop - (ch - contentH) / 2;
    lines.forEach((ln, i) => {
      const baseline = lineTop - ascent(font, size) - i * lh + (lh - size) / 2;
      drawAligned(page, { text: ln, x: cx + 2, y: baseline, width: cw - 4, font, size, color: black, align: cell.align || "center" });
    });
  }
}

const stampX = () => CONTENT_R - F1.reduce((a, b) => a + b, 0); // both forms are 10300 tw wide

// Форма 1 — full main inscription (schema / last page)
export function drawForma1(page, font, logo, o) {
  const s = SZ.stampS, m = SZ.stampM, big = SZ.stamp18;
  const cells = [
    // three top rows: designation + object (2 lines) in the wide middle column
    { c: 0, r: 0, cs: 6, text: "" }, { c: 6, r: 0, text: o.desig, size: big }, { c: 7, r: 0, cs: 3, text: "" },
    { c: 0, r: 1, cs: 6, text: "" }, { c: 6, r: 1, text: o.objL1, size: m }, { c: 7, r: 1, cs: 3, text: "" },
    { c: 0, r: 2, cs: 6, text: "" }, { c: 6, r: 2, text: o.objL2, size: m }, { c: 7, r: 2, cs: 3, text: "" },
    // header row (row 3)
    { c: 0, r: 3, text: "Изм.", size: s }, { c: 1, r: 3, text: "Кол.уч.", size: s }, { c: 2, r: 3, text: "Лист", size: s },
    { c: 3, r: 3, text: "№док.", size: s }, { c: 4, r: 3, text: "Подп.", size: s }, { c: 5, r: 3, text: "Дата", size: s },
    { c: 6, r: 3, rs: 3, text: o.stampProduct, size: big },
    { c: 7, r: 3, text: "Стадия", size: s }, { c: 8, r: 3, text: "Лист", size: s }, { c: 9, r: 3, text: "Листов", size: s },
    // Разраб. row (row 4) — stage / Лист / Листов values
    { c: 0, r: 4, cs: 2, text: "Разраб.", size: s, align: "left" }, { c: 2, r: 4, cs: 2, text: o.dev, size: s },
    { c: 4, r: 4, text: "", size: s }, { c: 5, r: 4, text: o.dateStamp, size: s },
    { c: 7, r: 4, text: o.stage, size: m }, { c: 8, r: 4, text: String(o.list), size: m }, { c: 9, r: 4, text: String(o.listov), size: m },
    // Пров. row (row 5) — logo spans cols 7-9, rows 5-8
    { c: 0, r: 5, cs: 2, text: "Пров.", size: s, align: "left" }, { c: 2, r: 5, cs: 2, text: "" },
    { c: 4, r: 5, text: "" }, { c: 5, r: 5, text: "" },
    { c: 7, r: 5, cs: 3, rs: 4, image: true },
    // Т.контр. row (row 6) — docName spans col 6, rows 6-8
    { c: 0, r: 6, cs: 2, text: "Т.контр.", size: s, align: "left" }, { c: 2, r: 6, cs: 2, text: "" },
    { c: 4, r: 6, text: "" }, { c: 5, r: 6, text: "" },
    { c: 6, r: 6, rs: 3, lines: o.docName, size: big },
    // Н.контр. (row 7), Утв. (row 8)
    { c: 0, r: 7, cs: 2, text: "Н.контр.", size: s, align: "left" }, { c: 2, r: 7, cs: 2, text: "" }, { c: 4, r: 7, text: "" }, { c: 5, r: 7, text: "" },
    { c: 0, r: 8, cs: 2, text: "Утв.", size: s, align: "left" }, { c: 2, r: 8, cs: 2, text: "" }, { c: 4, r: 8, text: "" }, { c: 5, r: 8, text: "" },
  ];
  renderStamp(page, font, logo, { cols: F1, rows: F1_ROWS, cells }, stampX(), BORDER_INSET);
}

// Форма 2а — compact strip (body pages)
export function drawForma2a(page, font, o) {
  const s = SZ.stampS, rows = [F2A_ROW, F2A_ROW];
  const hdr = ["Изм.", "Кол.уч.", "Лист", "№док.", "Подп.", "Дата"];
  const cells = [
    ...hdr.map((t, i) => ({ c: i, r: 0, text: t, size: s })),
    { c: 6, r: 0, text: o.desig, size: SZ.stamp18 },
    { c: 7, r: 0, text: "Лист", size: s }, { c: 8, r: 0, text: "Листов", size: s },
    ...hdr.map((_, i) => ({ c: i, r: 1, text: "" })),
    { c: 6, r: 1, text: "" },
    { c: 7, r: 1, text: String(o.list), size: SZ.stamp18 }, { c: 8, r: 1, text: String(o.listov), size: SZ.stamp18 },
  ];
  renderStamp(page, font, null, { cols: F2A, rows, cells }, stampX(), BORDER_INSET);
}

// cover footer: "Дата   <date>" with a top rule
export function drawCoverFooter(page, font, date) {
  const y = BORDER_INSET + 18;
  page.drawLine({ start: { x: CONTENT_L, y: y + 12 }, end: { x: CONTENT_R, y: y + 12 }, thickness: LINE, color: hexRgb(BLACK) });
  drawAligned(page, { text: "Дата   " + (date || ""), x: CONTENT_L, y, width: CW, font, size: SZ.reserve, color: hexRgb(BLACK), align: "left" });
}

// running header on body pages: blue title (left) + designation (right) + rule
export function drawHeader(page, font, headerTitle, designation) {
  const blue = hexRgb(BLUE);
  const yBase = PAGE_H - 50;
  drawAligned(page, { text: headerTitle, x: CONTENT_L, y: yBase, width: CW, font, size: SZ.header, color: blue, align: "left" });
  drawAligned(page, { text: designation, x: CONTENT_L, y: yBase, width: CW, font, size: SZ.header, color: blue, align: "right" });
  page.drawLine({ start: { x: CONTENT_L, y: yBase - 6 }, end: { x: CONTENT_R, y: yBase - 6 }, thickness: 1, color: blue });
}
