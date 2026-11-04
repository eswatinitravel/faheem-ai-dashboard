// v3.16 Project Builder ZIP: chat mein "project bana kar zip do" -> Planner -> file manifest -> Builder (har file)
// -> Tester (bina AI: node --check, JSON parse, HTML jaanch, py_compile, browser test) -> Fixer (had ke andar rounds)
// -> ZIP (project + README.md Roman Urdu + INSTALL.bat + START.bat + setup.sh + .env.example).
// Is file mein koi brain/provider import nahi: sab deps se aata hai (tests mock brain se chalte hain).
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { tree, checkCode, cleanName, ROOT as PROJECTS_ROOT } from "./tools.js";
import { estimateTokens, BudgetError, parseTeamActions } from "./team.js";
import { makeZip } from "../zip.js";

export const ZIP_DEFAULTS = { maxRounds: 3, maxTokens: 150000, maxCalls: 30 };
export const MAX_FILES = 20;
export const LARGE_FILES = 8; // is se zyada files = bara project (batches + warning)
export const BATCH = 6;
export const zipRoot = () => path.join(os.homedir(), ".faheem-ai", "zips");
const HISTORY = "history.json";
// Yeh files hum khud banate hain (AI nahi) — manifest se nikal di jati hain.
export const GENERATED = ["README.md", "INSTALL.bat", "START.bat", "setup.sh", ".env.example"];
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".faheem-history", "dist", ".cache", ".venv", "venv", "__pycache__"]);
const SKIP_FILES = new Set([".faheem-agent.json", "team.json", "zip-build.json", ".env", ".env.local", ".env.production", ".env.development", ".DS_Store", "Thumbs.db"]);
const ALLOWED_EXT = /\.(html?|css|m?js|cjs|jsx|tsx?|json|md|txt|py|svg|ya?ml|toml|ini|cfg|csv|xml)$/i;

// ---------- Intent (lib/zip-intent.js: browser bhi istemal karta hai) ----------
import { isZipRequest, ZIP_WORD, MAKE_WORD, NOT_ZIP } from "../zip-intent.js";
export { isZipRequest, ZIP_WORD, MAKE_WORD, NOT_ZIP };

// ---------- Stack ----------
export function detectStack(text = "", files = []) {
  const f = files.map((x) => (typeof x === "string" ? x : x.path));
  if (f.some((p) => /\.py$/i.test(p)) || f.includes("requirements.txt")) return "python";
  if (f.includes("package.json")) return "node";
  if (f.length && f.some((p) => /\.html?$/i.test(p))) return "web";
  const t = String(text);
  if (/\b(python|flask|django|fastapi|streamlit|\.py)\b/i.test(t)) return "python";
  if (/\b(node|express|api server|backend|server|discord bot|telegram bot|whatsapp bot|cli tool|npm)\b/i.test(t)) return "node";
  return "web";
}

// ---------- Manifest ----------
const DEFAULT_FILES = {
  web: [{ path: "index.html", purpose: "Main page (yahan text aur sections)" }, { path: "style.css", purpose: "Design: rang, font, spacing" }, { path: "script.js", purpose: "Buttons, form aur baqi kaam (JavaScript)" }],
  node: [{ path: "package.json", purpose: "Project ki info + dependencies + start script" }, { path: "server.js", purpose: "Main server code" }, { path: "public/index.html", purpose: "Browser wala page" }],
  python: [{ path: "requirements.txt", purpose: "Python packages ki list" }, { path: "main.py", purpose: "Main Python program" }],
};
export function cleanPath(p) {
  const raw = String(p || "").trim().replace(/[`'"*]/g, "");
  if (/^[\\/]/.test(raw)) return "";
  const s = raw.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!s || s.includes("..") || /^[a-z]:/i.test(s) || s.startsWith("/") || s.length > 120) return "";
  if (!ALLOWED_EXT.test(s) && s !== "requirements.txt" && s !== "Procfile") return "";
  const base = s.split("/").pop();
  if (SKIP_FILES.has(base) || /^\.env/.test(base) || GENERATED.includes(s)) return "";
  if (s.split("/").some((part) => SKIP_DIRS.has(part))) return "";
  return s;
}
function parseJson(text) {
  const s = String(text || "").replace(/```(?:json)?/gi, "");
  const m = s.match(/\{[\s\S]*\}/); if (!m) return null;
  try { return JSON.parse(m[0]); } catch { try { return JSON.parse(m[0].replace(/,\s*([}\]])/g, "$1")); } catch { return null; } }
}
export function parseManifest(text, task = "") {
  const j = parseJson(text) || {};
  let files = Array.isArray(j.files) ? j.files : [];
  files = files.map((f) => (typeof f === "string" ? { path: f } : f)).map((f) => ({ path: cleanPath(f?.path || f?.name), purpose: String(f?.purpose || f?.description || "").slice(0, 160) })).filter((f) => f.path);
  if (!files.length) {
    const line = (String(text).match(/FILES:\s*([^\n]+)/i) || [])[1] || "";
    files = line.split(/[,\s]+/).map(cleanPath).filter(Boolean).map((p) => ({ path: p, purpose: "" }));
  }
  const seen = new Set(); files = files.filter((f) => !seen.has(f.path) && seen.add(f.path));
  let stack = ["web", "node", "python"].includes(j.stack) ? j.stack : detectStack(task, files);
  if (!files.length) files = DEFAULT_FILES[stack].map((f) => ({ ...f }));
  const truncated = files.length > MAX_FILES;
  files = files.slice(0, MAX_FILES);
  if (stack === "node" && !files.some((f) => f.path === "package.json")) files.unshift({ path: "package.json", purpose: "Project ki info + dependencies + start script" });
  if (stack === "python" && !files.some((f) => f.path === "requirements.txt")) files.push({ path: "requirements.txt", purpose: "Python packages ki list" });
  if (stack === "web" && !files.some((f) => /^index\.html?$/i.test(f.path))) files.unshift({ path: "index.html", purpose: "Main page" });
  const name = cleanName(j.name || String(task).replace(/\b(zip|bana|banao|do|kar|de|make|build|and|give|me|a|an|the|project|folder|file)\b/gi, " ").trim().split(/\s+/).slice(0, 4).join("-") || "my-project");
  const main = String(j.main || (stack === "python" ? (files.find((f) => /(^|\/)(main|app)\.py$/.test(f.path)) || files.find((f) => f.path.endsWith(".py")) || {}).path : "") || "");
  return { name, stack, summary: String(j.summary || "").slice(0, 400), main, files, truncated, large: files.length > LARGE_FILES };
}

