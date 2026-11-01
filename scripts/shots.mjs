// Before/after screenshots (playwright-core). Usage: node scripts/shots.mjs <baseUrl> <outDir> <prefix>
import fs from "fs"; import path from "path";
const [base = "http://localhost:3000", out = "shots", prefix = "after"] = process.argv.slice(2);
const pw = await import("playwright-core");
const tries = process.env.FAHEEM_CHROME ? [{ executablePath: process.env.FAHEEM_CHROME }] : [{ channel: "msedge" }, { channel: "chrome" }, {}];
let b; for (const o of tries) { try { b = await pw.chromium.launch({ headless: true, args: ["--no-sandbox"], ...o }); break; } catch {} }
if (!b) { console.error("no browser"); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const pages = (process.env.SHOT_PAGES || "/,/brains,/tools,/design,/memory,/skills,/meta,/agent").split(",");
const sizes = [[1440, 900, "1440"], [390, 844, "390"]];
for (const [w, h, tag] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: process.env.SHOT_RM ? "reduce" : "no-preference" });
  if (process.env.SHOT_PREFS) await ctx.addInitScript((p) => { try { localStorage.setItem("faheem-ai-prefs", p); } catch {} }, process.env.SHOT_PREFS);
  for (const u of pages) {
    const pg = await ctx.newPage();
    try { await pg.goto(base + u, { waitUntil: "networkidle", timeout: 45000 }); } catch { }
    await pg.waitForTimeout(1500);
    const name = `${prefix}-${(u === "/" ? "home" : u.slice(1).replace(/\//g, "-"))}-${tag}.png`;
    await pg.screenshot({ path: path.join(out, name) }); console.log(name); await pg.close();
  }
  await ctx.close();
}
await b.close();
