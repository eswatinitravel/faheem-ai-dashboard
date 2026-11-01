// v3.13 Persistent Memory (Ruflo ke "memory" idea se inspired — apna code, MIT credit NOTICE.md mein).
// Sab kuch isi laptop par: C:\Users\<naam>\.faheem-ai\memory (keys.json ki tarah — ZIP update se nahi mitta).
// Koi database nahi, koi embeddings API nahi: JSONL file + BM25 keyword search (lib/uupm wala tareeqa).
import fs from "fs";
import os from "os";
import path from "path";
import { tokenize } from "./uupm/index.js";

export const TYPES = ["preference", "project", "lesson", "note"];
export const TYPE_LABEL = { preference: "Pasand", project: "Project khulasa", lesson: "Seekh (ghalti → hal)", note: "Note" };
export const MAX_ITEMS = 1000;
export const MAX_TEXT = 2000;
export const DEFAULT_SETTINGS = { enabled: true, maxTokens: 300, autoLessons: true, autoSummary: true };

export const memDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.FAHEEM_MEMORY_DIR || path.join(/*turbopackIgnore: true*/ os.homedir(), ".faheem-ai", "memory"));
const itemsFile = () => path.join(memDir(), "memories.jsonl");
const settingsFile = () => path.join(memDir(), "settings.json");

// Pehli dafa: user ki maloom pasand (Memory page se badal/mita sakte hain).
const SEED = [
  { type: "preference", title: "Jawab ki zubaan", text: "Faheem Roman Urdu ya English mein likhta hai — jis zubaan mein woh likhe, usi mein saaf aur simple jawab dein (aksar Roman Urdu).", tags: ["roman urdu", "language", "reply"], pinned: true },
  { type: "preference", title: "Design pasand", text: "Saaf, compact, Stitch jaisa (Google Stitch) design: kam shor, achha spacing, SVG icons (emoji nahi). Dashboards ke liye black + gold/yellow rang pasand nahi.", tags: ["design", "stitch", "ui", "website"], pinned: true },
  { type: "preference", title: "Vestire Collection brand", text: "Vestire Collection: Pakistani luxury/fashion kapron ka brand. Qeemat PKR (Rs) mein. Brand ka naam bilkul 'Vestire Collection' likhein. Brand colours yahan likh dein (Memory page → Badlein).", tags: ["vestire", "brand", "colours", "store", "fashion"], pinned: false },
];

function ensure() { fs.mkdirSync(memDir(), { recursive: true }); }
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clip = (s, n) => String(s ?? "").replace(/\s+\n/g, "\n").trim().slice(0, n);
export const estimateTokens = (s) => Math.ceil(String(s || "").length / 4);

export function getSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(settingsFile(), "utf8")) }; } catch { return { ...DEFAULT_SETTINGS }; }
}
export function setSettings(patch = {}) {
  const cur = getSettings();
  if (typeof patch.enabled === "boolean") cur.enabled = patch.enabled;
  if (typeof patch.autoLessons === "boolean") cur.autoLessons = patch.autoLessons;
  if (typeof patch.autoSummary === "boolean") cur.autoSummary = patch.autoSummary;
  if (patch.maxTokens !== undefined) { const n = Math.round(Number(patch.maxTokens)); if (n >= 50 && n <= 1500) cur.maxTokens = n; }
  ensure(); fs.writeFileSync(settingsFile(), JSON.stringify(cur, null, 2));
  return cur;
}
export const isEnabled = () => getSettings().enabled !== false;

function normalize(it) {
  const type = TYPES.includes(it?.type) ? it.type : "note";
  const tags = (Array.isArray(it?.tags) ? it.tags : String(it?.tags || "").split(",")).map((t) => clip(t, 30).toLowerCase()).filter(Boolean).slice(0, 8);
  return {
    id: typeof it?.id === "string" && /^[a-z0-9-]{4,40}$/i.test(it.id) ? it.id : newId(),
    type, title: clip(it?.title, 120), text: clip(it?.text, MAX_TEXT),
    project: clip(it?.project, 40).toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, ""),
    tags, pinned: !!it?.pinned, source: clip(it?.source || "user", 20),
    at: it?.at || new Date().toISOString(), updated: it?.updated || it?.at || new Date().toISOString(), uses: Number(it?.uses) || 0,
  };
}

