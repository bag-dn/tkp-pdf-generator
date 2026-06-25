// Layout geometry, ported from the original docx engine.
// docx used twips (1/20 pt) and half-point font sizes; pdf-lib uses points.
//   pt = twips / 20 ;  fontPt = docxSize / 2
// This module is pure data + math (no pdf-lib import).

export const TW = (twips) => twips / 20; // twips -> points

// ---- page (A3 landscape: 420 x 297 mm) ----
export const PAGE_W = TW(23811); // 1190.55  (420 mm, horizontal)
export const PAGE_H = TW(16838); //  841.90  (297 mm, vertical)

// ---- margins ----
export const ML = TW(680);          // 34   left
export const MR = TW(680);          // 34   right
export const TOP = TW(1320);        // 66   top (body)
export const COVER_TOP = TW(720);   // 36   top (cover)
export const BOT = TW(1320);        // 66   bottom (body)
export const SCHEMA_BOT = TW(2560); // 128  bottom (schema page, room for Форма 1)

export const CW = PAGE_W - ML - MR; // 1122.55  content width
export const CONTENT_L = ML;
export const CONTENT_R = PAGE_W - MR;

// ---- ЕСКД page border (offset from page edge, thin line) ----
export const BORDER_INSET = 20;   // pt from each page edge (OOXML w:space, in points)
export const BORDER_W = 0.75;     // line width (docx size 6 = 6/8 pt)

// ---- colors (hex) ----
export const BLUE = "0029A5";
export const BLACK = "000000";
export const GREY = "808080";

// ---- font sizes (pt) ----
export const SZ = {
  body: 11,        // 22
  tech: 10.5,      // 21
  spec: 10,        // 20
  heading: 14,     // 28
  prose: 10.5,     // 21
  proseLine: TW(274), // 13.7  line height (lineRule atLeast)
  coverTitle: 16,  // 32
  coverTrack: TW(90), // 4.5  letter spacing on cover title
  headTrack: TW(24),  // 1.2  heading tracking
  descTrack: TW(22),  // 1.1
  header: 9,       // 18
  note: 9.5,       // 19
  notesLbl: 10,    // 20
  req0: 10,        // 20
  req: 8,          // 16
  coverField: 10.5,// 21
  reserve: 8,      // 16
  blockSub: 11,    // 22
  stampS: 7,       // 14
  stampM: 8,       // 16
  stamp18: 9,      // 18
};

// ---- table column widths (pt) ----
export const PC = [6200, 4900, 6200, 5151].map(TW);                       // tech (4 cols)
export const SC = [720, 9700, 3900, 3100, 1300, 1300, 2431].map(TW);      // spec (7 cols)
export const SPEC_CENTER = new Set([0, 4, 5]);                            // №, Ед.изм, Кол-во
export const SPEC_HEAD = ["№", "Наименование и техническая характеристика",
  "Тип, марка / обозначение", "Завод-изготовитель", "Ед. изм.", "Кол-во", "Примечание"];

// ---- ЕСКД stamps (right-aligned, total width 10300 twips = 515 pt) ----
export const STAMP_W = TW(10300);
export const F1 = [620, 680, 680, 950, 720, 1000, 3400, 750, 700, 800].map(TW); // Форма 1 (10 cols)
export const F1_ROWS = [11, 11, 11, 10, 11, 11, 11, 11, 11];                    // 9 rows (pt)
export const F2A = [620, 680, 680, 950, 720, 1000, 3950, 850, 850].map(TW);     // Форма 2а (9 cols)
export const F2A_ROW = TW(240);                                                 // 12 pt per row (2 rows)

// ---- cover ----
export const COVER_LOGO_W = 130;   // pt (docx 260 px ~ logo width)
export const LOGO_ASPECT = 399 / 938; // h/w of logo.png
export const COVER_HEAD_L = TW(7000); // left column (logo) of cover header table
export const COVER_FIELD_LBL = TW(3400);

// ---- schema image fit box (pt) — height-first, like the original ----
export const SCHEMA_MAX_W = 1380 * 72 / 96; // 1035 pt
export const SCHEMA_MAX_H = 770 * 72 / 96;  //  577.5 pt

// height-first fit preserving aspect ratio (ported from generator.js fitImage)
export function fitImage(iw, ih, maxW, maxH) {
  const aspect = iw / ih;
  let w = maxH * aspect, h = maxH;
  if (w > maxW) { w = maxW; h = maxW / aspect; }
  return { w, h };
}

// pad/truncate a row to exactly n string cells
export function padRow(r, n) {
  const a = (r || []).slice(0, n);
  while (a.length < n) a.push("");
  return a.map((x) => (x == null ? "" : String(x)));
}
