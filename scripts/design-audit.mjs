// v3.16 Design audit: har page ka asli HTML + CSS (chalte server se) Impeccable (62 checks) + Hallmark/UX Pro checks se.
// node scripts/design-audit.mjs http://localhost:3000 out.json
// Score = 100 - (error x10 + warning x4 + advisory x1 + Hallmark/UX note x3), kam se kam 0.
import fs from "fs"; import path from "path";
const ROOT = process.env.FAHEEM_ROOT || process.cwd();
export const AUDIT_PAGES = ["/", "/agent", "/brains", "/tools", "/design", "/memory", "/skills", "/skills/guide", "/meta", "/options", "/gallery"];
export function scoreOf(counts = {}, notes = 0) { return Math.max(0, 100 - (counts.error || 0) * 10 - (counts.warning || 0) * 4 - (counts.advisory || 0) - notes * 3); }
export async function auditPage(base, u) {
  const IM = await import(path.join(ROOT, "lib/impeccable/index.js"));
  const D = await import(path.join(ROOT, "lib/design.js"));
  const html = await (await fetch(base + u, { cache: "no-store" })).text();
  let css = "";
  for (const m of html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)) { const r = await fetch(new URL(m[1], base)); if (!r.ok) throw new Error(`CSS ${m[1]} HTTP ${r.status}`); css += await r.text(); }
  if (!css) throw new Error("page ki CSS nahi mili");
  const r = await IM.detectHtml(html, css);
  const notes = D.designCheck(html.replace("</head>", () => `<style>${css}</style></head>`)).filter((n) => !/^Design: animation hai/.test(n) || !/prefers-reduced-motion/.test(css));
  const counts = r.counts || {};
  return { page: u, ok: r.ok, counts, notes, findings: (r.findings || []).slice(0, 12).map((f) => `${f.severity}: ${f.name}`), score: scoreOf(counts, notes.length) };
}
if (process.argv[1] && process.argv[1].endsWith("design-audit.mjs")) {
  const base = process.argv[2] || "http://localhost:3000"; const out = process.argv[3];
  const res = []; for (const u of AUDIT_PAGES) { try { res.push(await auditPage(base, u)); } catch (e) { res.push({ page: u, ok: false, error: e.message, score: 0 }); } }
  for (const r of res) console.log(`${r.page.padEnd(14)} score ${String(r.score).padStart(3)}  ${JSON.stringify(r.counts || {})}  notes ${r.notes?.length ?? "-"}`);
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
}
