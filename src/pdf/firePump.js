import { PDFDocument } from "pdf-lib";

const PAGE_W = 794;
const PAGE_H = 1123;
const PDF_W = 595.28;
const PDF_H = 841.89;
const SCALE = 2;
const M = 54;
const CONTENT_W = PAGE_W - M * 2;
const BLUE = "#1f4e79";
const LIGHT_BLUE = "#d9eaf7";
const LIGHT_GREY = "#f3f6f8";
const BORDER = "#aab7c4";
const TEXT = "#17212f";

function font(size, bold = false) {
  return `${bold ? "700 " : ""}${size}px Arial, sans-serif`;
}

function wrap(ctx, text, width) {
  const out = [];
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= width || !line) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

class CanvasDoc {
  constructor(meta) {
    this.meta = meta;
    this.pages = [];
    this.ctx = null;
    this.y = M;
    this.newPage();
  }

  newPage() {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W * SCALE;
    canvas.height = PAGE_H * SCALE;
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.fillStyle = TEXT;
    ctx.textBaseline = "top";
    this.pages.push(canvas);
    this.ctx = ctx;
    this.y = M;
    this.header();
  }

  header() {
    const ctx = this.ctx;
    ctx.fillStyle = BLUE;
    ctx.font = font(18, true);
    ctx.fillText(this.meta.title || "ТКП", M, this.y);
    ctx.font = font(13);
    ctx.fillStyle = "#627084";
    const right = this.meta.model || "";
    ctx.fillText(right, PAGE_W - M - ctx.measureText(right).width, this.y + 3);
    this.y += 34;
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(M, this.y);
    ctx.lineTo(PAGE_W - M, this.y);
    ctx.stroke();
    this.y += 24;
  }

  footer() {
    const ctx = this.ctx;
    ctx.font = font(11);
    ctx.fillStyle = "#7a8594";
    const text = `Стр. ${this.pages.length}`;
    ctx.fillText(text, PAGE_W - M - ctx.measureText(text).width, PAGE_H - M + 18);
  }

  ensure(h) {
    if (this.y + h > PAGE_H - M) {
      this.footer();
      this.newPage();
    }
  }

  heading(text, level = 1) {
    const size = level === 1 ? 24 : 18;
    const before = level === 1 ? 10 : 18;
    this.ensure(before + size + 18);
    this.y += before;
    this.ctx.font = font(size, true);
    this.ctx.fillStyle = BLUE;
    for (const line of wrap(this.ctx, text, CONTENT_W)) {
      this.ctx.fillText(line, M, this.y);
      this.y += size + 5;
    }
    this.y += level === 1 ? 14 : 8;
  }

  paragraph(text, opts = {}) {
    const size = opts.size || 14;
    const lineH = opts.lineH || Math.round(size * 1.45);
    const lines = wrap(this.ctxFor(size, opts.bold), text, opts.width || CONTENT_W);
    this.ensure(lines.length * lineH + (opts.after ?? 10));
    this.ctx.font = font(size, opts.bold);
    this.ctx.fillStyle = opts.color || TEXT;
    for (const line of lines) {
      this.ctx.fillText(line, opts.x || M, this.y);
      this.y += lineH;
    }
    this.y += opts.after ?? 10;
  }

  ctxFor(size, bold = false) {
    this.ctx.font = font(size, bold);
    return this.ctx;
  }

  metaTable() {
    const rows = [
      ["Дата", this.meta.date || ""],
      ["Ответственный сотрудник", this.meta.employee || ""],
      ["Организация", this.meta.organization || ""],
      ["Название объекта", this.meta.objectName || ""],
      ["ID", this.meta.id || ""],
    ];
    this.table(rows, [0.28, 0.72], { headerRows: 0, compact: true, fillFirstCol: LIGHT_GREY });
    this.y += 8;
  }