// ---------- Prompts ----------
export const PLANNER = (mem = "") => `You are the PLANNER in Faheem's Project Builder. The user wants a complete, runnable project delivered as a ZIP for a Windows 8GB laptop, all free (no paid APIs).
Reply ONLY with JSON:
{"name":"short-kebab-name","stack":"web|node|python","summary":"1-2 lines in simple Roman Urdu","main":"main.py (python only)","files":[{"path":"index.html","purpose":"short Roman Urdu purpose"}]}
Rules: smallest set of files that fully works (usually 2-8, max ${MAX_FILES}). "web" = plain HTML/CSS/JS opening directly in a browser (prefer this unless a server/bot/python is clearly needed). "node" must include package.json with a "start" script; use few dependencies. "python" must include requirements.txt. Do NOT list README.md, INSTALL.bat, START.bat, setup.sh, .env or .env.example (the system writes them). Never put real API keys anywhere; code must read keys from environment variables (process.env.X / os.environ.get("X")).
${mem ? `\n${mem}` : ""}`;

export const BUILDER = (mem = "") => `You are the BUILDER in Faheem's Project Builder. Write ONE complete file of the project.
Reply with exactly one block:
<file path="the/path.ext">
...the COMPLETE raw file content, no markdown fences...
</file>
Rules: no "..." or TODO placeholders; everything really works; match ids/classes/function names used by the other files shown; images from https://image.pollinations.ai/prompt/<url-encoded description>?width=800&height=600&nologo=true (never placeholder sites); never write real API keys (read from env vars); comments may be simple Roman Urdu; no emoji.
${mem ? `\n${mem}` : ""}`;

// Builder ke jawab se file content nikalna (<file>, Agent-Mode <action>, ```fence```, ya saada text).
export function extractFile(text, p) {
  const s = String(text || "");
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let m = s.match(new RegExp(`<file\\s+path=["']${esc}["'][^>]*>\\n?([\\s\\S]*?)<\\/file>`)) || s.match(/<file[^>]*>\n?([\s\S]*?)<\/file>/);
  if (m) return m[1].replace(/^\s*```[a-z]*\s*\n/i, "").replace(/\n```\s*$/, "").replace(/\s+$/, "") + "\n";
  const acts = parseTeamActions(s).actions.filter((a) => a.tool === "write_file");
  const a = acts.find((x) => x.args.path === p) || acts[0];
  if (a?.body) return a.body.replace(/\s+$/, "") + "\n";
  const fences = [...s.matchAll(/```[\w.+-]*\s*\n([\s\S]*?)```/g)].map((x) => x[1]);
  if (fences.length) return fences.sort((x, y) => y.length - x.length)[0].replace(/\s+$/, "") + "\n";
  const open = s.match(/<file[^>]*>\n?([\s\S]*)$/); // jawab kat gaya
  if (open) return open[1].replace(/\s+$/, "") + "\n";
  const t = s.trim();
  return t ? t + "\n" : "";
}

