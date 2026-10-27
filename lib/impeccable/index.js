// Impeccable (Paul Bakaus, Apache-2.0) — 62 design checks, bina AI aur bina API key.
// Hum official npm package ka `impeccable detect --json` chalate hain (Windows/Mac/Linux ka native engine).
// Telemetry har call par band. Engine na mile to { available:false } — dashboard phir bhi chalta rahe.
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import RULES from "./rules.json" with { type: "json" };

export { RULES };
export const RULE_COUNT = RULES.length;

const ENV = { ...process.env, IMPECCABLE_NO_TELEMETRY: "1", DO_NOT_TRACK: "1" };
const SEV = { error: 0, warning: 1, advisory: 2 };

function cliPath() {
  const p = path.join(process.cwd(), "node_modules", "impeccable", "cli", "bin", "cli.js");
  return fs.existsSync(p) ? p : null;
}

export function available() { return !!cliPath(); }

function run(args, timeout = 30000) {
  const cli = cliPath();
  if (!cli) return Promise.resolve({ ok: false, reason: "impeccable install nahi (npm install chalayein)" });
  return new Promise((resolve) => {
    execFile(process.execPath, [cli, ...args], { env: ENV, timeout, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      const out = String(stdout || "").trim();
      try { return resolve({ ok: true, data: JSON.parse(out || "[]") }); } catch {}
      resolve({ ok: false, reason: (err?.killed ? "time out" : String(stderr || err?.message || "engine nahi chala")).slice(0, 300) });
    });
  });
}

function clean(list) {
  const seen = new Set();
  const out = [];
  for (const f of Array.isArray(list) ? list : []) {
    const id = f.antipattern || f.id || "unknown";
    const key = id + "|" + (f.snippet || "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, name: f.name || id, severity: f.severity || "warning", category: f.category || "quality", snippet: String(f.snippet || "").slice(0, 200), description: f.description || "", file: f.file ? path.basename(f.file) : "", line: f.line || 0 });
  }
  return out.sort((a, b) => (SEV[a.severity] ?? 1) - (SEV[b.severity] ?? 1));
}

function summary(findings) {
  const c = { error: 0, warning: 0, advisory: 0 };
  for (const f of findings) c[f.severity] = (c[f.severity] || 0) + 1;
  return c;
}

// Ek HTML (aur chahein to alag CSS) jaanchein.
export async function detectHtml(html, css = "") {
  let doc = String(html || "");
  if (!doc.trim() && !String(css).trim()) return { ok: false, available: available(), reason: "HTML khali hai", findings: [] };
  if (css) doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, `<style>${css}</style></head>`) : `<style>${css}</style>${doc}`;
  if (!/<html[\s>]/i.test(doc)) doc = `<!doctype html><html><head><meta charset="utf-8"></head><body>${doc}</body></html>`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "imp-"));
  try {
    fs.writeFileSync(path.join(dir, "index.html"), doc);
    const r = await run(["detect", path.join(dir, "index.html"), "--json", "--no-config"]);
    if (!r.ok) return { ok: false, available: available(), reason: r.reason, findings: [] };
    const findings = clean(r.data);
    return { ok: true, available: true, findings, counts: summary(findings) };
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
}

// Poora project folder (HTML + linked CSS) jaanchein.
export async function detectDir(dir) {
  if (!fs.existsSync(dir)) return { ok: false, available: available(), reason: "folder nahi mila", findings: [] };
  const r = await run(["detect", dir, "--json", "--no-config"], 60000);
  if (!r.ok) return { ok: false, available: available(), reason: r.reason, findings: [] };
  const findings = clean(r.data);
  return { ok: true, available: true, findings, counts: summary(findings) };
}

// Agent / tester ke liye chhoti lines. Advisory (sirf mashwara) shamil nahi.
export function toNotes(result, max = 8) {
  if (!result?.ok) return [];
  return result.findings.filter((f) => f.severity !== "advisory").slice(0, max).map((f) => `Impeccable: ${f.name}${f.snippet ? ` (${f.snippet})` : ""}`);
}

// Prompt ke liye: sab se aam AI-slop nishaniyan, chhoti list (free models ka context chhota hai).
export const IMPECCABLE_RULES_BRIEF = "Impeccable checks (avoid): " + RULES.filter((r) => r.category === "slop" && r.severity !== "advisory").slice(0, 14).map((r) => r.name.toLowerCase()).join("; ") + ".";
