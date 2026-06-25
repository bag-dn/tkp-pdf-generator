// Page + vertical-cursor manager. Coordinates are pdf-lib (origin bottom-left);
// `y` is the top of the next content line and decreases as content is added.
// Each section starts on a fresh page; a page's footer type / margins are fixed
// by the section that owns it (so overflow pages inherit the same footer).
// Borders, header and footers are drawn in a finalize pass (see build.js),
// after the total page count is known — no second layout pass.
import { PAGE_W, PAGE_H } from "./layout.js";

export class Doc {
  constructor(pdfDoc, font, logo) {
    this.pdf = pdfDoc;
    this.font = font;
    this.logo = logo;
    this.pages = []; // [{ page, footer, topMargin, bottomLimit }]
    this.cur = null;
    this.y = 0;
  }

  newPage({ footer, top, bottom }) {
    const page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.cur = { page, footer, topMargin: top, bottomLimit: bottom };
    this.pages.push(this.cur);
    this.y = PAGE_H - top;
    return this.cur;
  }

  // continue the current section on a new page (same footer/margins)
  carry() {
    return this.newPage({
      footer: this.cur.footer,
      top: this.cur.topMargin,
      bottom: this.cur.bottomLimit,
    });
  }

  get page() { return this.cur.page; }
  space() { return this.y - this.cur.bottomLimit; }
  ensure(h) { if (this.space() < h) this.carry(); }
  moveDown(h) { this.y -= h; }
}
