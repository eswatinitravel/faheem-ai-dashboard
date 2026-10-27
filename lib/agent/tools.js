import fs from "fs";
import os from "os";
import path from "path";
import vm from "vm";
import { spawn } from "child_process";
import { designCheck } from "../design";
import { runtimeTest } from "../runtime";

// Agent ka workspace: har project ka apna folder, C:\Users\<naam>\.faheem-ai\projects\<project>
export const ROOT = path.join(os.homedir(), ".faheem-ai", "projects");
const SKIP = new Set(["node_modules", ".git", ".next", ".faheem-history", ".faheem-agent.json", "dist", ".cache"]);
const HIST = ".faheem-history";

export function cleanName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "my-project";
}

export function projectDir(project) {
  const dir = path.join(ROOT, cleanName(project));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function listProjects() {
  try {
    fs.mkdirSync(ROOT, { recursive: true });
    return fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => {
      const st = fs.statSync(path.join(ROOT, d.name));
      return { name: d.name, updated: st.mtimeMs };
    }).sort((a, b) => b.updated - a.updated);
  } catch { return []; }
}

// Project se bahar koi file na chhuay.
export function safe(dir, p) {
  const rel = String(p || ".").replace(/^[\\/]+/, "");
  const full = path.resolve(dir, rel);
  if (full !== dir && !full.startsWith(dir + path.sep)) throw new Error(`"${p}" project se bahar hai — ijazat nahi.`);
  return full;
}

export function tree(dir, max = 400) {
  const out = [];
  const walk = (d, pre) => {
    if (out.length >= max) return;
    let items = [];
    try { items = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    items.sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1));
    for (const it of items) {
      if (SKIP.has(it.name)) continue;
      const rel = pre ? `${pre}/${it.name}` : it.name;
      if (it.isDirectory()) { out.push({ path: rel, dir: true }); walk(path.join(d, it.name), rel); }
      else { let size = 0; try { size = fs.statSync(path.join(d, it.name)).size; } catch {} out.push({ path: rel, size }); }
      if (out.length >= max) return;
    }
  };
  walk(dir, "");
  return out;
}