// v3.15 Fast memory: file ko har dafa parhne ki jagah RAM cache (file ka mtime+size badle to hi dobara parhein),
// BM25 index ek dafa bana kar rakhein (nayi yaad = sirf us ka token, baaqi purane), aur "uses" ginti ki file write debounce (2s).
const CACHE = new Map(); // file -> { sig, items, ver }
const TOKS = new Map();  // id|updated -> tokens (incremental index)
const IDX = new Map();   // file -> { ver, index }
const PENDING_USES = new Map(); // file -> Map(id -> +n)
let flushTimer = null;
export const memPerf = { reads: 0, cacheHits: 0, indexBuilds: 0, writes: 0, debouncedFlushes: 0 };
const sigOf = (f) => { try { const st = fs.statSync(f); return st.mtimeMs + ":" + st.size + ":" + st.ino; } catch { return null; } };

function parseFile(raw) {
  const out = [];
  for (const line of raw.split("\n")) { if (!line.trim()) continue; try { out.push(normalize(JSON.parse(line))); } catch {} }
  return out;
}

export function readAll() {
  const f = itemsFile();
  const sig = sigOf(f);
  const c = CACHE.get(f);
  if (sig && c && c.sig === sig) { memPerf.cacheHits++; return c.items.slice(); }
  let raw;
  try { raw = fs.readFileSync(f, "utf8"); }
  catch {
    // File hi nahi: pehli dafa seed (agar settings mein seeded nahi likha).
    const s = getSettings();
    if (!s.seeded) {
      const seeded = SEED.map((x) => normalize({ ...x, source: "seed" }));
      writeAll(seeded);
      try { fs.writeFileSync(settingsFile(), JSON.stringify({ ...s, seeded: true }, null, 2)); } catch {}
      return seeded.slice();
    }
    return [];
  }
  memPerf.reads++;
  const items = parseFile(raw);
  CACHE.set(f, { sig: sigOf(f), items, ver: (c?.ver || 0) + 1 });
  return items.slice();
}
function writeAll(list) {
  ensure();
  const f = itemsFile();
  const tmp = f + ".tmp";
  fs.writeFileSync(tmp, list.map((x) => JSON.stringify(x)).join("\n") + (list.length ? "\n" : ""));
  fs.renameSync(tmp, f);
  memPerf.writes++;
  const c = CACHE.get(f);
  CACHE.set(f, { sig: sigOf(f), items: list.slice(), ver: (c?.ver || 0) + 1 });
}

// Uses ginti: RAM mein foran, file mein 2 second baad ek hi dafa (har sawal par poori file likhna band).
function bumpUses(ids) {
  const f = itemsFile();
  const c = CACHE.get(f);
  if (c) for (const it of c.items) if (ids.has(it.id)) it.uses = (it.uses || 0) + 1;
  const m = PENDING_USES.get(f) || new Map();
  for (const id of ids) m.set(id, (m.get(id) || 0) + 1);
  PENDING_USES.set(f, m);
  if (!flushTimer) { flushTimer = setTimeout(flushUses, 2000); flushTimer.unref?.(); }
}
export function flushUses() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  for (const [f, m] of PENDING_USES) {
    PENDING_USES.delete(f);
    try {
      if (!fs.existsSync(f)) continue;
      const items = parseFile(fs.readFileSync(f, "utf8"));
      let hit = false;
      const cached = CACHE.get(f);
      for (const it of items) if (m.has(it.id)) { hit = true; const mem = cached?.items.find((x) => x.id === it.id); it.uses = Math.max((it.uses || 0) + m.get(it.id), mem?.uses || 0); }
      if (!hit) continue;
      const tmp = f + ".tmp";
      fs.writeFileSync(tmp, items.map((x) => JSON.stringify(x)).join("\n") + "\n"); fs.renameSync(tmp, f);
      CACHE.set(f, { sig: sigOf(f), items, ver: (cached?.ver || 0) + 1 });
      memPerf.debouncedFlushes++;
    } catch {}
  }
}
try { process.once?.("beforeExit", flushUses); } catch {}

