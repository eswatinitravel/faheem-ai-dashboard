// v3.16: Hey Puppy template ka puppy.html asli Chromium mein: 3D puppy render, 9 moods, orb avatar, bina JS error.
// node scripts/puppy-render-test.mjs  (FAHEEM_CHROME = chromium ka rasta, warna playwright ka default)
import fs from "fs"; import os from "os"; import path from "path";
const ROOT = process.env.FAHEEM_ROOT || process.cwd();
export async function puppyRenderTest({ browser } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "puppy-"));
  fs.cpSync(path.join(ROOT, "templates", "hey-puppy"), dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "node_modules"), { recursive: true });
  fs.symlinkSync(path.join(ROOT, "node_modules", "three"), path.join(dir, "node_modules", "three"));
  let own = null;
  if (!browser) { const pw = await import("playwright-core"); own = browser = await pw.chromium.launch({ headless: true, ...(process.env.FAHEEM_CHROME ? { executablePath: process.env.FAHEEM_CHROME } : {}), args: ["--no-sandbox", "--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }); }
  const pg = await browser.newPage({ viewport: { width: 220, height: 220 } }); const errs = [];
  pg.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
  try {
    await pg.goto("file://" + path.join(dir, "src", "puppy.html")); await pg.waitForFunction(() => window.puppy, null, { timeout: 15000 });
    const moods = await pg.evaluate(() => window.puppy.MOODS);
    const seen = [];
    for (const m of moods) { await pg.evaluate((m) => window.puppy.setMood(m), m); await pg.waitForTimeout(120); seen.push(await pg.evaluate(() => document.body.dataset.mood)); }
    await pg.evaluate(() => window.puppy.setState({ mode: "walk", dir: 1 })); await pg.waitForTimeout(150);
    const pixels = await pg.evaluate(() => { const c = document.querySelector("canvas"); const g = document.createElement("canvas"); g.width = c.width; g.height = c.height; const x = g.getContext("2d"); x.drawImage(c, 0, 0); const d = x.getImageData(0, 0, g.width, g.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
    await pg.evaluate(() => window.puppy.setAvatar("orb")); await pg.waitForTimeout(120);
    const avatar = await pg.evaluate(() => window.puppy.avatar);
    return { ok: !errs.length && pixels > 500 && seen.join() === moods.join() && avatar === "orb", moods: seen, pixels, avatar, errors: errs };
  } finally { await pg.close(); if (own) await own.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}
if (process.argv[1] && process.argv[1].endsWith("puppy-render-test.mjs")) console.log(JSON.stringify(await puppyRenderTest()));