// Har tabdeeli se pehle purani file mehfooz (Undo ke liye).
function backup(dir, runId, full) {
  if (!runId) return;
  const base = path.join(dir, HIST, runId);
  const manifest = path.join(base, "manifest.json");
  let m = { created: [], saved: [] };
  try { m = JSON.parse(fs.readFileSync(manifest, "utf8")); } catch {}
  const rel = path.relative(dir, full);
  if (m.created.includes(rel) || m.saved.includes(rel)) return;
  if (fs.existsSync(full)) {
    const to = path.join(base, "files", rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(full, to);
    m.saved.push(rel);
  } else m.created.push(rel);
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(manifest, JSON.stringify(m));
}

export function undoLast(dir) {
  const base = path.join(dir, HIST);
  let runs = [];
  try { runs = fs.readdirSync(base).sort(); } catch {}
  const last = runs.at(-1);
  if (!last) return { ok: false, message: "Undo ke liye kuch nahi." };
  const runDir = path.join(base, last);
  const m = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  for (const rel of m.created) { try { fs.rmSync(path.join(dir, rel), { force: true }); } catch {} }
  for (const rel of m.saved) { const from = path.join(runDir, "files", rel); const to = path.join(dir, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
  fs.rmSync(runDir, { recursive: true, force: true });
  return { ok: true, message: `Aakhri run wapas: ${m.saved.length} file purani hui, ${m.created.length} nayi file hatayi.` };
}

// HTML/JS ki tez jaanch (bina AI).
export function checkCode(rel, text) {
  const issues = [];
  const ext = path.extname(rel).toLowerCase();
  const scripts = [];
  if (ext === ".html" || ext === ".htm") {
    if (!/<html[\s>]/i.test(text) || !/<\/html>/i.test(text)) issues.push("HTML adhoora: <html> ya </html> nahi.");
    if (/via\.placeholder|placehold\.co|placeholder\.com|example\.com\/.*\.(jpg|png)/i.test(text)) issues.push("Placeholder image URL hain — asli (pollinations) image lagayein.");
    if (/\.\.\.\s*(rest|baaki|more code)|<!--\s*\.\.\.|\/\/\s*\.\.\./i.test(text)) issues.push("Code mein '...' (adhoora hissa) hai.");
    for (const m of text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) if (!/type=["'](application\/ld\+json|text\/template|module)["']/i.test(m[0])) scripts.push(m[1]);
    const ids = new Set([...text.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));
    for (const m of text.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)) if (!ids.has(m[1]) && !new RegExp(`id\\s*=|\\.id\\s*=\\s*["']${m[1]}`).test(text)) issues.push(`getElementById("${m[1]}") — yeh id page par nahi.`);
    const defined = new Set([...text.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g), ...text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g), ...text.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)].map((m) => m[1]));
    for (const m of text.matchAll(/on(?:click|submit|change|input)=["']\s*(?:return\s+)?([A-Za-z_$][\w$]*)\s*\(/gi)) if (!defined.has(m[1]) && !["alert", "event", "this", "history", "location", "window", "document"].includes(m[1])) issues.push(`onclick mein ${m[1]}() hai magar function bana nahi.`);
  } else if (ext === ".js" || ext === ".mjs" || ext === ".cjs") scripts.push(text);
  for (const s of scripts) {
    try { new vm.Script(s); } catch (e) { issues.push(`JavaScript ghalti: ${e.message}`); }
  }
  if (ext === ".json") { try { JSON.parse(text); } catch (e) { issues.push(`JSON ghalti: ${e.message}`); } }
  return [...new Set(issues)].slice(0, 12);
}

// Poore project ki HTML + CSS ek sath design rules par jaanchein (CSS alag file mein ho sakti hai).
export function projectDesignCheck(dir) {
  try {
    const files = tree(dir, 200).filter((f) => !f.dir && /\.(html?|css)$/i.test(f.path) && f.size < 800000);
    if (!files.length) return [];
    const all = files.map((f) => fs.readFileSync(path.join(dir, f.path), "utf8")).join("\n");
    return designCheck(all);
  } catch { return []; }
}

const ALLOWED = ["node", "npm", "npx", "python", "py", "pip", "git", "dir", "ls", "tsc", "deno", "bun", "echo", "type", "cat"];

function runCommand(dir, cmd, signal) {
  return new Promise((resolve) => {
    const first = String(cmd).trim().split(/\s+/)[0].toLowerCase().replace(/\.(exe|cmd)$/, "");
    if (!ALLOWED.includes(first)) return resolve(`Ijazat nahi: "${first}". Sirf yeh commands: ${ALLOWED.join(", ")}.`);
    if (/(rm\s+-rf\s+[\/~]|format\s+[a-z]:|del\s+\/s|rmdir\s+\/s|shutdown|reg\s+delete|\bdel\s|\berase\s|\brmdir\b|remove-item|\bformat\b|git\s+push|git\s+reset\s+--hard|\.\.[\\/]|>\s*[a-z]:\\windows)/i.test(cmd)) return resolve("Khatarnak command — nahi chalayi.");
    let out = "";
    const child = spawn(cmd, { cwd: dir, shell: true, windowsHide: true, env: { ...process.env, CI: "1", FORCE_COLOR: "0" } });
    const kill = () => { try { child.kill(); } catch {} };
    const t = setTimeout(() => { out += "\n[120 second ho gaye — command roki]"; kill(); }, 120000);
    signal?.addEventListener?.("abort", kill);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("error", (e) => { out += `\n${e.message}`; });
    child.on("close", (code) => { clearTimeout(t); resolve(`exit ${code}\n${out.slice(-4000)}`); });
  });
}

function stripHtml(h) {
  return h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export const TOOL_DOCS = `
list_files {"path":"."}                         — project ki files dekho
read_file {"path":"index.html","from":1,"lines":300} — file parho (line numbers ke sath)
write_file path="index.html"  (content action ke andar, raw)  — nayi file ya poori file dobara likho
write_file path="index.html" mode="append"       — bari file ko hisson mein likho (pehla hissa bina mode, baaki append)
edit_file path="x"  <old>exact purana text</old><new>naya text</new> — chhoti tabdeeli (old bilkul exact aur ek hi dafa ho)
delete_file {"path":"old.css"}
search {"query":"addToCart"}                     — tamam files mein text dhoondo
run_command {"cmd":"node test.js"}               — node/npm/npx/python/git (120s limit, project folder mein)
check {"path":"index.html"}                      — HTML/JS ki ghaltiyan pakro (JS syntax, missing ids/functions, placeholder images)
test {"path":"index.html"}                       — page ko chhupe browser mein chala kar har button dabao; asli JavaScript ghaltiyan pakro (check ke baad zaroor)
web_fetch {"url":"https://..."}                  — web page ka text parho
image_url {"prompt":"red silk saree on model, studio","width":800,"height":1000} — asli free AI picture ka URL banao
todo {"items":["[x] plan","[ ] home page","[ ] cart"]} — apni kaam ki list update karo
finish {"summary":"kya banaya, kaise chalayein"} — kaam mukammal (sirf jab check pass ho)`;

export async function runTool(dir, runId, name, args, body, signal) {
  switch (name) {
    case "list_files": {
      const base = safe(dir, args.path || ".");
      const t = tree(base, 300).map((f) => (f.dir ? `${f.path}/` : `${f.path} (${f.size}b)`));
      return t.length ? t.join("\n") : "(khali project — abhi koi file nahi)";
    }
    case "read_file": {
      const full = safe(dir, args.path);
      if (!fs.existsSync(full)) return `File nahi mili: ${args.path}`;
      const lines = fs.readFileSync(full, "utf8").split("\n");
      const from = Math.max(1, Number(args.from) || 1), n = Math.min(Number(args.lines) || 400, 600);
      const part = lines.slice(from - 1, from - 1 + n).map((l, i) => `${String(from + i).padStart(4)}| ${l}`).join("\n");
      return `${args.path} (${lines.length} lines)\n${part}${from - 1 + n < lines.length ? `\n… aur ${lines.length - (from - 1 + n)} lines (from=${from + n} se parhein)` : ""}`;
    }
    case "write_file": {
      const full = safe(dir, args.path);
      let content = body ?? args.content ?? "";
      content = content.replace(/^\n/, "");
      if (!content.trim()) return "Khali content — file nahi likhi.";
      backup(dir, runId, full);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      if (args.mode === "append") {
        fs.appendFileSync(full, (fs.existsSync(full) && !fs.readFileSync(full, "utf8").endsWith("\n") ? "\n" : "") + content);
        const all = fs.readFileSync(full, "utf8");
        return `Aage jor diya: ${args.path} (ab ${all.split("\n").length} lines). Jab poori ho jaye to check chalayein.`;
      }
      fs.writeFileSync(full, content);
      const issues = checkCode(args.path, content);
      return `Likh di: ${args.path} (${content.split("\n").length} lines).${issues.length ? `\nCHECK masle:\n- ${issues.join("\n- ")}` : " Check: theek."}`;
    }
    case "edit_file": {
      const full = safe(dir, args.path);
      if (!fs.existsSync(full)) return `File nahi mili: ${args.path}`;
      const text = fs.readFileSync(full, "utf8");
      const old = args.old ?? "", neu = args.new ?? "";
      if (!old) return "edit_file ko <old> chahiye.";
      const count = text.split(old).length - 1;
      if (count === 0) {
        const trimmed = old.trim();
        if (trimmed && text.split(trimmed).length - 1 === 1) { backup(dir, runId, full); fs.writeFileSync(full, text.replace(trimmed, neu.trim())); return `Badal diya (spaces ke farq ke sath): ${args.path}`; }
        return `<old> text file mein nahi mila — pehle read_file karke exact text lein.`;
      }
      if (count > 1) return `<old> ${count} jagah mila — zyada text dein taake ek hi jagah ho.`;
      backup(dir, runId, full);
      const next = text.replace(old, () => neu);
      fs.writeFileSync(full, next);
      const issues = checkCode(args.path, next);
      return `Badal diya: ${args.path}.${issues.length ? `\nCHECK masle:\n- ${issues.join("\n- ")}` : " Check: theek."}`;
    }
    case "delete_file": {
      const full = safe(dir, args.path);
      if (!fs.existsSync(full)) return "File pehle hi nahi.";
      backup(dir, runId, full);
      fs.rmSync(full, { force: true });
      return `Hata di: ${args.path}`;
    }
    case "search": {
      const q = String(args.query || "");
      if (!q) return "query chahiye.";
      const hits = [];
      for (const f of tree(dir, 400)) {
        if (f.dir || f.size > 800000) continue;
        const lines = fs.readFileSync(path.join(dir, f.path), "utf8").split("\n");
        lines.forEach((l, i) => { if (hits.length < 60 && l.toLowerCase().includes(q.toLowerCase())) hits.push(`${f.path}:${i + 1}: ${l.trim().slice(0, 160)}`); });
      }
      return hits.length ? hits.join("\n") : `"${q}" kahin nahi mila.`;
    }
    case "run_command": return runCommand(dir, args.cmd || "", signal);
    case "check": {
      const files = args.path ? [args.path] : tree(dir, 200).filter((f) => !f.dir && /\.(html?|m?js|cjs|json)$/i.test(f.path)).map((f) => f.path);
      if (!files.length) return "Check ke liye koi HTML/JS file nahi.";
      const out = [];
      for (const f of files) {
        const full = safe(dir, f);
        if (!fs.existsSync(full)) { out.push(`${f}: nahi mili`); continue; }
        const issues = checkCode(f, fs.readFileSync(full, "utf8"));
        out.push(issues.length ? `${f}:\n- ${issues.join("\n- ")}` : `${f}: ✓ theek`);
      }
      const tips = projectDesignCheck(dir);
      if (tips.length) out.push(`Design jaanch (Hallmark rules):\n- ${tips.join("\n- ")}`);
      return out.join("\n");
    }
    case "test": {
      const rel = args.path || "index.html";
      const full = safe(dir, rel);
      if (!fs.existsSync(full)) return `${rel} nahi mili.`;
      if (!/\.html?$/i.test(rel)) return "test sirf .html file par chalta hai.";
      const r = await runtimeTest({ file: full });
      if (r.skipped) return `Browser test nahi chal saka (${r.reason || "tester"}) — check ke nateeje par bharosa karein.`;
      return r.ok ? `${rel}: ✓ browser test pass — ${r.clicked}/${r.buttons} buttons/links dabaye, koi JavaScript ghalti nahi.` : `${rel}: browser test mein ${r.errors.length} ghaltiyan (${r.clicked} buttons dabaye):\n- ${r.errors.join("\n- ")}`;
    }
    case "web_fetch": {
      const url = String(args.url || "");
      if (!/^https?:\/\//.test(url)) return "Sahi URL dein (https://…).";
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "Mozilla/5.0 FaheemAI" } });
        const t = await r.text();
        return `HTTP ${r.status}\n${(/html/i.test(r.headers.get("content-type") || "") ? stripHtml(t) : t).slice(0, 6000)}`;
      } catch (e) { return `Fetch fail: ${e.message}`; }
    }
    case "image_url": {
      const w = Number(args.width) || 800, h = Number(args.height) || 800;
      const seed = Math.floor(Math.random() * 1e6);
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(String(args.prompt || "product photo").slice(0, 300))}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
    }
    case "todo": return "List update ho gayi.";
    case "finish": return "done";
    default: return `"${name}" naam ka koi tool nahi. Yeh hain: list_files, read_file, write_file, edit_file, delete_file, search, run_command, check, test, web_fetch, image_url, todo, finish.`;
  }
}
