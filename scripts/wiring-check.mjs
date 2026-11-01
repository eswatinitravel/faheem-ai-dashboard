// v3.15 Wiring guard: records every page route, API route (+methods), link, button, form, data-* hook and test name.
// node scripts/wiring-check.mjs --save   -> writes scripts/wiring-baseline.json
// node scripts/wiring-check.mjs          -> exits 1 if anything from the baseline is missing (additions are fine)
import fs from "fs"; import path from "path";
const ROOT = process.env.FAHEEM_ROOT || process.cwd();
const walk = (d, out = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!/node_modules|\.next|uupm[\\/]data/.test(p)) walk(p, out); } else out.push(p); } return out; };
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
export function inventory() {
  const inv = { pages: [], api: [], links: [], buttons: [], forms: [], hooks: [], handlers: [], tests: [] };
  const appFiles = walk(path.join(ROOT, "app")).filter((f) => /\.(js|jsx)$/.test(f));
  for (const f of appFiles) {
    const r = rel(f), src = fs.readFileSync(f, "utf8");
    if (/\/page\.js$/.test(r)) inv.pages.push("/" + r.replace(/^app\//, "").replace(/\/?page\.js$/, ""));
    if (/\/route\.js$/.test(r)) { const m = [...src.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|DELETE|PATCH)\b/g)].map((x) => x[1]); for (const x of new Set(m)) inv.api.push(`${x} /${r.replace(/^app\//, "").replace(/\/route\.js$/, "")}`); }
    for (const m of src.matchAll(/href=\{?["'`]([^"'`{}]+)["'`]/g)) inv.links.push(`${r} -> ${m[1]}`);
    const nb = (src.match(/<button\b/g) || []).length; if (nb) inv.buttons.push(`${r} x${nb}`);
    const nf = (src.match(/<form\b/g) || []).length; if (nf) inv.forms.push(`${r} x${nf}`);
    for (const m of src.matchAll(/\b(data-[a-z0-9-]+)=/g)) inv.hooks.push(`${r} ${m[1]}`);
    for (const m of src.matchAll(/aria-label=["']([^"']+)["']/g)) inv.hooks.push(`${r} aria:${m[1]}`);
    for (const m of src.matchAll(/on(?:Click|Submit|Change)=\{\s*([A-Za-z_$][\w$]*)\s*\}/g)) inv.handlers.push(`${r} ${m[1]}`);
  }
  const tf = path.join(ROOT, "scripts", "full-test.mjs");
  if (fs.existsSync(tf)) { const src = fs.readFileSync(tf, "utf8"); for (const m of src.matchAll(/await t\(\s*(["'`])((?:(?!\1).)+)\1/g)) inv.tests.push(m[2]); }
  for (const k of Object.keys(inv)) inv[k] = [...new Set(inv[k])].sort();
  return inv;
}
// buttons/forms "file xN": count may grow, not shrink.
const countOk = (base, now) => { const m = base.match(/^(.*) x(\d+)$/); const f = now.find((n) => n.startsWith(m[1] + " x")); return f && Number(f.split(" x").pop()) >= Number(m[2]); };
export function compare(base, now) {
  const missing = [];
  for (const k of Object.keys(base)) for (const v of base[k]) {
    const ok = k === "buttons" || k === "forms" ? countOk(v, now[k] || []) : (now[k] || []).includes(v);
    if (!ok) missing.push(`${k}: ${v}`);
  }
  return missing;
}
if (process.argv[1] && process.argv[1].endsWith("wiring-check.mjs")) {
  const BF = path.join(ROOT, "scripts", "wiring-baseline.json"); const now = inventory();
  if (process.argv.includes("--save")) { fs.writeFileSync(BF, JSON.stringify(now, null, 1)); console.log("saved", Object.entries(now).map(([k, v]) => `${k}=${v.length}`).join(" ")); process.exit(0); }
  const base = JSON.parse(fs.readFileSync(BF, "utf8")); const miss = compare(base, now);
  console.log(Object.entries(now).map(([k, v]) => `${k}=${v.length}/${base[k]?.length ?? 0}`).join(" "));
  if (miss.length) { console.log("MISSING:\n" + miss.join("\n")); process.exit(1); } console.log("WIRING OK");
}
