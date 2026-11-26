// v3.22 Front chat ki "taqat": chat se seedha asli kaam (bina doosre page).
// - GitHub: repo dhoondo, repo download, skill install, repo utha kar us par kaam
// - Laptop par asli project banana (Agent Mode chat ke andar)
// - Uiverse (MIT) se UI elements, Grainrad (image effects), free domain/hosting mashwara
import fs from "fs";
import path from "path";
import { searchRepos, downloadRepo, downloadSkills, ghApi } from "./github.js";
import { fetchWithTimeout, TIMEOUTS } from "./net.js";
import { runAgent } from "./agent/loop.js";
import { ROOT, cleanName } from "./agent/tools.js";
import { detectLaptop, runLaptop, RISKY } from "./jarvis/actions.js";

const REPO_RE = /(https?:\/\/github\.com\/[^\s)]+|\b[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}\b)/;
const MAKE = /\b(bana|banao|bana\s*do|bana\s*kar|bna|bnao|bnado|bnay|tayyar\s*karo|build|create|make|develop)\b/i;
const REAL = /\b(laptop\s*par|real\s*(mein|men|me)?|asli|project|app\b|application|software|tool\b|system|dashboard|extension|bot\b|api\b|backend|full\s*stack|files?\s*ke\s*saath)/i;