// ---------- Secrets ----------
const SECRET_RES = [/\bsk-(?:proj-|or-v1-)?[A-Za-z0-9_-]{20,}/g, /\bgsk_[A-Za-z0-9]{20,}/g, /\bAIza[0-9A-Za-z_-]{30,}/g, /\bghp_[A-Za-z0-9]{30,}/g, /\bgithub_pat_[A-Za-z0-9_]{20,}/g, /\bxox[abpr]-[A-Za-z0-9-]{10,}/g, /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g, /\bAKIA[0-9A-Z]{16}\b/g, /\bhf_[A-Za-z0-9]{30,}/g];
export function scrubSecrets(text, known = []) {
  let out = String(text), found = 0;
  for (const k of known.filter((x) => typeof x === "string" && x.length >= 12)) if (out.includes(k)) { found += out.split(k).length - 1; out = out.split(k).join("YOUR_KEY_HERE"); }
  for (const re of SECRET_RES) out = out.replace(re, () => { found++; return "YOUR_KEY_HERE"; });
  return { text: out, found };
}
export function findEnvKeys(files) {
  const keys = new Set();
  for (const { text } of files) {
    const s = String(text);
    for (const m of s.matchAll(/process\.env\.([A-Z][A-Z0-9_]{1,60})/g)) keys.add(m[1]);
    for (const m of s.matchAll(/process\.env\[\s*["']([A-Z][A-Z0-9_]{1,60})["']\s*\]/g)) keys.add(m[1]);
    for (const m of s.matchAll(/import\.meta\.env\.([A-Z][A-Z0-9_]{1,60})/g)) keys.add(m[1]);
    for (const m of s.matchAll(/os\.(?:environ\.get|getenv)\(\s*["']([A-Z][A-Z0-9_]{1,60})["']/g)) keys.add(m[1]);
    for (const m of s.matchAll(/os\.environ\[\s*["']([A-Z][A-Z0-9_]{1,60})["']\s*\]/g)) keys.add(m[1]);
  }
  for (const k of ["NODE_ENV"]) keys.delete(k);
  return [...keys].sort();
}

// ---------- Generated files ----------
const crlf = (s) => s.replace(/\r?\n/g, "\r\n");
export function nodeStart(files) {
  const pj = files.find((f) => f.path === "package.json");
  try { const j = JSON.parse(pj.text); if (j.scripts?.start) return "npm start"; if (j.scripts?.dev) return "npm run dev"; if (j.main) return `node ${j.main}`; } catch {}
  const js = files.find((f) => /^(server|index|app|main)\.(c|m)?js$/.test(f.path));
  return js ? `node ${js.path}` : "npm start";
}
export function makeExtras({ name, stack, task = "", summary = "", main = "", files = [], tests = { ok: true, issues: [] }, envKeys = [], version = "3.16.0", readmeExtra = "" }) {
  const list = files.map((f) => f.path);
  const htmlMain = list.find((p) => /^index\.html?$/i.test(p)) || list.find((p) => /\.html?$/i.test(p)) || "index.html";
  const pyMain = main || list.find((p) => /(^|\/)(main|app)\.py$/.test(p)) || list.find((p) => p.endsWith(".py")) || "main.py";
  const start = stack === "node" ? nodeStart(files) : "";
  const winPath = (p) => p.replace(/\//g, "\\");
  const out = [];
  // .env.example
  out.push({ name: ".env.example", data: envKeys.length ? `# Apni keys yahan likhein, phir is file ka naam .env kar dein (INSTALL.bat khud copy kar deta hai).\n# Asli keys kabhi kisi ko na bhejein. Yeh sirf naam hain, keys nahi.\n${envKeys.map((k) => `${k}=`).join("\n")}\n` : "# Is project ko abhi koi key nahi chahiye.\n# Agar baad mein koi key lage to yahan NAAM=qeemat likhein aur file ka naam .env kar dein.\n" });
  // INSTALL.bat + START.bat
  const head = `@echo off\r\nsetlocal\r\ncd /d "%~dp0"\r\ntitle ${name}\r\n`;
  let install, startBat = null;
  if (stack === "web") {
    install = head + `echo ${name} - website hai, kuch install karne ki zaroorat nahi.\necho Page browser mein khul raha hai...\nstart "" "%~dp0${winPath(htmlMain)}"\nexit /b 0\n`;
    startBat = head + `start "" "%~dp0${winPath(htmlMain)}"\n`;
  } else if (stack === "node") {
    install = head + `echo [1/3] Node.js check...\nwhere node >nul 2>nul\nif errorlevel 1 (\n  echo Node.js nahi mila. https://nodejs.org se LTS install karein, phir INSTALL.bat dobara chalayein.\n  start "" "https://nodejs.org/en/download"\n  pause\n  exit /b 1\n)\nif not exist ".env" if exist ".env.example" copy ".env.example" ".env" >nul\necho [2/3] Packages install ho rahe hain (npm install)...\ncall npm install\nif errorlevel 1 (\n  echo npm install fail hua. Internet check karein aur dobara chalayein.\n  pause\n  exit /b 1\n)\necho [3/3] Project chal raha hai: ${start}\ncall ${start}\npause\n`;
    startBat = head + `where node >nul 2>nul\nif errorlevel 1 (\n  echo Pehle INSTALL.bat chalayein.\n  pause\n  exit /b 1\n)\nif not exist "node_modules" call npm install\ncall ${start}\npause\n`;
  } else {
    install = head + `echo [1/3] Python check...\nset PY=\nwhere py >nul 2>nul && set PY=py\nif not defined PY where python >nul 2>nul && set PY=python\nif not defined PY (\n  echo Python nahi mila. https://www.python.org/downloads se install karein - "Add python.exe to PATH" tick karein.\n  start "" "https://www.python.org/downloads/"\n  pause\n  exit /b 1\n)\nif not exist ".env" if exist ".env.example" copy ".env.example" ".env" >nul\necho [2/3] Virtual env + packages...\nif not exist ".venv" %PY% -m venv .venv\ncall ".venv\\Scripts\\python.exe" -m pip install --upgrade pip >nul\nif exist requirements.txt call ".venv\\Scripts\\python.exe" -m pip install -r requirements.txt\nif errorlevel 1 (\n  echo pip install fail hua. Internet check karein aur dobara chalayein.\n  pause\n  exit /b 1\n)\necho [3/3] Program chal raha hai: ${pyMain}\n".venv\\Scripts\\python.exe" "${winPath(pyMain)}"\npause\n`;
    startBat = head + `if not exist ".venv" (\n  echo Pehle INSTALL.bat chalayein.\n  pause\n  exit /b 1\n)\n".venv\\Scripts\\python.exe" "${winPath(pyMain)}"\npause\n`;
  }
  out.push({ name: "INSTALL.bat", data: crlf(install) });
  if (startBat) out.push({ name: "START.bat", data: crlf(startBat) });
  // setup.sh
  let sh = `#!/usr/bin/env bash\n# ${name} - Linux / macOS setup. Chalayein: bash setup.sh\nset -e\ncd "$(dirname "$0")"\n`;
  if (stack === "web") sh += `echo "Website hai, install ki zaroorat nahi. ${htmlMain} browser mein kholein."\n(command -v xdg-open >/dev/null && xdg-open "${htmlMain}") || (command -v open >/dev/null && open "${htmlMain}") || true\n`;
  else if (stack === "node") sh += `command -v node >/dev/null || { echo "Node.js nahi mila: https://nodejs.org se install karein."; exit 1; }\n[ -f .env ] || { [ -f .env.example ] && cp .env.example .env; }\nnpm install\n${start}\n`;
  else sh += `PY=$(command -v python3 || command -v python) || { echo "Python 3 nahi mila: https://www.python.org/downloads"; exit 1; }\n[ -f .env ] || { [ -f .env.example ] && cp .env.example .env; }\n[ -d .venv ] || "$PY" -m venv .venv\n. .venv/bin/activate\npip install --upgrade pip >/dev/null\n[ -f requirements.txt ] && pip install -r requirements.txt\npython "${pyMain}"\n`;
  out.push({ name: "setup.sh", data: sh, exec: true });
  // README.md (Roman Urdu)
  const req = stack === "web" ? "Kuch nahi - sirf browser (Edge / Chrome)." : stack === "node" ? "Node.js LTS (https://nodejs.org) - INSTALL.bat khud check karta hai." : "Python 3.10+ (https://www.python.org/downloads) - install karte waqt \"Add python.exe to PATH\" tick karein.";
  const run = stack === "web" ? `- Windows: \`INSTALL.bat\` ya \`START.bat\` par double-click (ya seedha \`${htmlMain}\` kholein).\n- Linux / macOS: \`bash setup.sh\` ya \`${htmlMain}\` browser mein kholein.` : stack === "node" ? `- Windows: pehli dafa \`INSTALL.bat\` par double-click (Node check + \`npm install\` + chalana). Baad mein \`START.bat\`.\n- Linux / macOS: \`bash setup.sh\`\n- Haath se: \`npm install\` phir \`${start}\`` : `- Windows: pehli dafa \`INSTALL.bat\` par double-click (Python check + .venv + packages + chalana). Baad mein \`START.bat\`.\n- Linux / macOS: \`bash setup.sh\`\n- Haath se: \`python -m venv .venv\`, packages \`pip install -r requirements.txt\`, phir \`python ${pyMain}\``;
  const testTxt = tests.ok ? `Sab tests pass hue (${tests.checks || 0} checks: syntax, JSON, HTML${stack === "web" ? ", browser test" : ""}).` : `Tests FAIL - ${tests.issues.length} masle baqi hain. Project chal sakta hai magar pehle yeh theek karein (ya Faheem AI ke Agent Mode mein "Jaari rakho" likhein):\n${tests.issues.slice(0, 15).map((i) => `- ${i}`).join("\n")}`;
  const readme = `# ${name}\n\n${summary || "Faheem AI Project Builder se bana project."}\n\n**Kaam (aap ne kaha tha):** ${String(task).replace(/\s+/g, " ").slice(0, 400)}\n\n## Kya hai\n- Qisam: ${stack === "web" ? "Website (HTML/CSS/JS)" : stack === "node" ? "Node.js project" : "Python project"}\n- Files: ${files.length}\n\n## Zaroori cheezein\n${req}\n\n## Install aur chalana\n${run}\n\n## Keys (.env)\n${envKeys.length ? `Is project ko yeh keys chahiye: ${envKeys.map((k) => `\`${k}\``).join(", ")}.\n\`.env.example\` ka naam \`.env\` karein (INSTALL.bat khud karta hai) aur keys likhein. Asli keys kabhi ZIP ya GitHub par na daalein.` : "Koi key nahi chahiye. `.env.example` sirf namoona hai."}\n\n## Edit kaise karein\nKoi bhi file Notepad / VS Code mein kholein, badlein, save karein${stack === "web" ? " aur browser mein page refresh (F5) karein" : ", phir START.bat dobara chalayein"}.\n${files.map((f) => `- \`${f.path}\`${f.purpose ? ` - ${f.purpose}` : ""}`).join("\n")}\n\n${readmeExtra ? readmeExtra.trim() + "\n\n" : ""}## Test result\n${testTxt}\n\n---\nFaheem AI Dashboard v${version} (Project Builder ZIP) se bana. Mufat brains se bana hai, is liye ek dafa khud chala kar dekh lein.\n`;
  out.push({ name: "README.md", data: readme });
  return out;
}

// ---------- Tester (bina AI) ----------
const NODE_BUILTIN = new Set(["fs", "path", "os", "http", "https", "url", "crypto", "events", "stream", "util", "child_process", "zlib", "readline", "net", "dns", "querystring", "buffer", "assert", "timers", "process", "worker_threads", "cluster", "string_decoder", "tty", "vm", "module", "perf_hooks"]);
export function htmlIssues(rel, text) {
  const issues = [];
  const s = String(text).replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script>/gi, "<script></script>").replace(/<style\b[\s\S]*?<\/style>/gi, "<style></style>");
  for (const tag of ["head", "body", "div", "section", "main", "header", "footer", "nav", "form", "ul", "ol", "table", "button", "a", "script", "style"]) {
    const o = (s.match(new RegExp(`<${tag}(\\s[^>]*)?>`, "gi")) || []).length, c = (s.match(new RegExp(`</${tag}\\s*>`, "gi")) || []).length;
    if (o !== c) issues.push(`${rel}: <${tag}> ${o} khule magar ${c} band - HTML adhoora/ghalat.`);
  }
  const ids = [...s.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) issues.push(`${rel}: ek hi id do dafa: ${[...new Set(dup)].slice(0, 3).join(", ")}`);
  return issues;
}
function which(cmds) { for (const c of cmds) { try { const r = spawnSync(c, ["--version"], { encoding: "utf8", timeout: 8000, windowsHide: true }); if (r.status === 0) return c; } catch {} } return null; }
export async function testProject(dir, { stack = "web", runtimeTest = null, nodeCheck = true, pyCheck = true } = {}) {
  const issues = [], notes = []; let checks = 0;
  const files = tree(dir, 400).filter((x) => !x.dir && !SKIP_FILES.has(x.path.split("/").pop()) && !GENERATED.includes(x.path));
  const read = (p) => { try { return fs.readFileSync(path.join(dir, p), "utf8"); } catch { return ""; } };
  if (!files.length) return { ok: false, issues: ["Koi file nahi bani."], notes, checks: 1 };
  if (stack === "web" && !files.some((f) => /\.html?$/i.test(f.path))) issues.push("Koi HTML page nahi bana (index.html chahiye).");
  const py = stack === "python" || files.some((f) => f.path.endsWith(".py")) ? (pyCheck ? which(["python3", "python", "py"]) : null) : null;
  for (const f of files) {
    const text = read(f.path), ext = path.extname(f.path).toLowerCase();
    if (/\.html?$/.test(ext)) { checks++; for (const i of checkCode(f.path, text)) issues.push(`${f.path}: ${i}`); issues.push(...htmlIssues(f.path, text)); }
    else if (ext === ".json") { checks++; try { JSON.parse(text); } catch (e) { issues.push(`${f.path}: JSON ghalti: ${e.message}`); } }
    else if ([".js", ".mjs", ".cjs"].includes(ext)) {
      checks++;
      if (nodeCheck) { const r = spawnSync(process.execPath, ["--check", path.join(dir, f.path)], { encoding: "utf8", timeout: 20000, windowsHide: true }); if (r.status !== 0) issues.push(`${f.path}: node --check fail: ${(r.stderr || "").split("\n").find((l) => /Error/.test(l)) || (r.stderr || "").trim().split("\n").pop() || "syntax ghalti"}`.slice(0, 300)); }
      else for (const i of checkCode(f.path, text)) issues.push(`${f.path}: ${i}`);
    } else if (ext === ".py") {
      if (py) { checks++; const r = spawnSync(py, ["-m", "py_compile", path.join(dir, f.path)], { encoding: "utf8", timeout: 20000, windowsHide: true }); if (r.status !== 0) issues.push(`${f.path}: Python syntax ghalti: ${(r.stderr || "").trim().split("\n").slice(-1)[0]}`.slice(0, 300)); }
      else notes.push(`${f.path}: Python nahi mila, syntax check skip.`);
    }
    if (/\.(m?js|cjs|py|html?)$/.test(ext) && (/\.\.\.\s*(rest|baaki|more code)/i.test(text) || /(\/\/|#|<!--|\/\*)\s*TODO\b/.test(text))) issues.push(`${f.path}: adhoora code (TODO / '...').`);
  }
  // Linked CSS/JS files mojood hon.
  for (const f of files.filter((x) => /\.html?$/i.test(x.path))) {
    const h = read(f.path);
    for (const m of h.matchAll(/(?:href|src)=["'](?!https?:|\/\/|data:|#|mailto:|tel:)([^"'?#]+\.(?:css|js))["']/gi)) {
      const base = stack === "node" && m[1].startsWith("/") ? path.join(dir, "public", m[1]) : path.join(dir, path.dirname(f.path), m[1]);
      if (!fs.existsSync(base) && !fs.existsSync(path.join(dir, m[1].replace(/^\//, "")))) issues.push(`${f.path}: "${m[1]}" link hai magar file nahi bani.`);
    }
  }
  if (stack === "node") {
    checks++;
    let pj = null; try { pj = JSON.parse(read("package.json")); } catch {}
    if (!pj) issues.push("package.json nahi bana ya ghalat hai.");
    else {
      if (!pj.scripts?.start && !pj.scripts?.dev && !pj.main) issues.push('package.json: "start" script nahi - INSTALL.bat project chala nahi payega.');
      const deps = { ...(pj.dependencies || {}), ...(pj.devDependencies || {}) };
      const used = new Set();
      for (const f of files.filter((x) => /\.(m?js|cjs)$/.test(x.path) && !x.path.startsWith("public/"))) {
        const t = read(f.path);
        for (const m of t.matchAll(/(?:require\(\s*|from\s+|import\s+)["']([^"'./][^"']*)["']/g)) { const n = m[1].replace(/^node:/, "").split("/").slice(0, m[1].startsWith("@") ? 2 : 1).join("/"); if (!NODE_BUILTIN.has(n) && !m[1].startsWith("node:")) used.add(n); }
      }
      for (const u of used) if (!deps[u]) issues.push(`package.json: "${u}" code mein istemal hua magar dependencies mein nahi.`);
    }
  }
  if (stack === "python" && !files.some((f) => f.path === "requirements.txt")) notes.push("requirements.txt nahi - agar koi package chahiye to likhein.");
  if (runtimeTest && stack === "web" && !issues.length) {
    for (const f of files.filter((x) => /\.html?$/i.test(x.path)).slice(0, 3)) {
      checks++;
      try { const rt = await runtimeTest({ file: path.join(dir, f.path) }); if (rt && !rt.skipped && !rt.ok) for (const e of (rt.errors || []).slice(0, 4)) issues.push(`${f.path} (browser test): ${e}`); else if (rt?.skipped) notes.push(`${f.path}: browser test skip (${rt.reason || "?"}).`); } catch {}
    }
  }
  const uniq = [...new Set(issues)].slice(0, 20);
  return { ok: uniq.length === 0, issues: uniq, notes, checks };
}

// ---------- Packaging + history ----------
export function projectFiles(dir) {
  return tree(dir, 600).filter((x) => !x.dir && !SKIP_FILES.has(x.path.split("/").pop()) && !/^\.env/.test(x.path.split("/").pop()) && !x.path.split("/").some((p) => SKIP_DIRS.has(p)) && !GENERATED.includes(x.path) && x.size < 5_000_000)
    .map((x) => ({ path: x.path, buf: fs.readFileSync(path.join(dir, x.path)) }));
}
export function testLabel(tests, partial = false) {
  if (tests.ok && !partial) return `Tayyar - sab tests pass (${tests.checks} checks)`;
  if (tests.ok && partial) return "Adhoora - free limit ki wajah se kuch files nahi banin";
  return `Tests fail - ${tests.issues.length} masle baqi (README mein list)`;
}
const readHist = (zd) => { try { return JSON.parse(fs.readFileSync(path.join(zd, HISTORY), "utf8")); } catch { return []; } };
const writeHist = (zd, h) => { fs.mkdirSync(zd, { recursive: true }); fs.writeFileSync(path.join(zd, HISTORY), JSON.stringify(h.slice(0, 200), null, 1)); };
export function listZips(zd = zipRoot()) { return readHist(zd).filter((z) => fs.existsSync(path.join(zd, z.file))); }
export function getZip(id, zd = zipRoot()) { const z = readHist(zd).find((x) => x.id === String(id)); if (!z) return null; const f = path.join(zd, path.basename(z.file)); return fs.existsSync(f) ? { ...z, path: f } : null; }
export function deleteZip(id, zd = zipRoot()) {
  const h = readHist(zd); const z = h.find((x) => x.id === String(id)); if (!z) return false;
  try { fs.rmSync(path.join(zd, path.basename(z.file)), { force: true }); } catch {}
  writeHist(zd, h.filter((x) => x.id !== z.id)); return true;
}
export function packageProject(dir, { name, stack, task = "", summary = "", main = "", purposes = {}, tests, partial = false, knownSecrets = [], zipDir = zipRoot(), version = "3.16.0", project, readmeExtra = "", kind = "project" } = {}) {
  name = cleanName(name || path.basename(dir));
  const raw = projectFiles(dir);
  stack = stack || detectStack(task, raw.map((f) => f.path));
  let leaked = 0;
  const files = raw.map((f) => {
    const isText = !f.buf.includes(0);
    if (!isText) return { path: f.path, data: f.buf, text: "" };
    const s = scrubSecrets(f.buf.toString("utf8"), knownSecrets); leaked += s.found;
    return { path: f.path, data: s.text, text: s.text, purpose: purposes[f.path] || "" };
  });
  const envKeys = findEnvKeys(files);
  const extras = makeExtras({ name, stack, task, summary, main, files, tests, envKeys, version, readmeExtra });
  const entries = [...files.map((f) => ({ name: `${name}/${f.path}`, data: f.data, exec: f.path.endsWith(".sh") })), ...extras.map((e) => ({ name: `${name}/${e.name}`, data: e.data, exec: e.exec }))];
  const buf = makeZip(entries);
  fs.mkdirSync(zipDir, { recursive: true });
  const id = `${name}-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;
  const file = `${id}.zip`;
  fs.writeFileSync(path.join(zipDir, file), buf);
  const card = { id, name, kind, file, project: project || path.basename(dir), stack, size: buf.length, files: entries.length, projectFiles: files.length, envKeys, secretsRemoved: leaked, tests: { ok: tests.ok && !partial, issues: tests.issues.slice(0, 20), checks: tests.checks, notes: (tests.notes || []).slice(0, 10) }, label: testLabel(tests, partial), partial, at: Date.now(), download: `/api/agent/zip?id=${encodeURIComponent(id)}&download=1` };
  writeHist(zipDir, [card, ...readHist(zipDir).filter((x) => x.id !== id)]);
  return card;
}

// ---------- Pipeline ----------
export async function runProjectZip({ task, project, emit = () => {}, signal, deps = {}, options = {} }) {
  const opt = { ...ZIP_DEFAULTS, ...Object.fromEntries(Object.entries(options).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])) };
  const step = (who, text, extra = {}) => emit({ type: "step", who, text: String(text).slice(0, 400), ...extra });
  const budget = { used: 0, calls: 0 };
  const memCtx = (q) => { try { return deps.memory?.memoryContext ? deps.memory.memoryContext(q, { maxTokens: 200 }) : ""; } catch { return ""; } };
  const call = async (role, messages) => {
    if (signal?.aborted) throw new Error("Roka gaya.");
    const est = estimateTokens(messages);
    if (budget.calls >= opt.maxCalls) throw new BudgetError(`Calls ki had (${opt.maxCalls}) puri - free limit bachane ke liye ruk gaya.`);
    if (budget.used + est > opt.maxTokens) throw new BudgetError(`Token budget (${opt.maxTokens}) khatam hone wala tha - free limit bachane ke liye ruk gaya.`);
    const r = await deps.ask(role, messages, signal);
    budget.used += est + estimateTokens(r.text); budget.calls++;
    return r;
  };

  // 1) Planner
  step("Planner", "Project ka plan aur file list bana raha hoon...");
  let plan;
  try {
    const r = await call("designer", [{ role: "system", content: PLANNER(memCtx(task)) }, { role: "user", content: `TASK: ${task}` }]);
    plan = parseManifest(r.text, task);
    step("Planner", `${r.brain}: ${plan.stack} project "${plan.name}", ${plan.files.length} files: ${plan.files.map((f) => f.path).join(", ")}`);
  } catch (e) {
    if (e.code === "BRAINS" || e.code === "BUDGET") { plan = parseManifest("", task); step("Planner", `Brain nahi mila (${String(e.message).slice(0, 120)}) - saada plan: ${plan.files.map((f) => f.path).join(", ")}`); }
    else throw e;
  }
  if (plan.truncated) emit({ type: "warn", text: `Plan mein ${MAX_FILES} se zyada files thin - pehli ${MAX_FILES} banai ja rahi hain.` });
  if (plan.large) emit({ type: "warn", text: `Bara project (${plan.files.length} files): ${Math.ceil(plan.files.length / BATCH)} rounds mein banega, free brains ki limit lag sakti hai. Thora waqt lagega.` });

  // Folder
  let dir = deps.dir;
  if (!dir) {
    const root = deps.projectsRoot || PROJECTS_ROOT;
    let nm = cleanName(project || plan.name), i = 2;
    const base = nm;
    while (fs.existsSync(path.join(root, nm)) && fs.readdirSync(path.join(root, nm)).length) nm = `${base}-${i++}`;
    dir = path.join(root, nm);
  }
  fs.mkdirSync(dir, { recursive: true });
  const name = cleanName(path.basename(dir));
  emit({ type: "project", name, dir });
  const state = { task, plan, status: "running", started: Date.now(), rounds: [] };
  const saveState = () => { try { fs.writeFileSync(path.join(dir, "zip-build.json"), JSON.stringify({ ...state, budget }, null, 1)); } catch {} };
  saveState();

  // 2) Builder (har file; bara project = batches)
  const order = [...plan.files].sort((a, b) => { const r = (p) => (p === "package.json" || p === "requirements.txt" ? 0 : /\.html?$/.test(p) ? 1 : /\.css$/.test(p) ? 2 : 3); return r(a.path) - r(b.path); });
  const written = new Set(); let partial = false, stopWhy = "";
  const context = (except) => {
    let out = "", total = 0;
    for (const p of written) { if (p === except) continue; let t = ""; try { t = fs.readFileSync(path.join(dir, p), "utf8"); } catch { continue; } const part = t.slice(0, /\.html?$/.test(p) ? 9000 : 3000); if (total + part.length > 16000) break; out += `\n--- ${p} ---\n${part}\n`; total += part.length; }
    return out || "(abhi koi file nahi)";
  };
  const manifestTxt = `PROJECT: ${plan.name} (${plan.stack})\n${plan.summary}\nFILES:\n${plan.files.map((f) => `- ${f.path}: ${f.purpose}`).join("\n")}`;
  const writeOne = async (f, issues = []) => {
    const r = await call("coder", [{ role: "system", content: BUILDER(memCtx(task)) }, { role: "user", content: `TASK: ${task}\n\n${manifestTxt}\n\nOTHER FILES SO FAR:${context(f.path)}\n\n${issues.length ? `CURRENT ${f.path}:\n${(() => { try { return fs.readFileSync(path.join(dir, f.path), "utf8").slice(0, 12000); } catch { return "(nahi)"; } })()}\n\nFIX ALL THESE ISSUES:\n- ${issues.join("\n- ")}\n\n` : ""}Now write the COMPLETE file: ${f.path}${f.purpose ? ` (${f.purpose})` : ""}` }]);
    const body = extractFile(r.text, f.path);
    if (!body.trim()) throw new Error(`${f.path}: khali jawab`);
    const full = path.resolve(dir, f.path);
    if (!full.startsWith(dir + path.sep)) throw new Error("project se bahar");
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
    written.add(f.path);
    return r.brain;
  };
  for (let b = 0; b < order.length; b += BATCH) {
    if (plan.large) step("Builder", `Round ${b / BATCH + 1}/${Math.ceil(order.length / BATCH)}`);
    for (const f of order.slice(b, b + BATCH)) {
      if (signal?.aborted) { stopWhy = "Roka gaya."; partial = true; break; }
      step("Builder", `${f.path} likh raha hoon...`);
      try { const brain = await writeOne(f); step("Builder", `${f.path} ban gayi (${brain})`, { file: f.path }); }
      catch (e) { step("Builder", `${f.path} nahi bani: ${String(e.message).slice(0, 160)}`); if (e.code === "BUDGET" || e.code === "BRAINS") { partial = true; stopWhy = e.message; break; } }
    }
    if (stopWhy) break;
  }
  if (order.some((f) => !written.has(f.path))) partial = true;

  // 3) Tester + 4) Fixer
  let tests = await testProject(dir, { stack: plan.stack, runtimeTest: deps.runtimeTest, nodeCheck: deps.nodeCheck !== false });
  step("Tester", tests.ok ? `Sab checks pass (${tests.checks})` : `${tests.issues.length} masle: ${tests.issues.slice(0, 3).join(" | ")}`);
  for (let round = 1; !tests.ok && round <= opt.maxRounds && !stopWhy; round++) {
    const byFile = {};
    for (const i of tests.issues) { const p = (i.match(/^([\w./-]+\.\w+)(?: \(browser test\))?:/) || [])[1]; const f = plan.files.find((x) => x.path === p) || (p && cleanPath(p) ? { path: p, purpose: "" } : null); const k = f ? f.path : (plan.files.find((x) => /\.html?$/.test(x.path)) || plan.files[0]).path; (byFile[k] ||= []).push(i); }
    // "link hai magar file nahi" -> nayi file manifest mein
    for (const i of tests.issues) { const m = i.match(/"([^"]+\.(?:css|js))" link hai magar file nahi/); if (m) { const p = cleanPath(m[1].replace(/^\//, "")); if (p && !plan.files.some((x) => x.path === p)) { plan.files.push({ path: p, purpose: "linked file" }); byFile[p] = [`${p} banani hai (HTML mein link hai)`]; } } }
    step("Fixer", `Round ${round}/${opt.maxRounds}: ${Object.keys(byFile).length} file(s) theek kar raha hoon`);
    for (const [p, iss] of Object.entries(byFile)) {
      try { await writeOne(plan.files.find((x) => x.path === p) || { path: p, purpose: "" }, iss); step("Fixer", `${p} theek ki`); }
      catch (e) { step("Fixer", `${p}: ${String(e.message).slice(0, 140)}`); if (e.code === "BUDGET" || e.code === "BRAINS") { stopWhy = e.message; break; } }
    }
    tests = await testProject(dir, { stack: plan.stack, runtimeTest: deps.runtimeTest, nodeCheck: deps.nodeCheck !== false });
    state.rounds.push({ round, ok: tests.ok, issues: tests.issues.length }); saveState();
    step("Tester", tests.ok ? `Round ${round}: sab checks pass (${tests.checks})` : `Round ${round}: ${tests.issues.length} masle baqi`);
  }
  if (stopWhy) emit({ type: "warn", text: stopWhy });

  // 5) ZIP
  step("Packager", "ZIP bana raha hoon (README, INSTALL.bat, setup.sh, .env.example ke sath)...");
  const purposes = Object.fromEntries(plan.files.map((f) => [f.path, f.purpose]));
  const card = packageProject(dir, { name, stack: plan.stack, task, summary: plan.summary, main: plan.main, purposes, tests, partial, knownSecrets: deps.knownSecrets || [], zipDir: deps.zipDir || zipRoot(), version: deps.version || "3.16.0", project: name });
  card.budget = { ...budget };
  state.status = card.tests.ok ? "done" : "partial"; state.zip = card.id; saveState();
  if (card.secretsRemoved) emit({ type: "warn", text: `${card.secretsRemoved} key/secret code se hata kar YOUR_KEY_HERE likha (ZIP mein asli key nahi).` });
  step("Packager", `${card.file} - ${(card.size / 1024).toFixed(1)} KB, ${card.files} files - ${card.label}`);
  try { deps.memory?.saveProjectSummary?.({ project: name, task, summary: `[ZIP] ${card.label}`, files: [...written] }); } catch {}
  try { const f = path.join(dir, ".faheem-agent.json"); let m = []; try { m = JSON.parse(fs.readFileSync(f, "utf8")); } catch {} m.push({ at: Date.now(), task, summary: `[ZIP] ${card.label}`, files: [...written] }); fs.writeFileSync(f, JSON.stringify(m.slice(-20), null, 1)); } catch {}
  emit({ type: "zip", card });
  return card;
}

// Agent Mode ke kisi bhi project ka ZIP (bina AI): tests chala kar package.
export async function zipExisting(project, { deps = {} } = {}) {
  const dir = deps.dir || path.join(PROJECTS_ROOT, cleanName(project));
  if (!fs.existsSync(dir)) throw new Error(`Project "${project}" nahi mila.`);
  const files = tree(dir, 400).filter((x) => !x.dir).map((x) => x.path);
  if (!files.filter((p) => !SKIP_FILES.has(p.split("/").pop())).length) throw new Error("Project khali hai - pehle kuch banayein.");
  const stack = detectStack("", files);
  let task = ""; try { const m = JSON.parse(fs.readFileSync(path.join(dir, ".faheem-agent.json"), "utf8")); task = m[0]?.task || ""; } catch {}
  const tests = await testProject(dir, { stack, runtimeTest: deps.runtimeTest, nodeCheck: deps.nodeCheck !== false });
  return packageProject(dir, { name: path.basename(dir), stack, task, tests, knownSecrets: deps.knownSecrets || [], zipDir: deps.zipDir || zipRoot(), version: deps.version || "3.16.0", project: path.basename(dir) });
}