// BM25 index: har doc ke tokens cache (id|updated), postings (lafz -> [doc, tf]).
function docTokens(x) {
  const k = x.id + "|" + x.updated + "|" + x.title.length + "|" + x.text.length;
  let t = TOKS.get(k);
  if (!t) { t = tokenize(`${x.title} ${x.title} ${x.tags.join(" ")} ${x.tags.join(" ")} ${x.project} ${x.text}`); TOKS.set(k, t); if (TOKS.size > 5000) TOKS.delete(TOKS.keys().next().value); }
  return t;
}
function buildIndex(list) {
  memPerf.indexBuilds++;
  const lens = new Array(list.length), post = new Map();
  let total = 0;
  list.forEach((x, i) => {
    const d = docTokens(x); lens[i] = d.length; total += d.length;
    const tf = new Map(); for (const w of d) tf.set(w, (tf.get(w) || 0) + 1);
    for (const [w, n] of tf) { let p = post.get(w); if (!p) post.set(w, (p = [])); p.push(i, n); }
  });
  return { list, lens, post, N: list.length, avg: total / Math.max(list.length, 1) };
}
function indexFor(list, useCache) {
  if (useCache) {
    const f = itemsFile(), c = CACHE.get(f), e = IDX.get(f);
    if (c && e && e.ver === c.ver && e.index.N === list.length && e.index.list[0] === list[0]) return e.index;
    const index = buildIndex(list);
    if (c) IDX.set(f, { ver: c.ver, index });
    return index;
  }
  return buildIndex(list);
}
export function warmMemory() { try { const l = readAll(); indexFor(l, true); return l.length; } catch { return 0; } }

export function listMemories({ type, project } = {}) {
  let l = readAll();
  if (type && TYPES.includes(type)) l = l.filter((x) => x.type === type);
  if (project) l = l.filter((x) => x.project === String(project).toLowerCase());
  return l.sort((a, b) => (b.pinned - a.pinned) || String(b.updated).localeCompare(String(a.updated)));
}

export function addMemory(input = {}) {
  const it = normalize({ ...input, id: undefined, at: undefined, updated: undefined, uses: 0 });
  if (!it.text) return { ok: false, error: "Yaad ka text khali hai" };
  if (!it.title) it.title = it.text.split("\n")[0].slice(0, 60);
  const all = readAll();
  const dup = all.find((x) => x.type === it.type && x.text.toLowerCase() === it.text.toLowerCase());
  if (dup) return { ok: true, item: dup, duplicate: true };
  if (all.length >= MAX_ITEMS) {
    // Bhar gaya: sab se purani, bina pin, auto (lesson/project) yaad hatayein.
    const idx = all.map((x, i) => [x, i]).filter(([x]) => !x.pinned && x.source !== "user").sort((a, b) => String(a[0].updated).localeCompare(String(b[0].updated)))[0]?.[1];
    if (idx === undefined) return { ok: false, error: `Memory bhar gayi (${MAX_ITEMS}) — purani yaadein mitayein` };
    all.splice(idx, 1);
  }
  all.push(it); writeAll(all);
  return { ok: true, item: it };
}