export function detectAction(text, { hasFiles = false } = {}) {
  const t = String(text || "").trim();
  if (!t || hasFiles) return null;
  const low = t.toLowerCase();
  const gh = /\b(github|git\s*hub|repo|repository|repostri|repositry)\b/i.test(t);
  const repo = (t.match(REPO_RE) || [])[1];
  const repoOk = repo && (repo.includes("github.com") || (gh && !/^\d+\/\d+$/.test(repo)));
  if (gh && /\bskill/i.test(t) && /(lagao|laga\s*do|install|utha|outha|download|le\s*aao|lao|add)/i.test(t)) {
    const q = repoOk ? repo : low.replace(/.*?(github\s*(se|sy|say|from)?)/, "").replace(/\b(skill[s]?|lagao|laga do|install|karo|utha(o|kar)?|outha(o|kar)?|download|lao|add|wali|wala|ki|ka|ke)\b/g, " ").trim();
    return { kind: "gh_skill", repo: repoOk ? repo : null, q };
  }
  if (gh && repoOk && /(utha\s*kar|outha\s*kar|le\s*kar|lekar|use\s*kar|is\s*(se|sy|par|mein|men))/i.test(t) && (MAKE.test(t) || /(add|change|badal|theek|improve|kar\s*do|karo|laga\s*do|hata\s*do)/i.test(t))) return { kind: "gh_build", repo, task: t };
  if (gh && /(download|utha|outha|clone|le\s*aao|lao)/i.test(t)) return repoOk ? { kind: "gh_repo", repo } : { kind: "gh_search", q: queryFrom(t), then: "repo" };
  if (gh && /(search|dhoond|dhund|find|talash|check|kaun\s*sa|best)/i.test(t)) return { kind: "gh_search", q: queryFrom(t) };
  // v3.24 Jarvis ki laptop taqat front chat mein bhi: "chrome kholo", "screenshot lo", "awaz kam karo".
  if (!gh) { const lap = detectLaptop(t); if (lap && !(lap.name === "find_files" && /website|code/i.test(t))) return { kind: "laptop", a: lap, sure: /\b(pakka|confirm|zaroor)\b/i.test(t) }; }
  if (/(github\s*pages?|publish|live\s*kar|online\s*kar|live\s*kardo|host\s*kar)/i.test(t) && /(website|site|page|web|is\s*ko|isko|project|html)/i.test(t)) return { kind: "publish", task: t, project: (t.match(/project\s+["']?([A-Za-z0-9_-]{3,40})/i) || [])[1] || null };
  if (/uiverse/i.test(t)) return { kind: "uiverse", cat: uiCat(low), task: t };
  if (/grainrad|ascii\s*art|dither|halftone|vhs\s*effect/i.test(t)) return { kind: "grainrad" };
  if (/(free\s*domain|domain\s*(free|muft)|free\s*hosting|ifreedomains|website\s*live\s*kar|online\s*kar)/i.test(t)) return { kind: "domain" };
  if (MAKE.test(t) && REAL.test(t) && !/\b(plan|idea|samjhao|explain|kya\s*hai|kaise)\b/i.test(t)) return { kind: "build", task: t };
  return null;
}

function queryFrom(t) {
  return t.replace(/https?:\/\/\S+/g, " ").replace(/\b(github|git hub|repo|repository|repostri|se|sy|say|par|pe|search|dhoond(o)?|dhund(o)?|find|karo|kar|do|check|best|wali|wala|ka|ki|ke|mein|men|download|utha(o)?|outha(o)?|clone|lao|le aao|koi|ek|aik|lo|le|lena)\b/gi, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

const UI_CATS = { button: "Buttons", card: "Cards", checkbox: "Checkboxes", form: "Forms", login: "Forms", input: "Inputs", notification: "Notifications", toast: "Notifications", pattern: "Patterns", background: "Patterns", radio: "Radio-buttons", toggle: "Toggle-switches", switch: "Toggle-switches", tooltip: "Tooltips", loader: "loaders", loading: "loaders", spinner: "loaders" };
function uiCat(low) { for (const [k, v] of Object.entries(UI_CATS)) if (low.includes(k)) return v; return "Buttons"; }

// Uiverse galaxy (MIT, uiverse-io/galaxy): ek category se 3 element.
export async function uiverseElements(cat = "Buttons", n = 3) {
  const h = { "User-Agent": "faheem-ai-dashboard", Accept: "application/vnd.github+json" };
  const r = await fetchWithTimeout(`https://api.github.com/repos/uiverse-io/galaxy/contents/${encodeURIComponent(cat)}`, { headers: h }, { ms: TIMEOUTS.github, what: "GitHub (Uiverse)" });
  if (!r.ok) throw new Error(`Uiverse list nahi mili (${r.status})`);
  const files = (await r.json()).filter((f) => /\.html$/i.test(f.name));
  const pick = [];
  while (pick.length < Math.min(n, files.length)) { const f = files[Math.floor(Math.random() * files.length)]; if (!pick.includes(f)) pick.push(f); }
  const out = [];
  for (const f of pick) {
    const code = await fetchWithTimeout(f.download_url, {}, { ms: TIMEOUTS.web, what: "Uiverse" }).then((x) => x.text()).catch(() => "");
    if (code) out.push({ name: f.name.replace(/\.html$/, ""), code: code.slice(0, 6000) });
  }
  return out;
}

function fileList(dir, max = 40) {
  const out = [];
  const walk = (d, rel = "") => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (out.length >= max || ["node_modules", ".git", ".agent"].includes(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r); else out.push(r);
    }
  };
  try { walk(dir); } catch {}
  return out;
}

function nameFrom(t) {
  const w = String(t).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((x) => x.length > 2 && !/^(bana|banao|bnao|bnado|karo|mere|meri|liye|laptop|par|real|mein|men|project|app|ek|aik|aur|our|the|and|with|ka|ki|ke|do|create|make|build|ko|jo|hai|hy)$/.test(x));
  return cleanName(w.slice(0, 3).join("-") || "chat-project") + "-" + new Date().toISOString().slice(5, 10).replace("-", "");
}

// Agent Mode ko chat ke andar chalao; har qadam chat ke LIVE panel par.
async function agentRun({ project, task, step, signal }) {
  let done = null; const files = new Set();
  await runAgent({ project, task, images: [], signal, emit: (e) => {
    if (e.type === "tool") step("Agent", `${e.name}: ${e.label || ""}`.slice(0, 160));
    else if (e.type === "file") { files.add(e.path); step("Agent", `File: ${e.path}`); }
    else if (e.type === "thought" || e.type === "brain") step("Agent", String(e.text || "").slice(0, 160));
    else if (e.type === "result" && e.ok === false) step("Tester", String(e.text || "").slice(0, 160));
    else if (e.type === "error") step("Error", String(e.text || "").slice(0, 160));
    else if (e.type === "done") done = e;
  } });
  return { done, files: [...new Set([...(done?.files || []), ...files])] };
}

// Action chalao. step(who,text) LIVE panel; return = chat ka jawab (markdown).
export async function runAction(a, { step, signal, isPaused, messages = [] }) {
  if (isPaused?.() && ["gh_repo", "gh_skill", "gh_build", "build"].includes(a.kind)) return "Pause All chalu hai. Daayen panel par Resume dabayein.";
  if (a.kind === "gh_search") {
    step("GitHub", `"${a.q}" dhoond raha hoon...`);
    const list = (await searchRepos(a.q)).slice(0, 6);
    if (!list.length) return `GitHub par "${a.q}" ka koi repo nahi mila.`;
    if (a.then === "repo") { step("GitHub", `Sab se upar wala: ${list[0].full}`); return runAction({ kind: "gh_repo", repo: list[0].full }, { step, signal, isPaused, messages }); }
    const rows = list.map((r, i) => `${i + 1}. **${r.full}** · ${r.stars} stars${r.desc ? ` · ${String(r.desc).slice(0, 110)}` : ""}`).join("\n");
    return `GitHub par "${a.q}" ke top repos:\n\n${rows}\n\nKisi ko lena ho to likhein: "github se <owner/repo> download karo", ya skill ho to "github se <owner/repo> skill lagao".`;
  }
  if (a.kind === "gh_repo") {
    step("GitHub", `${a.repo} download ho raha hai...`);
    const r = await downloadRepo(a.repo);
    // Agent ke project folder mein bhi copy, taa ke chat us par kaam kar sake.
    const proj = cleanName(r.repo.split("/")[1]);
    const dest = path.join(ROOT, proj);
    if (!fs.existsSync(dest)) { fs.mkdirSync(ROOT, { recursive: true }); fs.cpSync(r.path, dest, { recursive: true }); }
    step("GitHub", `Ho gaya: ${r.files} files, ${r.mb} MB`);
    return `**${r.repo}** laptop par aa gaya (${r.files} files, ${r.mb} MB).\n\n- Repo: \`${r.path}\`\n- Kaam ke liye copy: \`${dest}\`\n\nAb likhein, misaal: "github se ${r.repo} utha kar is mein Urdu language add kar do", main isi chat mein asli files badal doon ga.`;
  }
  if (a.kind === "gh_skill") {
    let src = a.repo;
    if (!src) {
      step("GitHub", `"${a.q}" skill ka repo dhoond raha hoon...`);
      const list = await searchRepos(`${a.q} skill`);
      src = list?.[0]?.full;
      if (!src) return `"${a.q}" ki koi skill GitHub par nahi mili. Repo ka naam (owner/repo) likh dein.`;
    }
    step("GitHub", `${src} se skills install ho rahi hain...`);
    const r = await downloadSkills(src);
    step("Skill", `${r.skills.length} skills lag gayin`);
    return `**${r.repo}** se ${r.skills.length} skills lag gayin: ${r.skills.slice(0, 20).map((s) => s.name).join(", ")}${r.skills.length > 20 ? "..." : ""}.\n\nAb Copilot inhein khud istemal kare ga. Naam se bhi keh sakte hain, misaal: "${r.skills[0]?.name} skill se ...".`;
  }
  if (a.kind === "gh_build") {
    step("GitHub", `${a.repo} utha raha hoon...`);
    const r = await downloadRepo(a.repo);
    const proj = cleanName(r.repo.split("/")[1]) + "-" + Date.now().toString(36).slice(-4);
    fs.mkdirSync(ROOT, { recursive: true });
    fs.cpSync(r.path, path.join(ROOT, proj), { recursive: true });
    step("Agent", `Project "${proj}" par kaam shuru`);
    const { done, files } = await agentRun({ project: proj, task: a.task, step, signal });
    return report(proj, done, files, `${r.repo} se`);
  }
  if (a.kind === "build") {
    const proj = nameFrom(a.task);
    step("Agent", `Laptop par naya project "${proj}" bana raha hoon (files likhna, chalana, test, theek karna)...`);
    const { done, files } = await agentRun({ project: proj, task: a.task, step, signal });
    return report(proj, done, files);
  }
  if (a.kind === "laptop") {
    step("Jarvis", `Laptop par kaam: ${a.a.name}`);
    const r = await runLaptop(a.a, { confirmed: !!a.sure });
    if (r.needConfirm) return r.say.replace("Haan ya nahi boliye.", "") + ` Pakka karna ho to likhein: "${a.a.name === "shutdown" ? "laptop band karo" : a.a.name === "restart" ? "laptop restart karo" : "screen lock karo"} pakka".`;
    return r.say + (r.files?.length ? "\n\n" + r.files.map((f) => "- `" + f + "`").join("\n") : "") + (r.file ? `\n\nFile: \`${r.file}\`` : "");
  }
  if (a.kind === "uiverse") {
    step("Uiverse", `${a.cat} se 3 elements la raha hoon (MIT)...`);
    const els = await uiverseElements(a.cat, 3);
    if (!els.length) return "Uiverse se abhi kuch nahi mila.";
    return `Uiverse (MIT) se ${a.cat} ke ${els.length} elements:\n\n` + els.map((e) => `**${e.name}**\n\`\`\`html\n${e.code}\n\`\`\``).join("\n\n") + `\n\nKisi ko website mein lagana ho to likhein: "pehla wala button meri website mein laga do".`;
  }
  if (a.kind === "grainrad") {
    return "Grainrad ek free browser tool hai (grainrad.com): tasveer, GIF, video ya 3D file par ASCII, Dithering, Halftone, VHS jaise 15 effects lagata hai aur PNG, GIF, MP4, SVG ya Three.js HTML mein export karta hai. Is ka API nahi, is liye dashboard se seedha nahi chalta: file wahan drop karein, effect chunein, export karein, phir yahan chat mein file bhej dein to main use website mein laga doon.";
  }
  if (a.kind === "domain") {
    return "Website free aur bharose se live karne ke liye **GitHub Pages** istemal karein: HTTPS ke saath, link `username.github.io/naam` jaisa. Website banne ke baad chat mein likhein: \"is website ko GitHub Pages par daal do\". Sirf seedhi websites (HTML, CSS, JS) chalti hain; free plan par repo public hota hai.";
  }
  if (a.kind === "publish") return publishPages(a, { step, messages });
  return null;
}

function report(proj, done, files, from = "") {
  const dir = path.join(ROOT, proj);
  const all = fileList(dir);
  const runHint = all.includes("package.json") ? "`npm install` phir `npm run dev`" : all.includes("index.html") ? "`index.html` double-click" : all.find((f) => f.endsWith(".py")) ? `\`python ${all.find((f) => f.endsWith(".py"))}\`` : "Agent page par Kholo";
  return `**Project ${from ? from + " " : ""}tayyar${done?.partial ? " (adhoora, aur kaam baqi)" : ""}:** \`${dir}\`\n\n${done?.summary ? String(done.summary).slice(0, 900) + "\n\n" : ""}**Badli/bani files (${files.length}):** ${files.slice(0, 25).map((f) => `\`${f}\``).join(", ") || "koi nahi"}\n\n**Chalane ka tareeqa:** ${runHint}. Agent page par "${proj}" khol kar preview aur Undo bhi hai.`;
}

// v3.23 GitHub Pages: chat ki aakhri website (```html) ya agent project folder -> naya public repo -> Pages on -> link.
async function publishPages(a, { step, messages }) {
  const files = [];
  if (a.project && fs.existsSync(path.join(ROOT, cleanName(a.project)))) {
    const dir = path.join(ROOT, cleanName(a.project));
    if (fs.existsSync(path.join(dir, "package.json")) && !fs.existsSync(path.join(dir, "index.html"))) return "Ye project build wala hai (package.json), GitHub Pages par seedha nahi chalta. Pehle Agent se kahein \"static build bana do\" ya sirf HTML wali website publish karein.";
    for (const rel of fileList(dir, 300)) { const b = fs.readFileSync(path.join(dir, rel)); if (b.length < 20 * 1024 * 1024) files.push({ path: rel, b64: b.toString("base64") }); }
  } else {
    const last = [...messages].reverse().find((m) => m.role === "assistant" && /```html/i.test(String(m.content || "")));
    const html = last ? (String(last.content).match(/```html\s*([\s\S]*?)```/i) || [])[1] : "";
    if (!html || html.length < 100) return "Publish karne ke liye koi website nahi mili. Pehle chat mein website banwayein (\"ek landing page bana do\"), phir likhein \"is website ko GitHub Pages par daal do\". Agent project ho to: \"project <naam> ko GitHub Pages par daal do\".";
    files.push({ path: "index.html", b64: Buffer.from(html).toString("base64") });
  }
  if (!files.find((f) => f.path === "index.html")) return "Is project mein index.html nahi, is liye Pages par nahi khulega.";
  files.push({ path: ".nojekyll", b64: "" });
  step("GitHub", "Account check...");
  const me = await ghApi("GET", "/user");
  if (!me.ok) throw new Error(me.status === 401 ? "GitHub token ghalat ya expire hai." : `GitHub ${me.status}`);
  const owner = me.data.login;
  const want = (a.task.match(/naam\s+["']?([A-Za-z0-9_-]{3,60})/i) || [])[1] || (a.project ? cleanName(a.project) : "site-" + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ""));
  const name = want.replace(/[^A-Za-z0-9._-]/g, "-");
  step("GitHub", `Repo ${owner}/${name} bana raha hoon (public)...`);
  const cr = await ghApi("POST", "/user/repos", { name, private: false, auto_init: true, description: "Faheem AI Dashboard se publish" });
  if (!cr.ok && cr.status !== 422) throw new Error(cr.status === 403 ? "Token ko repo banane ki ijazat nahi (Administration: Read & write chahiye)." : `Repo nahi bana: ${cr.status} ${cr.data?.message || ""}`);
  const branch = cr.data?.default_branch || "main";
  let n = 0;
  for (const f of files) {
    const ex = await ghApi("GET", `/repos/${owner}/${name}/contents/${encodeURI(f.path)}?ref=${branch}`);
    const put = await ghApi("PUT", `/repos/${owner}/${name}/contents/${encodeURI(f.path)}`, { message: `publish ${f.path}`, content: f.b64, branch, ...(ex.ok && ex.data?.sha ? { sha: ex.data.sha } : {}) });
    if (!put.ok) throw new Error(`File ${f.path} upload nahi hui: ${put.status} ${put.data?.message || ""}${put.status === 403 ? " (Contents: Read & write chahiye)" : ""}`);
    if (++n % 10 === 0 || n === files.length) step("GitHub", `${n}/${files.length} files upload`);
  }
  step("GitHub", "Pages on kar raha hoon...");
  const pg = await ghApi("POST", `/repos/${owner}/${name}/pages`, { source: { branch, path: "/" } });
  if (!pg.ok && pg.status !== 409) throw new Error(pg.status === 403 || pg.status === 404 ? "Files chali gayin, lekin Pages on nahi hua: token ko Pages: Read & write chahiye (ya repo Settings → Pages mein main branch chunein)." : `Pages ${pg.status}: ${pg.data?.message || ""}`);
  const url = pg.data?.html_url || `https://${owner}.github.io/${name}/`;
  return `Website GitHub Pages par chali gayi.\n\n- Link: ${url}\n- Repo: https://github.com/${owner}/${name}\n\nPehli dafa khulne mein 1-2 minute lagte hain. Dobara badal kar publish karne ke liye likhein: "is website ko GitHub Pages par daal do naam ${name}".`;
}
