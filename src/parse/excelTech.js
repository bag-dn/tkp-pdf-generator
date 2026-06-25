// Parse the "tech characteristics" workbook: a "Метаданные" sheet (label→value)
// + a "Тех. характеристики" sheet (4-column table). Returns { data, warnings,
// errors } where data is the dynamic subset that gets merged over defaults.
import { norm, cellToStr, fmtDate, sheetRows, findRow, blankRow } from "./excelHelpers.js";

const has = (label, ...needles) => needles.every((n) => label.includes(n));

function parseMeta(rows) {
  const data = { objectShort: ["", ""], notes: [] };
  const warnings = [];
  for (const row of rows) {
    const label = norm(row[0]);
    if (!label) continue;
    const raw = row[1];
    const v = cellToStr(raw);
    if (has(label, "обознач")) data.designation = v;
    else if (has(label, "наименован")) { if (v) data.productName = v; }
    else if (has(label, "заказчик")) { if (v) data.customer = v; }
    else if (has(label, "разраб")) data.developer = v;
    else if (has(label, "стадия")) { if (v) data.stage = v; }
    else if (has(label, "дата") && has(label, "штамп")) data.dateStamp = raw instanceof Date ? fmtDate(raw, true) : v;
    else if (has(label, "дата")) data.date = raw instanceof Date ? fmtDate(raw, false) : v;
    else if (has(label, "объект") && (has(label, "полн") || !has(label, "строка") && !has(label, "штамп"))) data.objectFull = v;
    else if (has(label, "объект") && (has(label, "1") || has(label, "строка 1"))) data.objectShort[0] = v;
    else if (has(label, "объект") && (has(label, "2") || has(label, "строка 2"))) data.objectShort[1] = v;
    else if (has(label, "листов")) { if (v) data.listov = v; }
    else if (has(label, "примечани")) {
      if (v.includes("\n")) data.notes.push(...v.split("\n").map((s) => s.trim()).filter(Boolean));
      else if (v) data.notes.push(v);
    }
  }
  // derive objectShort if empty (fallback; template usually provides it)
  if (!data.objectShort[0] && data.objectFull) {
    data.objectShort[0] = data.objectFull.split(",")[0].trim().slice(0, 60);
    const city = data.objectFull.match(/г\.\s*[А-ЯЁ][А-Яа-яёЁ-]+/);
    data.objectShort[1] = city ? city[0] : "";
  }
  if (!data.objectShort[0] && !data.objectShort[1]) delete data.objectShort;
  if (!data.notes.length) delete data.notes;
  return { data, warnings };
}

function parseTechTable(rows) {
  const warnings = [];
  const hdr = findRow(rows, (n) => n.includes("параметр") && n.includes("значение"));
  if (hdr < 0) { warnings.push("Лист тех. характеристик: не найдена строка заголовка («Параметр | Значение»). Использован шаблон по умолчанию."); return { techChars: null, warnings }; }
  const pairs = (rows[hdr] || []).map(norm).filter((c) => c === "параметр").length; // 1 or 2
  const out = [];
  if (pairs >= 2) {
    for (let r = hdr + 1; r < rows.length; r++) {
      const row = rows[r];
      if (blankRow(row)) continue;
      out.push([0, 1, 2, 3].map((i) => cellToStr(row[i])));
    }
  } else {
    const flat = [];
    for (let r = hdr + 1; r < rows.length; r++) {
      const row = rows[r];
      if (blankRow(row)) continue;
      flat.push([cellToStr(row[0]), cellToStr(row[1])]);
    }
    for (let i = 0; i < flat.length; i += 2) {
      const a = flat[i], b = flat[i + 1] || ["", ""];
      out.push([a[0], a[1], b[0], b[1]]);
    }
  }
  return { techChars: out.length ? out : null, warnings };
}

export function parseTech(wb) {
  const names = wb.SheetNames || [];
  if (!names.length) return { data: {}, warnings: [], errors: ["Файл тех. характеристик пуст."] };
  const metaName = names.find((n) => /метадан|шапка/.test(norm(n))) || names[0];
  const techName = names.find((n) => n !== metaName && /тех|характер|параметр/.test(norm(n)))
    || names.find((n) => n !== metaName) || metaName;

  const meta = parseMeta(sheetRows(wb.Sheets[metaName]));
  const table = parseTechTable(sheetRows(wb.Sheets[techName]));

  const data = { ...meta.data };
  if (table.techChars) data.techChars = table.techChars;

  const errors = [];
  if (!data.designation) errors.push("Не указано «Обозначение» в листе «Метаданные».");

  return { data, warnings: [...meta.warnings, ...table.warnings], errors };
}