export function updateMemory(id, patch = {}) {
  const all = readAll();
  const i = all.findIndex((x) => x.id === id);
  if (i < 0) return { ok: false, error: "Yaad nahi mili" };
  const merged = normalize({ ...all[i], ...Object.fromEntries(Object.entries(patch).filter(([k]) => ["type", "title", "text", "project", "tags", "pinned"].includes(k))), id: all[i].id, at: all[i].at, updated: new Date().toISOString() });
  if (!merged.text) return { ok: false, error: "Text khali nahi ho sakta" };
  all[i] = merged; writeAll(all);
  return { ok: true, item: merged };
}

export function deleteMemory(id) {
  const all = readAll();
  const left = all.filter((x) => x.id !== id);
  if (left.length === all.length) return { ok: false, error: "Yaad nahi mili" };
  writeAll(left); return { ok: true };
}

export function clearMemories() { writeAll([]); return { ok: true }; }

// BM25 (k1=1.5, b=0.75) — lib/uupm/index.js wala formula. Title aur tags ka wazan zyada.
export function searchMemories(query, { n = 5, type, project, list } = {}) {
  const fromCache = !list && !type;
  let docsList = list || readAll();
  if (type) docsList = docsList.filter((x) => x.type === type);
  const qt = [...new Set(tokenize(query))];
  if (!qt.length || !docsList.length) return [];
  const cl = CACHE.get(itemsFile())?.items;
  const sameAsCache = !!(list && !type && cl && list.length === cl.length && list[0] === cl[0] && list[list.length - 1] === cl[cl.length - 1]);
  const ix = indexFor(docsList, fromCache || sameAsCache);
  const scores = new Float64Array(ix.N);
  for (const w of qt) {
    const p = ix.post.get(w); if (!p) continue;
    const df = p.length / 2, idf = Math.log((ix.N - df + 0.5) / (df + 0.5) + 1);
    for (let j = 0; j < p.length; j += 2) { const i = p[j], tf = p[j + 1]; scores[i] += idf * (tf * 2.5) / (tf + 1.5 * (1 - 0.75 + 0.75 * ix.lens[i] / ix.avg)); }
  }
  const pj = project ? String(project).toLowerCase() : "";
  const scored = [];
  for (let i = 0; i < ix.N; i++) { let s = scores[i]; if (s > 0) { if (pj && ix.list[i].project === pj) s *= 1.5; scored.push({ item: ix.list[i], score: s }); } }
  return scored.sort((a, b) => b.score - a.score).slice(0, n).map((x) => ({ ...x.item, _score: +x.score.toFixed(3) }));
}

// Prompt mein daalne ke liye chhota hissa: pinned pasand + sab se mutalliq yaadein, maxTokens se zyada nahi.
export function memoryContext(query, { project, maxTokens, n = 6, header = true } = {}) {
  const s = getSettings();
  if (s.enabled === false) return "";
  const cap = Math.max(40, Math.min(Number(maxTokens) || s.maxTokens || 300, 1500));
  const all = readAll();
  if (!all.length) return "";
  // Tarteeb: sab se mutalliq 1 yaad, phir pinned pasand, phir baaqi mutalliq (BM25 score se).
  const rel = searchMemories(query, { n: n + 4, project, list: all });
  const picked = [], seen = new Set();
  const push = (x) => { if (x && !seen.has(x.id)) { picked.push(x); seen.add(x.id); } };
  push(rel[0]);
  all.filter((y) => y.pinned).forEach(push);
  rel.slice(1).forEach(push);
  const head = header ? "MEMORY (Faheem ke baare mein yaad rakhi baatein — sirf jab kaam se mutalliq hon):\n" : "";
  let out = head, used = [];
  for (const x of picked.slice(0, n + 3)) {
    const line = `- [${x.type}${x.project ? ":" + x.project : ""}] ${x.title}: ${x.text.replace(/\s+/g, " ").slice(0, 220)}\n`;
    if (estimateTokens(out + line) > cap) {
      // Ek bhi line na aaye to pehli ko kaat kar daal dein (cap ke andar).
      if (!used.length) { const room = Math.max(0, cap * 4 - out.length - 2); if (room > 20) { out += line.slice(0, room) + "\n"; used.push(x.id); } }
      break;
    }
    out += line; used.push(x.id);
  }
  if (!used.length) return "";
  try { if (used.length) bumpUses(new Set(used)); } catch {}
  return out.trimEnd();
}

