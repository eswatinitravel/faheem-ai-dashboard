// v3.15: emoji scanner (used by tests + cleanup). Emoji = pictographic codepoints (Unicode emoji ranges).
import fs from "fs"; import path from "path";
export const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}\u{20E3}\u{2194}-\u{2199}\u{21A9}\u{21AA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{3030}\u{303D}\u{3297}\u{3299}\u{24C2}\u{2122}\u{2139}]/u;
export const EMOJI_RE_G = new RegExp(EMOJI_RE.source, "gu");
const TEXT = /\.(js|mjs|cjs|jsx|ts|css|md|json|html|txt|svg|webmanifest|bat|ps1|vbs)$/i;
export function scan(root, dirs) {
  const hits = [];
  const walk = (d) => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!/node_modules|\.next/.test(f.name)) walk(p); } else if (TEXT.test(f.name)) { const s = fs.readFileSync(p, "utf8"); const m = s.match(EMOJI_RE_G); if (m) hits.push({ file: path.relative(root, p).split(path.sep).join("/"), count: m.length, sample: [...new Set(m)].slice(0, 8).join(" ") }); } } };
  for (const d of dirs) { const p = path.join(root, d); if (fs.existsSync(p) && fs.statSync(p).isFile()) { const s = fs.readFileSync(p, "utf8"); const m = s.match(EMOJI_RE_G); if (m) hits.push({ file: d, count: m.length, sample: [...new Set(m)].join(" ") }); } else walk(p); }
  return hits;
}
if (process.argv[1]?.endsWith("emoji-scan.mjs")) { const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ["app", "lib", "public"]; const h = scan(process.cwd(), dirs); for (const x of h.sort((a, b) => b.count - a.count)) console.log(x.count, x.file, x.sample); console.log("TOTAL", h.reduce((a, b) => a + b.count, 0)); }
