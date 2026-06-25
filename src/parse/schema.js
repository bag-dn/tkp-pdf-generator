// Normalize an uploaded schema (.png/.jpg/.svg/.pdf) to bytes pdf-lib can embed.
// Raster passes through; SVG and PDF are rasterized to PNG in-browser.
// Returns { bytes, kind: 'png'|'jpg', w?, h?, numPages? } | null.
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const ext = (name) => (name.split(".").pop() || "").toLowerCase();

function canvasToPngBytes(canvas) {
  return new Promise((resolve) =>
    canvas.toBlob(async (b) => resolve(new Uint8Array(await b.arrayBuffer())), "image/png")
  );
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("не удалось декодировать"));
    img.src = url;
  });
}

async function svgToPng(file) {
  const text = await file.text();
  let w = 1380, h = 770;
  const vb = text.match(/viewBox\s*=\s*["']\s*([\d.+-]+)[\s,]+([\d.+-]+)[\s,]+([\d.+-]+)[\s,]+([\d.+-]+)/i);
  if (vb) { w = parseFloat(vb[3]); h = parseFloat(vb[4]); }
  else {
    const mw = text.match(/\bwidth\s*=\s*["']?([\d.]+)/i);
    const mh = text.match(/\bheight\s*=\s*["']?([\d.]+)/i);
    if (mw && mh) { w = parseFloat(mw[1]); h = parseFloat(mh[1]); }
  }
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    const img = await loadImage(url);
    const scale = Math.min(3, 2400 / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    return { bytes: await canvasToPngBytes(canvas), kind: "png", w: cw, h: ch };
  } finally { URL.revokeObjectURL(url); }
}

async function pdfToPng(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, 2400 / Math.max(base.width, base.height));
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return { bytes: await canvasToPngBytes(canvas), kind: "png", w: canvas.width, h: canvas.height, numPages: doc.numPages };
}

export async function toRaster(file) {
  if (!file) return null;
  const e = ext(file.name);
  if (e === "png") return { bytes: new Uint8Array(await file.arrayBuffer()), kind: "png" };
  if (e === "jpg" || e === "jpeg") return { bytes: new Uint8Array(await file.arrayBuffer()), kind: "jpg" };
  if (e === "svg") return await svgToPng(file);
  if (e === "pdf") return await pdfToPng(file);
  throw new Error("неподдерживаемый формат (." + e + ")");
}
