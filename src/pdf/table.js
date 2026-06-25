// Generic fixed-column table: wrapped cells, vertical-centered text, thin grid,
// header-row repeat on page breaks, plus a measure-only mode used to decide
// whether a whole block fits (unbreakable spec blocks).
import { hexRgb, ascent, wrapText, drawAligned } from "./text.js";
import { BLACK, CONTENT_L } from "./layout.js";

const TABLE_LINE = 0.5; // grid line width (pt)

// rows: array of arrays of cell strings.
// opt: { colWidths, size, headerSize, headerRows=1, alignOf(col,isHeader),
//        padX, padY, headerPadY, lineHeight, color }
function rowHeights(rows, opt) {
  const { colWidths, font } = opt;
  return rows.map((cells, r) => {
    const isH = r < opt.headerRows;
    const size = isH ? opt.headerSize : opt.size;
    const lh = opt.lineHeight ?? size * 1.2;
    const padY = (isH ? opt.headerPadY : opt.padY) ?? size * 0.35;
    let maxLines = 1;
    cells.forEach((txt, c) => {
      const w = colWidths[c] - 2 * opt.padX;
      const lines = wrapText(font, txt, size, w);
      if (lines.length > maxLines) maxLines = lines.length;
    });
    return maxLines * lh + 2 * padY;
  });
}

export function measureTable(rows, opt) {
  const heights = rowHeights(rows, opt);
  return { heights, total: heights.reduce((a, b) => a + b, 0) };
}

function drawRow(page, cells, x, top, h, isH, opt) {
  const { colWidths, font } = opt;
  const size = isH ? opt.headerSize : opt.size;
  const lh = opt.lineHeight ?? size * 1.2;
  const color = hexRgb(opt.color || BLACK);
  let cx = x;
  cells.forEach((txt, c) => {
    const w = colWidths[c];
    const lines = wrapText(font, txt, size, w - 2 * opt.padX);
    const contentH = lines.length * lh;
    const align = opt.alignOf ? opt.alignOf(c, isH) : "left";
    let lineTop = top - (h - contentH) / 2; // vertical center
    lines.forEach((ln, i) => {
      const baseline = lineTop - ascent(font, size) - i * lh + (lh - size) / 2;
      drawAligned(page, {
        text: ln, x: cx + opt.padX, y: baseline, width: w - 2 * opt.padX,
        font, size, color, align,
      });
    });
    cx += w;
  });
}

function drawGrid(page, x, top, w, h, colWidths, color) {
  page.drawRectangle({ x, y: top - h, width: w, height: h, borderWidth: TABLE_LINE, borderColor: color });
  let cx = x;
  for (let c = 0; c < colWidths.length - 1; c++) {
    cx += colWidths[c];
    page.drawLine({ start: { x: cx, y: top }, end: { x: cx, y: top - h }, thickness: TABLE_LINE, color });
  }
}

// Draw the table at the document cursor, paginating with header repeat.
// `x` defaults to the document content left.
export function drawTable(doc, rows, opt) {
  const x = opt.x ?? CONTENT_L;
  const totalW = opt.colWidths.reduce((a, b) => a + b, 0);
  const color = hexRgb(opt.color || BLACK);
  const heights = rowHeights(rows, opt);
  const headerRows = opt.headerRows ?? 1;

  const drawHeaderHere = () => {
    for (let r = 0; r < headerRows; r++) {
      const h = heights[r];
      drawRow(doc.page, rows[r], x, doc.y, h, true, opt);
      drawGrid(doc.page, x, doc.y, totalW, h, opt.colWidths, color);
      doc.moveDown(h);
    }
  };

  if (headerRows > 0) {
    const headH = heights.slice(0, headerRows).reduce((a, b) => a + b, 0);
    doc.ensure(headH + (heights[headerRows] || 0)); // keep header with first row
    drawHeaderHere();
  }

  for (let r = headerRows; r < rows.length; r++) {
    const h = heights[r];
    if (doc.space() < h) { doc.carry(); if (headerRows > 0) drawHeaderHere(); }
    drawRow(doc.page, rows[r], x, doc.y, h, false, opt);
    drawGrid(doc.page, x, doc.y, totalW, h, opt.colWidths, color);
    doc.moveDown(h);
  }
}
