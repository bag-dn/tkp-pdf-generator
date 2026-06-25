// Generate the downloadable .xlsx templates (filled with example rows so the
// structure is self-explanatory) and trigger a browser download.
import * as XLSX from "xlsx";

export function techTemplateWB() {
  const meta = [
    ["Поле", "Значение"],
    ["Обозначение", "DNHP 26.004.00.00.000"],
    ["Наименование изделия", "Пункт тепловой индивидуальный (ПТИ)"],
    ["Заказчик", "—"],
    ["Разработал", "Старовойтов"],
    ["Стадия", "П"],
    ["Дата (обложка)", "26.05.2026"],
    ["Дата (штамп)", "26.05.26"],
    ["Объект — полное название", "Многоквартирный дом с помещениями общественного назначения"],
    ["Объект в штампе — строка 1", "Многоквартирный дом"],
    ["Объект в штампе — строка 2", "в г.Нижний Новгород"],
    ["Листов", ""],
    ["Примечание 1", "Теплоизоляция и межблочные соединения в комплект поставки не входят."],
    ["Примечание 2", "Расположение сливных кранов и воздушников уточняется при разработке КД."],
  ];
  const tech = [
    ["Параметр", "Значение", "Параметр", "Значение"],
    ["Габаритные размеры, предварительно (ДхШхВ)", "—", "Расположение сторон обслуживания", "—"],
    ["Масса ПТИ в сборе", "—", "Теплоноситель", "вода"],
    ["Присоединение трубопровода ТС", "—", "Теплоноситель первичный", "—"],
    ["Присоединение трубопроводов потребителей", "—", "Теплоноситель вторичный", "—"],
    ["Сторона подключения теплоисточника", "—", "Климатические условия", "УХЛ1 по ГОСТ 15150"],
    ["Количество сторон обслуживания", "—", "Мощность, кВт", "—"],
  ];
  const wb = XLSX.utils.book_new();
  const sMeta = XLSX.utils.aoa_to_sheet(meta);
  sMeta["!cols"] = [{ wch: 32 }, { wch: 60 }];
  const sTech = XLSX.utils.aoa_to_sheet(tech);
  sTech["!cols"] = [{ wch: 42 }, { wch: 26 }, { wch: 42 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, sMeta, "Метаданные");
  XLSX.utils.book_append_sheet(wb, sTech, "Тех. характеристики");
  return wb;
}

const SPEC_HEADER = ["№", "Наименование и техническая характеристика", "Тип, марка / обозначение", "Завод-изготовитель", "Ед. изм.", "Кол-во", "Примечание"];

function specSheet(sub, desig, rows) {
  const aoa = [["Подзаголовок:", sub], ["Обозначение:", desig], [], SPEC_HEADER, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 5 }, { wch: 52 }, { wch: 22 }, { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 16 }];
  return ws;
}

export function specTemplateWB() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, specSheet("2.1 Блок ввода и учёта тепловой энергии", "DNHP 26.004.00.01.000", [
    ["1", "Кран шаровый LD КШЦФ из стали 20 Ду80 Ру16,0МПа (ф/ф)", "", "LD", "шт.", "2", ""],
    ["2", "Фильтр сетчатый фланцевый, Ду80, PN16", "", "DN.ru", "шт.", "2", ""],
    ["3", "Термометр биметаллический O80мм 160С, L=64мм", "кл. точн. 1.5, IP54", "РОСМА", "шт.", "2", ""],
  ]), "Блок 2.1");
  XLSX.utils.book_append_sheet(wb, specSheet("2.2 Блок системы отопления", "DNHP 26.004.00.02.000", [
    ["1", "Насос циркуляционный", "", "Wilo", "шт.", "2", ""],
    ["2", "Клапан балансировочный Ду50", "", "DN.ru", "шт.", "1", ""],
  ]), "Блок 2.2");
  return wb;
}

function download(wb, filename) {
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const downloadTechTemplate = () => download(techTemplateWB(), "shablon_teh_harakteristik.xlsx");
export const downloadSpecTemplate = () => download(specTemplateWB(), "shablon_specifikaciy.xlsx");
