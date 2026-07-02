import * as XLSX from "xlsx";
import { blankRow, cellToStr, findRow, norm, sheetRows } from "./excelHelpers.js";

const today = new Date();
const pad = (n) => String(n).padStart(2, "0");
const defaultDate = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear()} г.`;

export const FIRE_PUMP_SECTION_DEFS = [
  { key: "general", title: "Общая информация", names: ["общ"] },
  { key: "designation", title: "Условное обозначение", names: ["услов", "обознач"] },
  { key: "technical", title: "Технические характеристики", names: ["тех"] },
  { key: "equipment", title: "Комплектация", names: ["комплект"] },
  { key: "hydraulicSystem", title: "Гидравлические характеристики установки", names: ["гидрав", "установ"] },
  { key: "hydraulicPump", title: "Гидравлические характеристики насоса", names: ["гидрав", "насос"] },
  { key: "dimensions", title: "Размеры", names: ["размер"] },
  { key: "hydraulicScheme", title: "Гидравлическая схема", names: ["схем"] },
  { key: "certificate", title: "Сертификат соответствия", names: ["сертифик"] },
];

const BASE_META = {
  title: "Насосная установка пожаротушения DN.ru",
  model: "PFFS2CDM10-2DS16S",
  date: defaultDate,
  employee: "",
  organization: "",
  objectName: "",
  id: "",
};

const GENERAL_TEXT = {
  description:
    "Насосная установка пожаротушения PFFS предназначена для противопожарного водоснабжения внутреннего противопожарного водопровода и подачи воды для пожаротушения в жилых, офисных, производственных и административных зданиях.",
  pump:
    "В качестве насосов в установке используются вертикальные многоступенчатые насосы серии CDM, CDMF. Проточная часть насосов выполнена из нержавеющей стали, основание с напорным и всасывающим патрубками может быть изготовлено из нержавеющей стали или чугуна.",
  motor:
    "В качестве привода в насосах серии CDM/CDMF используется асинхронный электродвигатель класса энергоэффективности IE3 типа TEFC.",
  automation:
    "Шкаф управления универсальный, для дренчерной и спринклерной системы пожаротушения. По умолчанию предусмотрены АВР, УПП для насосов от 30 кВт, питание жокей-насоса и контроль состояния установки.",
  control:
    "контроль положения ручных задвижек\nконтроль целостности линий связи с исполнительными устройствами\nконтроль качества электропитания шкафа и защиту от нештатных ситуаций\nконтроль сухого хода и параметров работы насосов\nавтоматическое включение установки при устранении неисправностей\nиндикация состояний системы и передача сигналов на внешние устройства",
  drencher:
    "В дренчерной системе при подаче сигнала «ПОЖАР» выполняется проверка давления перед насосами и в системе, после чего запускается основной насос. Если основной насос не вышел на режим, запускается резервный насос.",
  sprinkler:
    "В спринклерной системе в дежурном режиме работает жокей-насос по датчику давления. При сигнале «ПОЖАР» или падении давления работа жокей-насоса блокируется и запускается основной насос.",
};

const EQUIPMENT_ROWS = [
  ["1", "Насос вертикальный многоступенчатый CDM10-2", "2", "1 раб. + 1 рез."],
  ["2", "Реле сухого хода", "2", ""],
  ["3", "Коллектор всасывающий", "1", ""],
  ["4", "Рама основание", "1", ""],
  ["5", "Обратный клапан", "2", ""],
  ["6", "Реле работы насоса", "1", ""],
  ["7", "Поворотный затвор с концевым выключателем", "6", ""],
  ["8", "Манометр", "5", ""],
  ["9", "Шаровый кран", "4", ""],
  ["10", "Коллектор напорный", "1", ""],
  ["11", "Реле давления", "2", ""],
  ["12", "Шкаф управления ШУПН-3", "1", ""],
];

function setCols(ws, widths) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
  return ws;
}

function append(wb, name, rows, widths) {
  XLSX.utils.book_append_sheet(wb, setCols(XLSX.utils.aoa_to_sheet(rows), widths), name);
}

export function firePumpTemplateWB() {
  const wb = XLSX.utils.book_new();

  append(wb, "Общая информация", [
    ["Поле", "Значение"],
    ["Генерировать секцию", "да"],
    ["Название ТКП", BASE_META.title],
    ["Модель", BASE_META.model],
    ["Дата", defaultDate],
    ["Ответственный сотрудник", ""],
    ["Организация", ""],
    ["Название объекта", ""],
    ["ID", ""],
    ["Срок поставки", "1-6 нед. (перед заказом уточнить)"],
    ["Наименование", "Установка пожаротушения Aikon PFFS2CDM10-2DS16S"],
    ["Кол-во", "1"],
    ["Розничная цена, USD с НДС", "12799.00"],
    ["Описание", GENERAL_TEXT.description],
    ["Особенности насоса", GENERAL_TEXT.pump],
    ["Особенности электродвигателя", GENERAL_TEXT.motor],
    ["Функции автоматики", GENERAL_TEXT.automation],
    ["ШУПН обеспечивает", GENERAL_TEXT.control],
    ["Дренчерная система", GENERAL_TEXT.drencher],
    ["Спринклерная система", GENERAL_TEXT.sprinkler],
  ], [34, 88]);

  append(wb, "Условное обозначение", [
    ["Поле", "Значение", "Описание"],
    ["Генерировать секцию", "да", ""],
    ["Формула", "PFFS [1] 2[2] CDM10-2[3] DS[4] 16[5] S[6]", ""],
    ["", "", ""],
    ["Позиция", "Значение", "Описание"],
    ["[1]", "PFFS", "Тип установки: насосная установка пожаротушения (Pumping Fire Fighting System)"],
    ["[2]", "2", "Количество насосов"],
    ["[3]", "CDM10-2", "Модель насоса"],
    ["[4]", "DS", "Тип системы пожаротушения: D - дренчерная; S - спринклерная; DS - универсальная"],
    ["[5]", "16", "Максимальное давление установки: 16 бар"],
    ["[6]", "S", "Исполнение установки: S - стандартное; C - нестандартное"],
    ["Важно", "Отгрузка установок пожаротушения Aikon PFFS осуществляется с производственной площадки Есипово или Челябинск. Базис поставки уточняется при размещении оборудования в производство.", ""],
  ], [18, 34, 76]);

  append(wb, "Технические характеристики", [
    ["Генерировать секцию", "да", ""],
    ["Группа", "Параметр", "Значение"],
    ["Характеристики станции", "Бренд", "CNP-AIKON"],
    ["Характеристики станции", "Максимальное давление", "16 бар"],
    ["Характеристики станции", "Мин. темп-ра жидкости", "5˚С"],
    ["Характеристики станции", "Макс. темп-ра жидкости", "70 ˚С"],
    ["Характеристики станции", "Макс. наружная темп-ра", "40˚С"],
    ["Характеристики станции", "Степень защиты", "IP55"],
    ["Характеристики станции", "Частота вращения", "2900 об/мин"],
    ["Характеристики станции", "Ном. мощность", "2x0.75 кВт"],
    ["Характеристики станции", "Ном. мощность насоса", "0.75 кВт"],
    ["Характеристики станции", "Номинальный ток", "0 А"],
    ["Характеристики станции", "Напряжение", "3х380В"],
    ["Требуемые характеристики", "Подача", "10.0 м3/ч"],
    ["Требуемые характеристики", "Напор", "16.5 м"],
    ["Требуемые характеристики", "Подпор", "16.5 м"],
    ["Требуемые характеристики", "Жидкость", "Вода"],
    ["Требуемые характеристики", "Температура жидкости", "20˚С"],
    ["Требуемые характеристики", "Плотность", "998.19 кг/м3"],
    ["Требуемые характеристики", "Кинематическая вязкость", "1.0004 мм2/с"],
    ["Другие параметры", "Соединение", "DN80"],
    ["Другие параметры", "Масса", "0"],
    ["Другие параметры", "Длина комплектн. кабеля", "5 м"],
    ["Другие параметры", "Габаритные размеры", "-"],
  ], [30, 42, 42]);

  append(wb, "Комплектация", [
    ["Генерировать секцию", "да", "", ""],
    ["№", "Наименование", "Количество", "Примечание"],
    ...EQUIPMENT_ROWS,
  ], [8, 62, 16, 24]);

  appendSimpleSection(wb, "Гидравлика установки", BASE_META.model, "Графические характеристики установки согласно ISO9906:2012, класс 3B");
  appendSimpleSection(wb, "Гидравлика насоса", "CDM10-2", "Графические характеристики насоса согласно ISO9906:2012, класс 3B");
  appendSimpleSection(wb, "Размеры", "CDM10-2", "Габаритно-присоединительные размеры");
  appendSimpleSection(wb, "Гидравлическая схема", "CDM10-2", "Принципиальная гидравлическая схема");
  appendSimpleSection(wb, "Сертификат соответствия", "", "");

  return wb;
}

function appendSimpleSection(wb, name, model, caption) {
  append(wb, name, [
    ["Поле", "Значение"],
    ["Генерировать секцию", "да"],
    ["Модель", model],
    ["Подзаголовок", caption],
    ["Комментарий", ""],
  ], [32, 82]);
}

function download(wb, filename) {
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const downloadFirePumpTemplate = () => download(firePumpTemplateWB(), "shablon_tkp_pozharnaya_nasosnaya_ustanovka.xlsx");

function valueBeside(rows, ...needles) {
  for (const row of rows) {
    const label = norm(row[0]);
    if (!label || !needles.some((n) => label.includes(n))) continue;
    for (let c = 1; c < row.length; c++) {
      const v = cellToStr(row[c]);
      if (v) return v;
    }
  }
  return "";
}

function truthySection(rows) {
  const v = norm(valueBeside(rows, "генерировать"));
  if (!v) return true;
  return !["нет", "no", "n", "false", "0", "-"].includes(v);
}

function meaningful(rows) {
  return rows.some((row) => {
    const first = norm(row[0]);
    if (!first || first.includes("генерировать") || first === "поле") return false;
    return row.some((cell) => cellToStr(cell) !== "");
  });
}

function findSheet(wb, def) {
  return (wb.SheetNames || []).find((name) => {
    const n = norm(name);
    return def.names.every((needle) => n.includes(needle));
  });
}

function splitLines(value) {
  return cellToStr(value).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function parseGeneral(rows) {
  const meta = {
    title: valueBeside(rows, "название ткп") || BASE_META.title,
    model: valueBeside(rows, "модель") || BASE_META.model,
    date: valueBeside(rows, "дата") || defaultDate,
    employee: valueBeside(rows, "ответственный"),
    organization: valueBeside(rows, "организация"),
    objectName: valueBeside(rows, "название объекта", "объект"),
    id: valueBeside(rows, "id"),
  };

  return {
    key: "general",
    title: "Общая информация",
    meta,
    leadTime: valueBeside(rows, "срок поставки"),
    itemName: valueBeside(rows, "наименование"),
    quantity: valueBeside(rows, "кол"),
    price: valueBeside(rows, "розничная", "цена"),
    blocks: [
      ["ОПИСАНИЕ", valueBeside(rows, "описание")],
      ["ОСОБЕННОСТИ НАСОСА", valueBeside(rows, "особенности насоса")],
      ["ОСОБЕННОСТИ ЭЛЕКТРОДВИГАТЕЛЯ", valueBeside(rows, "особенности электродвигателя")],
      ["ФУНКЦИИ АВТОМАТИКИ", valueBeside(rows, "функции автоматики")],
      ["ШУПН обеспечивает", splitLines(valueBeside(rows, "шупн"))],
      ["Дренчерная система", valueBeside(rows, "дренчер")],
      ["Спринклерная система", valueBeside(rows, "спринклер")],
    ].filter(([, v]) => Array.isArray(v) ? v.length : cellToStr(v)),
  };
}

function parseDesignation(rows) {
  const start = findRow(rows, (n) => n.includes("позиция") && n.includes("значение"));
  const parts = [];
  const important = [];
  for (let i = start >= 0 ? start + 1 : 0; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blankRow(row)) continue;
    const first = cellToStr(row[0]);
    const n = norm(first);
    if (n.includes("генерировать") || n === "поле" || n === "формула") continue;
    if (n.includes("важно")) {
      const msg = cellToStr(row[1]) || cellToStr(row[2]);
      if (msg) important.push(msg);
      continue;
    }
    const value = cellToStr(row[1]);
    const description = cellToStr(row[2]);
    if (first || value || description) parts.push({ part: first, value, description });
  }
  return {
    key: "designation",
    title: "Условное обозначение",
    formula: valueBeside(rows, "формула"),
    parts,
    important,
  };
}

function parseTechnical(rows) {
  const start = findRow(rows, (n) => n.includes("группа") && n.includes("параметр"));
  const groups = [];
  const byName = new Map();
  for (let i = start >= 0 ? start + 1 : 0; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blankRow(row)) continue;
    const group = cellToStr(row[0]) || "Параметры";
    const label = cellToStr(row[1]);
    const value = cellToStr(row[2]);
    if (!label && !value) continue;
    if (!byName.has(group)) {
      const g = { name: group, rows: [] };
      byName.set(group, g);
      groups.push(g);
    }
    byName.get(group).rows.push([label, value]);
  }
  return { key: "technical", title: "Технические характеристики", groups };
}

function parseEquipment(rows) {
  const start = findRow(rows, (n, raw) => raw.some((c) => String(c ?? "").includes("№")) && n.includes("наименование"));
  const items = [];
  for (let i = start >= 0 ? start + 1 : 0; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blankRow(row)) continue;
    const item = [0, 1, 2, 3].map((idx) => cellToStr(row[idx]));
    if (item.some(Boolean)) items.push(item);
  }
  return { key: "equipment", title: "Комплектация", items };
}

function parseSimple(rows, def) {
  return {
    key: def.key,
    title: def.title,
    model: valueBeside(rows, "модель"),
    caption: valueBeside(rows, "подзаголовок"),
    comment: valueBeside(rows, "комментарий", "примечание"),
  };
}

function sectionHasContent(section) {
  if (!section) return false;
  if (section.key === "general") return !!(section.itemName || section.leadTime || section.price || section.blocks.length);
  if (section.key === "designation") return !!(section.formula || section.parts.length || section.important.length);
  if (section.key === "technical") return section.groups.some((g) => g.rows.length);
  if (section.key === "equipment") return section.items.length > 0;
  return !!(section.model || section.caption || section.comment);
}

export function parseFirePump(wb) {
  const sections = [];
  const warnings = [];
  let meta = { ...BASE_META };

  for (const def of FIRE_PUMP_SECTION_DEFS) {
    const sheetName = findSheet(wb, def);
    if (!sheetName) continue;
    const rows = sheetRows(wb.Sheets[sheetName]);
    if (!truthySection(rows)) continue;
    if (!meaningful(rows)) continue;

    let section;
    if (def.key === "general") section = parseGeneral(rows);
    else if (def.key === "designation") section = parseDesignation(rows);
    else if (def.key === "technical") section = parseTechnical(rows);
    else if (def.key === "equipment") section = parseEquipment(rows);
    else section = parseSimple(rows, def);

    if (!sectionHasContent(section)) {
      warnings.push(`Лист «${sheetName}»: секция пустая и пропущена.`);
      continue;
    }
    if (section.meta) meta = { ...meta, ...section.meta };
    sections.push(section);
  }

  const errors = [];
  if (!sections.length) errors.push("В Excel не найдено ни одной заполненной секции для генерации.");
  return { data: { meta, sections }, warnings, errors };
}
