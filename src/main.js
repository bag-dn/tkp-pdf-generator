import "./ui/style.css";
import * as XLSX from "xlsx";
import { setupUI } from "./ui/ui.js";
import { loadAssets } from "./pdf/fonts.js";
import { buildPdf } from "./pdf/build.js";
import { merge } from "./data/merge.js";
import DEFAULTS from "./data/defaults.js";
import { parseTech } from "./parse/excelTech.js";
import { parseSpec } from "./parse/excelSpec.js";
import { toRaster } from "./parse/schema.js";
import { downloadTechTemplate, downloadSpecTemplate } from "./parse/templates.js";

const readWB = async (file) =>
  XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellDates: true });

function onTemplate(kind) {
  if (kind === "tech") downloadTechTemplate();
  else downloadSpecTemplate();
  ui.status(`Шаблон «${kind === "tech" ? "тех. характеристик" : "спецификаций"}» скачан.`, "ok");
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
      try { schemaImg = await toRaster(schema); }
      catch (e) { ui.status("Схема пропущена (" + e.message + "). Создаю с плейсхолдером…", "busy"); }
    }

    ui.status("Сборка PDF…", "busy");
    const { fontBytes, logoBytes } = await loadAssets();
    const D = merge(DEFAULTS, { ...t.data, specBlocks: s.specBlocks });
    const { bytes, pages, listov } = await buildPdf({ D, fontBytes, logoBytes, schema: schemaImg });

    const name = "KP_" + String(D.designation || "TKP").replace(/\s+/g, "_").replace(/[^\w.\-]/g, "") + ".pdf";
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);

    const warns = [...t.warnings, ...s.warnings];
    ui.status(`Готово: ${name}  ·  страниц: ${pages}, Листов: ${listov}`
      + (warns.length ? "\n⚠ " + warns.join("\n⚠ ") : ""), "ok");
  } catch (e) {
    console.error(e);
    ui.status("Ошибка: " + (e.message || e), "err");
  }
}

const ui = setupUI({ onTemplate, onCreate });
