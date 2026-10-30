// v3.11 Playwright check (Microsoft Playwright, Apache-2.0). playwright-core sirf library hai (browser download nahi):
// Windows par pehle se mojood Microsoft Edge (channel "msedge") ya Chrome istemal hota hai.
// Asli browser mein page kholta hai, console/JS ghaltiyan + toote requests pakarta hai, buttons dabata hai, screenshot Gallery mein.
import fs from "fs";
import path from "path";
import { galleryDir, safeName } from "./gallery.js";

async function loadPw() {
  try { return await import("playwright-core"); } catch { return null; }
}

async function launch(pw) {
  const tries = [];
  if (process.env.FAHEEM_CHROME) tries.push({ executablePath: process.env.FAHEEM_CHROME, label: "FAHEEM_CHROME" });
  tries.push({ channel: "msedge", label: "Microsoft Edge" }, { channel: "chrome", label: "Google Chrome" }, { label: "Playwright Chromium" });
  const errs = [];
  for (const t of tries) {
    const { label, ...opt } = t;
    try {
      const b = await pw.chromium.launch({ headless: true, timeout: 20000, args: ["--no-sandbox", "--disable-gpu"], ...opt });
      return { browser: b, label };
    } catch (e) { errs.push(`${label}: ${String(e.message).split("\n")[0].slice(0, 90)}`); }
  }
  return { error: errs.join(" | ") };
}

export async function playwrightAvailable() {
  const pw = await loadPw();
  return { library: !!pw, version: pw ? "1.64.1" : null };
}

export async function playwrightCheck({ url, html, maxClicks = 15, screenshot = true } = {}) {
  const t0 = Date.now();
  if (!url && !html) return { ok: false, error: "URL ya HTML dein" };
  if (url && !/^https?:\/\//i.test(url)) return { ok: false, error: "Sirf http:// ya https:// URL" };
  const pw = await loadPw();
  if (!pw) return { ok: false, available: false, error: "playwright-core install nahi. Dashboard folder mein: npm install" };
  const L = await launch(pw);
  if (!L.browser) return { ok: false, available: false, error: "Koi browser nahi khula. Windows par Microsoft Edge hota hai; warna: npx playwright install chromium. (" + L.error + ")" };
  const errors = [], failed = [], consoleErr = [];
  let title = "", buttons = 0, clicked = 0, shot = null;
  try {
    const ctx = await L.browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on("pageerror", (e) => errors.push(String(e.message || e).slice(0, 200)));
    page.on("console", (m) => { if (m.type() === "error") consoleErr.push(m.text().slice(0, 200)); });
    page.on("requestfailed", (r) => failed.push(`${r.failure()?.errorText || "fail"} · ${r.url().slice(0, 120)}`));
    page.on("response", (r) => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} · ${r.url().slice(0, 120)}`); });
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    if (url) await page.goto(url, { waitUntil: "load", timeout: 30000 });
    else await page.setContent(String(html), { waitUntil: "load", timeout: 20000 });
    title = await page.title().catch(() => "");
    const btns = page.locator("button:visible, [role=button]:visible, input[type=submit]:visible");
    buttons = await btns.count();
    const startUrl = page.url();
    for (let i = 0; i < Math.min(buttons, maxClicks); i++) {
      try { await btns.nth(i).click({ timeout: 3000, noWaitAfter: true }); clicked++; await page.waitForTimeout(150); } catch {}
      if (page.url() !== startUrl) { await page.goBack().catch(() => {}); }
    }
    if (screenshot) {
      fs.mkdirSync(galleryDir(), { recursive: true });
      const name = safeName("playwright-check.png");
      await page.screenshot({ path: path.join(galleryDir(), name), fullPage: false });
      shot = { name, url: `/api/gallery?file=${encodeURIComponent(name)}` };
    }
    await ctx.close();
  } catch (e) {
    errors.push("Page nahi khula: " + String(e.message).split("\n")[0].slice(0, 160));
  } finally { await L.browser.close().catch(() => {}); }
  const all = [...errors, ...consoleErr];
  return { ok: all.length === 0 && failed.length === 0, available: true, browser: L.label, title, buttons, clicked, errors: all.slice(0, 30), failed: [...new Set(failed)].slice(0, 30), screenshot: shot, ms: Date.now() - t0 };
}
