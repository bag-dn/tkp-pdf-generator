import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const FONT = "Arial";
const BLUE = "1F4E79";
const LIGHT_BLUE = "D9EAF7";
const LIGHT_GREY = "F3F6F8";
const BORDER = "AAB7C4";

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const gridBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER };

function run(text, opts = {}) {
  return new TextRun({
    text: String(text ?? ""),
    font: FONT,
    size: opts.size ?? 20,
    bold: !!opts.bold,
    color: opts.color,
    italics: !!opts.italics,
  });
}

function para(text, opts = {}) {
  const children = Array.isArray(text)
    ? text
    : [run(text, { size: opts.size, bold: opts.bold, color: opts.color, italics: opts.italics })];
  return new Paragraph({
    children,
    heading: opts.heading,
    alignment: opts.align,
    bullet: opts.bullet ? { level: 0 } : undefined,
    pageBreakBefore: !!opts.pageBreakBefore,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 120, line: opts.line ?? 276 },
  });
}

function heading(text, level = HeadingLevel.HEADING_1, pageBreakBefore = false) {
  return para(text, {
    heading: level,
    pageBreakBefore,
    before: pageBreakBefore ? 0 : 160,
    after: 180,
    color: BLUE,
    bold: true,
    size: level === HeadingLevel.HEADING_1 ? 30 : 24,
  });
}

function cell(children, opts = {}) {
  const content = Array.isArray(children) ? children : [para(children, { after: 0 })];
  return new TableCell({
    children: content.length ? content : [para("", { after: 0 })],
    shading: opts.fill ? { fill: opts.fill } : undefined,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    borders: opts.noBorder
      ? { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }
      : { top: gridBorder, bottom: gridBorder, left: gridBorder, right: gridBorder },
  });
}

function table(rows, widths = []) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, r) => new TableRow({
      tableHeader: r === 0,
      children: row.map((value, c) => cell(value, { width: widths[c], fill: r === 0 ? LIGHT_BLUE : undefined })),
    })),
  });
}

function metaTable(meta) {
  const rows = [
    ["Дата", meta.date || ""],
    ["Ответственный сотрудник", meta.employee || ""],
    ["Организация", meta.organization || ""],
    ["Название объекта", meta.objectName || ""],
    ["ID", meta.id || ""],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) => new TableRow({
      children: [
        cell([para(k, { bold: true, after: 0 })], { width: 28, noBorder: true, fill: LIGHT_GREY }),
        cell([para(v || " ", { after: 0 })], { width: 72, noBorder: true }),
      ],
    })),
  });
}

function addSectionStart(children, data, section, isFirst) {
  children.push(heading(section.title, HeadingLevel.HEADING_1, !isFirst));
  children.push(metaTable(data.meta));
  children.push(para("", { after: 120 }));
}

function renderGeneral(children, section, data, isFirst) {
  addSectionStart(children, data, section, isFirst);
  children.push(para(data.meta.title || "Насосная установка пожаротушения", {
    bold: true,
    size: 28,
    color: BLUE,
    align: AlignmentType.CENTER,
    after: 80,
  }));
  if (data.meta.model) {
    children.push(para(data.meta.model, { bold: true, size: 24, align: AlignmentType.CENTER, after: 200 }));
  }
  children.push(table([
    ["Срок поставки", "Наименование", "Кол-во", "Розничная цена, USD с НДС"],
    [section.leadTime || "", section.itemName || "", section.quantity || "", section.price || ""],
  ], [24, 46, 10, 20]));

  for (const [title, value] of section.blocks || []) {
    children.push(heading(title, HeadingLevel.HEADING_2));
    if (Array.isArray(value)) {
      value.forEach((line) => children.push(para(line, { bullet: true, after: 70 })));
    } else {
      String(value).split(/\r?\n/).filter(Boolean).forEach((line) => children.push(para(line)));
    }
  }
}

function renderDesignation(children, section, data, isFirst) {
  addSectionStart(children, data, section, isFirst);
  if (section.formula) children.push(para(section.formula, { bold: true, size: 24, align: AlignmentType.CENTER, after: 220 }));
  if (section.parts?.length) {
    children.push(table([
      ["Позиция", "Значение", "Описание"],
      ...section.parts.map((p) => [p.part, p.value, p.description]),
    ], [16, 24, 60]));
  }
  for (const msg of section.important || []) {
    children.push(para([
      run("ВАЖНО: ", { bold: true, color: BLUE }),
      run(msg),
    ], { before: 180 }));
  }
}

function renderTechnical(children, section, data, isFirst) {
  addSectionStart(children, data, section, isFirst);
  if (data.meta.model) children.push(para("Артикул/Модель: " + data.meta.model, { bold: true, after: 180 }));
  for (const group of section.groups || []) {
    children.push(heading(group.name, HeadingLevel.HEADING_2));
    children.push(table([
      ["Параметр", "Значение"],
      ...group.rows,
    ], [58, 42]));
  }
}

function renderEquipment(children, section, data, isFirst) {
  addSectionStart(children, data, section, isFirst);
  if (data.meta.model) children.push(para("Модель: " + data.meta.model, { bold: true, after: 180 }));
  children.push(table([
    ["№", "Наименование", "Количество", "Примечание"],
    ...(section.items || []),
  ], [8, 58, 14, 20]));
}

function renderSimple(children, section, data, isFirst) {
  addSectionStart(children, data, section, isFirst);
  const rows = [
    ["Модель", section.model || data.meta.model || ""],
    ["Подзаголовок", section.caption || ""],
    ["Комментарий", section.comment || ""],
  ].filter((row) => row[1]);
  if (rows.length) {
    children.push(table([["Поле", "Значение"], ...rows], [28, 72]));
  }
}

const RENDERERS = {
  general: renderGeneral,
  designation: renderDesignation,
  technical: renderTechnical,
  equipment: renderEquipment,
};

export function buildFirePumpDocxDocument(data) {
  const children = [];
  data.sections.forEach((section, index) => {
    const render = RENDERERS[section.key] || renderSimple;
    render(children, section, data, index === 0);
  });

  return new Document({
    creator: "tkp-pdf-generator",
    title: data.meta.title || "ТКП",
    description: "ТКП насосной установки пожаротушения",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 20 },
          paragraph: { spacing: { line: 276, after: 120 } },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: 30, bold: true, color: BLUE },
          paragraph: { spacing: { before: 160, after: 180 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: 24, bold: true, color: BLUE },
          paragraph: { spacing: { before: 180, after: 100 } },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 900, right: 900, bottom: 900, left: 900 },
        },
      },
      children,
    }],
  });
}

export async function buildFirePumpDocx(data) {
  return Packer.toBlob(buildFirePumpDocxDocument(data));
}