  table(rows, widths, opts = {}) {
    const ctx = this.ctx;
    const abs = widths.map((w) => CONTENT_W * w);
    const headerRows = opts.headerRows ?? 1;
    const size = opts.compact ? 12 : 13;
    const lineH = Math.round(size * 1.35);
    ctx.font = font(size);

    const heights = rows.map((row, r) => {
      let lines = 1;
      row.forEach((cell, c) => {
        const local = wrap(ctx, cell, abs[c] - 16);
        lines = Math.max(lines, local.length || 1);
      });
      return Math.max(opts.compact ? 30 : 36, lines * lineH + 16);
    });

    const drawHeader = () => {
      for (let r = 0; r < headerRows; r++) drawRow(r);
    };

    const drawRow = (r) => {
      const h = heights[r];
      this.ensure(h + 4);
      let x = M;
      rows[r].forEach((cell, c) => {
        const isHeader = r < headerRows;
        ctx.fillStyle = isHeader ? LIGHT_BLUE : (opts.fillFirstCol && c === 0 ? opts.fillFirstCol : "#fff");
        ctx.fillRect(x, this.y, abs[c], h);
        ctx.strokeStyle = BORDER;
        ctx.strokeRect(x, this.y, abs[c], h);
        ctx.font = font(size, isHeader || (opts.fillFirstCol && c === 0));
        ctx.fillStyle = TEXT;
        const lines = wrap(ctx, cell, abs[c] - 16);
        let ty = this.y + 8;
        lines.forEach((line) => {
          ctx.fillText(line, x + 8, ty);
          ty += lineH;
        });
        x += abs[c];
      });
      this.y += h;
    };

    if (headerRows) drawHeader();
    for (let r = headerRows; r < rows.length; r++) {
      if (this.y + heights[r] > PAGE_H - M) {
        this.footer();
        this.newPage();
        if (headerRows) drawHeader();
      }
      drawRow(r);
    }
    this.y += 16;
  }

  finish() {
    this.footer();
  }
}

function startSection(doc, data, section, first) {
  if (!first) doc.newPage();
  doc.heading(section.title, 1);
  doc.metaTable();
}

function renderGeneral(doc, section, data, first) {
  startSection(doc, data, section, first);
  doc.paragraph(data.meta.title || "Насосная установка пожаротушения", { size: 20, bold: true, color: BLUE, after: 2 });
  if (data.meta.model) doc.paragraph(data.meta.model, { size: 17, bold: true, after: 18 });
  doc.table([
    ["Срок поставки", "Наименование", "Кол-во", "Розничная цена, USD с НДС"],
    [section.leadTime || "", section.itemName || "", section.quantity || "", section.price || ""],
  ], [0.24, 0.46, 0.1, 0.2]);
  for (const [title, value] of section.blocks || []) {
    doc.heading(title, 2);
    if (Array.isArray(value)) value.forEach((line) => doc.paragraph("• " + line, { after: 4 }));
    else doc.paragraph(value);
  }
}

function renderDesignation(doc, section, data, first) {
  startSection(doc, data, section, first);
  if (section.formula) doc.paragraph(section.formula, { size: 17, bold: true, color: BLUE, after: 18 });
  if (section.parts?.length) {
    doc.table([
      ["Позиция", "Значение", "Описание"],
      ...section.parts.map((p) => [p.part, p.value, p.description]),
    ], [0.16, 0.24, 0.6]);
  }
  for (const msg of section.important || []) doc.paragraph("ВАЖНО: " + msg, { bold: true });
}

function renderTechnical(doc, section, data, first) {
  startSection(doc, data, section, first);
  if (data.meta.model) doc.paragraph("Артикул/Модель: " + data.meta.model, { bold: true });
  for (const group of section.groups || []) {
    doc.heading(group.name, 2);
    doc.table([["Параметр", "Значение"], ...group.rows], [0.58, 0.42]);
  }
}

function renderEquipment(doc, section, data, first) {
  startSection(doc, data, section, first);
  if (data.meta.model) doc.paragraph("Модель: " + data.meta.model, { bold: true });
  doc.table([["№", "Наименование", "Количество", "Примечание"], ...(section.items || [])], [0.08, 0.58, 0.14, 0.2]);
}

function renderSimple(doc, section, data, first) {
  startSection(doc, data, section, first);
  const rows = [
    ["Модель", section.model || data.meta.model || ""],
    ["Подзаголовок", section.caption || ""],
    ["Комментарий", section.comment || ""],
  ].filter((row) => row[1]);
  if (rows.length) doc.table([["Поле", "Значение"], ...rows], [0.28, 0.72]);
}

const RENDERERS = {
  general: renderGeneral,
  designation: renderDesignation,
  technical: renderTechnical,
  equipment: renderEquipment,
};

export async function buildFirePumpPdf(data) {
  const canvasDoc = new CanvasDoc(data.meta);
  data.sections.forEach((section, index) => {
    const render = RENDERERS[section.key] || renderSimple;
    render(canvasDoc, section, data, index === 0);
  });
  canvasDoc.finish();

  const pdf = await PDFDocument.create();
  pdf.setTitle(data.meta.title || "ТКП");
  pdf.setProducer("tkp-pdf-generator");
  for (const canvas of canvasDoc.pages) {
    const png = await pdf.embedPng(canvas.toDataURL("image/png"));
    const page = pdf.addPage([PDF_W, PDF_H]);
    page.drawImage(png, { x: 0, y: 0, width: PDF_W, height: PDF_H });
  }
  return { bytes: await pdf.save(), pages: canvasDoc.pages.length };
}