// Seekh: test fail hua, phir pass — ghalti aur hal yaad rakhein (dobara wohi ghalti na ho).
export function saveLesson({ project = "", error = "", fix = "" } = {}) {
  const s = getSettings();
  if (s.enabled === false || s.autoLessons === false) return { ok: false, skipped: true };
  const err = clip(String(error).replace(/\s+/g, " "), 300);
  if (!err) return { ok: false, error: "khali" };
  const all = readAll();
  const key = err.toLowerCase().slice(0, 80);
  const old = all.find((x) => x.type === "lesson" && x.text.toLowerCase().includes(key));
  if (old) return updateMemory(old.id, { text: old.text });
  return addMemory({ type: "lesson", project, source: "auto", title: `Ghalti theek hui: ${err.slice(0, 70)}`, text: `Ghalti: ${err}\nHal: ${clip(fix || "Agle round mein theek ho gayi — aage se shuru se hi is ka khayal rakhein.", 600)}`, tags: ["lesson", "test"] });
}

// Kaam mukammal: har project ka EK khulasa (naya kaam purane ko update karta hai).
export function saveProjectSummary({ project = "", task = "", summary = "", files = [] } = {}) {
  const s = getSettings();
  if (s.enabled === false || s.autoSummary === false) return { ok: false, skipped: true };
  const p = clip(project, 40).toLowerCase().replace(/[^a-z0-9-_]+/g, "-") || "general";
  const text = clip(`Aakhri kaam: ${clip(task, 300)}\nNateeja: ${clip(summary, 700)}${files.length ? `\nFiles: ${files.slice(0, 20).join(", ")}` : ""}`, MAX_TEXT);
  const old = readAll().find((x) => x.type === "project" && x.project === p);
  if (old) return updateMemory(old.id, { text });
  return addMemory({ type: "project", project: p, source: "auto", title: `Project ${p}`, text, tags: ["project", p] });
}

// Fail → pass tracker (Agent Mode, Team aur website pipeline mein).
export function lessonTracker(project = "") {
  let pending = null;
  return {
    fail(issues) { const l = (Array.isArray(issues) ? issues : [issues]).map(String).filter(Boolean); if (l.length && !pending) pending = l; },
    pass(fix) { if (!pending) return null; const r = saveLesson({ project, error: pending.slice(0, 3).join(" | "), fix }); pending = null; return r; },
    get pending() { return pending; },
  };
}

export function exportMemories() {
  return { app: "faheem-ai-dashboard", kind: "memory", version: 1, exported: new Date().toISOString(), settings: getSettings(), items: readAll() };
}

export function importMemories(data, { mode = "merge" } = {}) {
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : null;
  if (!items) return { ok: false, error: "Ghalat file: 'items' list nahi mili" };
  const base = mode === "replace" ? [] : readAll();
  const ids = new Set(base.map((x) => x.id)), texts = new Set(base.map((x) => x.type + "|" + x.text.toLowerCase()));
  let added = 0, skipped = 0;
  for (const raw of items.slice(0, MAX_ITEMS)) {
    const it = normalize(raw);
    if (!it.text || ids.has(it.id) || texts.has(it.type + "|" + it.text.toLowerCase()) || base.length >= MAX_ITEMS) { skipped++; continue; }
    base.push(it); ids.add(it.id); texts.add(it.type + "|" + it.text.toLowerCase()); added++;
  }
  writeAll(base);
  return { ok: true, added, skipped, total: base.length };
}

export function memoryStats() {
  const l = readAll();
  const by = Object.fromEntries(TYPES.map((t) => [t, l.filter((x) => x.type === t).length]));
  return { total: l.length, by, dir: memDir() };
}
