// Shared helpers for the Excel parsers: normalization, cell coercion, reading a
// sheet to a 2D array (with merged ranges filled), and header detection.
import * as XLSX from "xlsx";

// normalize a label for fuzzy matching (lowercase, strip punctuation, collapse spaces)
export const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[«»“”"'`·.,:()\-–—№№]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function fmtDate(d, short = false) {
  const p = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${short ? String(y).slice(2) : y}`;
}

export function cellToStr(v) {
  if (v == null) return "";
  if (v instanceof Date) return fmtDate(v);
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  return String(v).trim();
}

// 2D array of a sheet, with merged ranges filled from their top-left value.
export function sheetRows(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "", blankrows: false });
  for (const m of ws["!merges"] || []) {
    const v = (rows[m.s.r] || [])[m.s.c];
    if (v === "" || v == null) continue;
    for (let r = m.s.r; r <= m.e.r; r++) {
      if (!rows[r]) rows[r] = [];
      for (let c = m.s.c; c <= m.e.c; c++) if (rows[r][c] === "" || rows[r][c] == null) rows[r][c] = v;
    }
  }
  return rows;
}

// is a row entirely blank?
export const blankRow = (row) => !row || row.every((c) => cellToStr(c) === "");

// find the first row index where `match(normalizedCells, rawCells)` is true
export function findRow(rows, match) {
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i] || [];
    if (match(raw.map(norm), raw)) return i;
  }
  return -1;
}

// pick a sheet by name predicate, else fallback index
export function pickSheet(wb, pred, fallbackIdx = -1) {
  const names = wb.SheetNames;
  const found = names.find((n) => pred(norm(n)));
  if (found) return wb.Sheets[found];
  return fallbackIdx >= 0 && names[fallbackIdx] ? wb.Sheets[names[fallbackIdx]] : null;
}
