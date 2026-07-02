import "./ui/style.css";
import * as XLSX from "xlsx";
import { setupUI } from "./ui/ui.js";
import { loadAssets } from "./pdf/fonts.js";
import { buildPdf } from "./pdf/build.js";
import { buildFirePumpPdf } from "./pdf/firePump.js";
import { buildFirePumpDocx } from "./docx/firePump.js";
import { merge } from "./data/merge.js";
import DEFAULTS from "./data/defaults.js";
import { parseTech } from "./parse/excelTech.js";
import { parseSpec } from "./parse/excelSpec.js";
import { parseFirePump, downloadFirePumpTemplate } from "./parse/firePump.js";
import { toRaster } from "./parse/schema.js";
import { downloadTechTemplate, downloadSpecTemplate } from "./parse/templates.js";

const readWB = async (file) =>
  XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellDates: true });

function safeName(value, fallback = "TKP") {
  return String(value || fallback)
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_.-]/gu, "")
    .slice(0, 90) || fallback;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function onTemplate(kind) {
  if (kind === "tech") {
    downloadTechTemplate();
    ui.status("Шаблон «тех. характеристик» скачан.", "ok");
  } else if (kind === "spec") {
    downloadSpecTemplate();
    ui.status("Шаблон «спецификаций» скачан.", "ok");
  } else if (kind === "fire-pump") {
    downloadFirePumpTemplate();
    ui.fireStatus("Шаблон секций скачан.", "ok");
  }
}

async function onCreate() {
  const { tech, spec, schema } = ui.files();
  if (!tech) return ui.status("Загрузите таблицу тех. характеристик (шаг 1).", "err");
  if (!spec) return ui.status("Загрузите таблицы спецификаций (шаг 2).", "err");

  try {
    ui.status("Чтение файлов…", "busy");
    const t = parseTech(await readWB(tech));
    const s = parseSpec(await readWB(spec));
    const errors = [...t.errors, ...s.errors];
    if (errors.length) return ui.status("Не удалось создать:\n• " + errors.join("\n• "), "err");

    let schemaImg = null;
    if (schema) {
      ui.status("Обработка схемы…", "busy");
      try {
        schemaImg = await toRaster(schema);
      } catch (e) {
        ui.status("Схема пропущена (" + e.message + "). Создаю с плейсхолдером…", "busy");
      }
    }

    ui.status("Сборка PDF…", "busy");
    const { fontBytes, logoBytes } = await loadAssets();
    const D = merge(DEFAULTS, { ...t.data, specBlocks: s.specBlocks });
    const { bytes, pages, listov } = await buildPdf({ D, fontBytes, logoBytes, schema: schemaImg });

    const name = "KP_" + safeName(D.designation || "TKP") + ".pdf";
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), name);

    const warns = [...t.warnings, ...s.warnings];
    ui.status(`Готово: ${name}  ·  страниц: ${pages}, Листов: ${listov}`
      + (warns.length ? "\n⚠ " + warns.join("\n⚠ ") : ""), "ok");
  } catch (e) {
    console.error(e);
    ui.status("Ошибка: " + (e.message || e), "err");
  }
}

async function onFireCreate() {
  const { firePump } = ui.files();
  if (!firePump) return ui.fireStatus("Загрузите Excel с секциями.", "err");

  try {
    ui.fireStatus("Чтение Excel…", "busy");
    const parsed = parseFirePump(await readWB(firePump));
    if (parsed.errors.length) return ui.fireStatus("Не удалось создать:\n• " + parsed.errors.join("\n• "), "err");

    const format = ui.fireFormat();
    const base = "TKP_fire_pump_" + safeName(parsed.data.meta.model || parsed.data.meta.title || "fire_pump");
    if (format === "pdf") {
      ui.fireStatus("Сборка PDF…", "busy");
      const { bytes, pages } = await buildFirePumpPdf(parsed.data);
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), base + ".pdf");
      ui.fireStatus(`Готово: ${base}.pdf  ·  страниц: ${pages}  ·  секций: ${parsed.data.sections.length}`
        + (parsed.warnings.length ? "\n⚠ " + parsed.warnings.join("\n⚠ ") : ""), "ok");
    } else {
      ui.fireStatus("Сборка Word…", "busy");
      const blob = await buildFirePumpDocx(parsed.data);
      downloadBlob(blob, base + ".docx");
      ui.fireStatus(`Готово: ${base}.docx  ·  секций: ${parsed.data.sections.length}`
        + (parsed.warnings.length ? "\n⚠ " + parsed.warnings.join("\n⚠ ") : ""), "ok");
    }
  } catch (e) {
    console.error(e);
    ui.fireStatus("Ошибка: " + (e.message || e), "err");
  }
}

const ui = setupUI({ onTemplate, onCreate, onFireCreate });
