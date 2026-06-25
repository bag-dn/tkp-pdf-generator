// Render one page and crop its bottom-right stamp region.
// node test/crop.mjs <pdf> <pageNum> <outPng> [scale] [cropW_pt] [cropH_pt]
import { readFileSync, writeFileSync } from "node:fs";
import { createCanvas, DOMMatrix, Path2D, ImageData } from "@napi-rs/canvas";
globalThis.DOMMatrix ??= DOMMatrix; globalThis.Path2D ??= Path2D; globalThis.ImageData ??= ImageData;

const [pdfPath, pageNum, outPng, scaleArg, cw, ch] = process.argv.slice(2);
const scale = Number(scaleArg || 4);
const cropW = Number(cw || 560), cropH = Number(ch || 160);

class F { create(w, h) { const c = createCanvas(w, h); return { canvas: c, context: c.getContext("2d") }; } reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; } destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; } }

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(pdfPath)), canvasFactory: new F() }).promise;
const page = await doc.getPage(Number(pageNum));
const vp = page.getViewport({ scale });
const canvas = createCanvas(vp.width, vp.height);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, vp.width, vp.height);
await page.render({ canvasContext: ctx, viewport: vp }).promise;

const cwPx = Math.round(cropW * scale), chPx = Math.round(cropH * scale);
const sx = Math.round(vp.width - cwPx - 20 * scale), sy = Math.round(vp.height - chPx - 18 * scale);
const crop = createCanvas(cwPx, chPx);
crop.getContext("2d").drawImage(canvas, sx, sy, cwPx, chPx, 0, 0, cwPx, chPx);
writeFileSync(outPng, await crop.encode("png"));
console.log("wrote", outPng, `${cwPx}x${chPx}`);
