// Low-level text primitives on top of pdf-lib: color, measuring, word-wrap,
// and drawing a line with optional letter-spacing (tracking) and alignment.
import { rgb, setCharacterSpacing } from "pdf-lib";
import { fix } from "./fix.js";

export function hexRgb(hex) {
  const n = parseInt(hex, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// ascent (height above baseline) for positioning a line by its top edge
export function ascent(font, size) {
  return font.heightAtSize(size, { descender: false });
}

export function textWidth(font, text, size, tracking = 0) {
  const s = fix(text);
  if (!s) return 0;
  let w = font.widthOfTextAtSize(s, size);
  if (tracking) w += tracking * Math.max(0, [...s].length - 1);
  return w;
}

function breakWord(font, word, size, maxWidth) {
  const lines = [];
  let cur = "";
  for (const ch of word) {
    if (cur && font.widthOfTextAtSize(cur + ch, size) > maxWidth) { lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// greedy word-wrap; honours explicit \n; breaks over-long words by char.
export function wrapText(font, text, size, maxWidth) {
  const out = [];
  for (const para of fix(text).split("\n")) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      if (w === "") continue;
      const trial = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) { line = trial; continue; }
      if (line) { out.push(line); line = ""; }
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        const parts = breakWord(font, w, size, maxWidth);
        for (let i = 0; i < parts.length - 1; i++) out.push(parts[i]);
        line = parts[parts.length - 1];
      } else line = w;
    }
    out.push(line);
  }
  return out;
}

// draw a run at baseline (x,y); tracking uses the Tc operator so the run stays
// a single selectable string (copies as a word, not letter-by-letter).
export function drawRun(page, { x, y, text, font, size, color, tracking = 0 }) {
  const s = fix(text);
  if (!s) return;
  if (tracking > 0) {
    page.pushOperators(setCharacterSpacing(tracking));
    page.drawText(s, { x, y, size, font, color });
    page.pushOperators(setCharacterSpacing(0));
  } else {
    page.drawText(s, { x, y, size, font, color });
  }
}

// draw a single line within box [x, x+width] at baseline y, aligned
export function drawAligned(page, { text, x, y, width, font, size, color, align = "left", tracking = 0 }) {
  const w = textWidth(font, text, size, tracking);
  let dx = 0;
  if (align === "center") dx = (width - w) / 2;
  else if (align === "right") dx = width - w;
  drawRun(page, { x: x + Math.max(0, dx), y, text, font, size, color, tracking });
}
