// Parse the "specifications" workbook: ONE block per SHEET (tab order).
// Each sheet -> { sub, desig, rows[][7] }. Sub/desig come from labelled cells
// (or the sheet name); the 7 columns are matched by header keywords.
import { norm, cellToStr, sheetRows, findRow, blankRow } from "./excelHelpers.js";

// keyword -> target column index (0..6)
const COL_MATCH = [
  { i: 0, test: (n, raw) => raw.includes("№") || n.includes("поз") || n === "n" || n.includes("номер") },
  { i: 1, test: (n) => n.includes("наименован") },
  { i: 2, test: (n) => n.includes("тип") || n.includes("марка") },
  { i: 3, test: (n) => n.includes("завод") || n.includes("изготовител") },
  { i: 4, test: (n) => n.includes("ед") && (n.includes("изм") || n.length <= 6) },
  { i: 5, test: (n) => n.includes("кол") },
  { i: 6, test: (n) => n.includes("примечан") },
];

function valueBeside(rows, ...needles) {
  for (const row of rows) {
    const label = norm(row[0]);
    if (label && needles.some((nd) => label.includes(nd))) {
      for (let c = 1; c < row.length; c++) { const v = cellToStr(row[c]); if (v) return v; }
    }
  }
  return "";
}

function headerMap(rows) {
  const hdr = findRow(rows, (n, raw) => {
    let hits = 0;
    n.forEach((cell, c) => { if (COL_MATCH.some((m) => m.test(cell, String(raw[c] ?? "")))) hits++; });
    return hits >= 3;
  });
  if (hdr < 0) return { hdr: -1, map: null };
  const raw = rows[hdr], map = {}, used = new Set();
  raw.forEach((cell, c) => {
    const n = norm(cell), rawS = String(cell ?? "");
    const m = COL_MATCH.find((mm) => !used.has(mm.i) && mm.test(n, rawS));
    if (m) { map[c] = m.i; used.add(m.i); }
  });
  return { hdr, map };
}

function parseSheet(ws, sheetName) {
  const rows = sheetRows(ws);
  const sub = valueBeside(rows, "подзаголов", "раздел", "блок") || sheetName;
  const desig = valueBeside(rows, "обознач");
  const { hdr, map } = headerMap(rows);

  const out = [];
  const start = hdr >= 0 ? hdr + 1 : 0;
  for (let r = start; r < rows.length; r++) {
    const row = rows[r];
    if (blankRow(row)) continue;
    const label = norm(row[0]);
    if (label.includes("подзаголов") || label.includes("обознач") || label.includes("раздел")) continue;
    const cells = ["", "", "", "", "", "", ""];
    if (hdr >= 0 && map) {
      for (const c in map) cells[map[c]] = cellToStr(row[c]);
    } else {
      for (let c = 0; c < 7; c++) cells[c] = cellToStr(row[c]);
    }
    if (cells.every((c) => c === "")) continue;
    out.push(cells);
  }
  return { sub: sub.trim(), desig: desig.trim(), rows: out, hadHeader: hdr >= 0 };
}

export function parseSpec(wb) {
  const names = wb.SheetNames || [];
  const specBlocks = [];
  const warnings = [];
  for (const name of names) {
    const block = parseSheet(wb.Sheets[name], name);
    if (!block.rows.length) { warnings.push(`Лист «${name}»: нет строк спецификации — пропущен.`); continue; }
    if (!block.hadHeader) warnings.push(`Лист «${name}»: заголовок таблицы не распознан — колонки прочитаны по порядку.`);
    specBlocks.push({ sub: block.sub, desig: block.desig, rows: block.rows });
  }
  const errors = [];
  if (!specBlocks.length) errors.push("В файле спецификаций нет ни одного заполненного листа.");
  return { specBlocks, warnings, errors };
}
