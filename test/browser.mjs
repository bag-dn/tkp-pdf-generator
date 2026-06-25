// End-to-end browser click-test (Playwright + cached chromium): serve the built
// dist, upload the generated templates, click Создать, capture the downloaded
// PDF, status text, console errors and a screenshot.
// Run: node test/browser.mjs
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import * as XLSX from "xlsx";
import { techTemplateWB, specTemplateWB } from "../src/parse/templates.js";

const here = dirname(fileURLToPath(import.meta.url));
const SP = process.env.SP || here;
const CHROME = join(homedir(), "AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe");
const URL_ = "http://localhost:4173/tkp-pdf-generator/";

const techPath = join(SP, "tpl_tech.xlsx");
const specPath = join(SP, "tpl_spec.xlsx");
writeFileSync(techPath, XLSX.write(techTemplateWB(), { type: "buffer", bookType: "xlsx" }));
writeFileSync(specPath, XLSX.write(specTemplateWB(), { type: "buffer", bookType: "xlsx" }));

const srv = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { cwd: join(here, ".."), shell: true });
const ready = async () => { for (let i = 0; i < 60; i++) { try { const r = await fetch(URL_); if (r.ok) return true; } catch {} await new Promise((s) => setTimeout(s, 500)); } return false; };

let code = 0;
try {
  if (!(await ready())) throw new Error("preview server did not start");
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.locator('[data-drop="tech"] input[type=file]').setInputFiles(techPath);
  await page.locator('[data-drop="spec"] input[type=file]').setInputFiles(specPath);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.click("#create"),
  ]);
  const dest = join(SP, "browser_out.pdf");
  await download.saveAs(dest);

  await page.waitForTimeout(300);
  const status = await page.locator("#status").innerText();
  await page.screenshot({ path: join(SP, "browser_page.png"), fullPage: true });

  console.log("DOWNLOAD:", download.suggestedFilename(), "->", dest);
  console.log("STATUS:", JSON.stringify(status));
  console.log("CONSOLE ERRORS:", errors.length ? errors : "none");
  await browser.close();
} catch (e) {
  console.error("TEST FAILED:", e.message);
  code = 1;
} finally {
  srv.kill();
}
process.exit(code);
