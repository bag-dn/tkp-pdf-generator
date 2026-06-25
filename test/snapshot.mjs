// Render PDF pages to PNG (Node) for visual QA. Run: node test/snapshot.mjs <pdf> <outDir> [scale]
import { readFileSync, writeFileSync } from "node:fs";
import { createCanvas, DOMMatrix, Path2D, ImageData } from "@napi-rs/canvas";

globalThis.DOMMatrix ??= DOMMatrix;
globalThis.Path2D ??= Path2D;
globalThis.ImageData ??= ImageData;

const pdfPath = process.argv[2];
const outDir = process.argv[3];
const scale = Number(process.argv[4] || 1.4);

class NodeCanvasFactory {
  create(w, h) { const canvas = createCanvas(w, h); return { canvas, context: canvas.getContext("2d") }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const data = new Uint8Array(readFileSync(pdfPath));
const doc = await pdfjs.getDocument({
  data, useWorkerFetch: false, isEvalSupported: false,
  canvasFactory: new NodeCanvasFactory(),
}).promise;

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const vp = page.getViewport({ scale });
  const canvas = createCanvas(vp.width, vp.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, vp.width, vp.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const png = await canvas.encode("png");
  const f = `${outDir}/page${i}.png`;
  writeFileSync(f, png);
  console.log("wrote", f, `${vp.width.toFixed(0)}x${vp.height.toFixed(0)}`);
}
