// v3.14 Brain status check: sasta /models ya 1-token call (bari token kharch nahi). Natija light mein.
import fs from "fs";
import os from "os";
import path from "path";
import { CATALOG, keyField, modelField } from "./catalog";
import { getConfig } from "./config";
import { parsePool, statusFromHttp, combineLights, poolMark, maskKey, expiryHelp } from "./brain-status";

export const CHECK_EVERY_MS = 30 * 60 * 1000; // har 30 min
const statusFile = () => path.join(process.env.FAHEEM_STATUS_DIR || path.join(os.homedir(), ".faheem-ai"), "brain-status.json");
let cache = null;
function load() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(statusFile(), "utf8")) || {}; } catch { cache = {}; }
  return cache;
}
function save() { try { fs.mkdirSync(path.dirname(statusFile()), { recursive: true }); fs.writeFileSync(statusFile(), JSON.stringify(cache, null, 1)); } catch {} }
export const cachedStatus = (id) => load()[id] || null;
export const allStatus = () => ({ ...load() });

async function probe(url, opt, timeoutMs = 15000) {
  try {
    const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(timeoutMs) });
    const body = await r.text().catch(() => "");
    return statusFromHttp(r.status, body, Number(r.headers.get("retry-after")) || 0);
  } catch (e) {
    return { ...statusFromHttp(0), label: /timeout|abort/i.test(String(e?.name) + e?.message) ? "Jawab nahi aaya (timeout)" : "Raabta nahi (internet/server band)" };
  }
}

function headersFor(c, key) {
  const h = { "Content-Type": "application/json" };
  if (c.id === "gemini") h["x-goog-api-key"] = key; else if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

// Ek key (ya bina key) ka check
export async function checkOne(c, key, cfg) {
  const base = c.needs ? c.base.replace("{account}", encodeURIComponent(cfg[c.needs] || "")) : c.base;
  if (c.needs && key && !cfg[c.needs]) return { light: "red", label: `${c.needs} bhi chahiye` };
  const model = cfg[modelField(c.id)] || c.model;
  const chat = () => probe(c.direct ? base : `${base}/chat/completions`, { method: "POST", headers: headersFor(c, key), body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: "user", content: "hi" }] }) }, c.direct ? 25000 : 20000);
  // Bina key brains ka asli live test (1 token). "auto" model aur AI Horde (dheema): sirf /models.
  if (!key) {
    if (c.anonKey || model === "auto") return probe(`${base}/models`, { headers: headersFor(c, c.anonKey || "") });
    return chat();
  }
  // Jin ki /models sab ke liye khuli hai, wahan key 1-token chat se parakhte hain.
  if (c.publicModels && model !== "auto") return chat();
  return probe(`${base}/models`, { headers: headersFor(c, key) });
}

export async function checkBrain(id) {
  const cfg = getConfig();
  const now = Date.now();
  if (id === "ollama") {
    const url = (cfg.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
    let st;
    if ((cfg.OLLAMA_ENABLED || "true") === "false") st = { light: "grey", label: "Options mein band" };
    else {
      try { const r = await fetch(url + "/api/tags", { signal: AbortSignal.timeout(4000) }); const j = await r.json(); const n = (j.models || []).length; st = n ? { light: "green", label: `${n} model laptop par` } : { light: "red", label: "Ollama chal raha, model nahi (ollama pull llama3.2:3b)" }; }
      catch { st = { light: "red", label: "Ollama band hai / install nahi" }; }
    }
    load()[id] = { ...st, at: now, keys: [] }; save();
    return load()[id];
  }
  const c = CATALOG.find((x) => x.id === id);
  if (!c) return null;
  const keys = c.noKey ? [] : parsePool(cfg[keyField(c.id)] || "");
  let st;
  if (!keys.length) {
    st = c.keyless ? await checkOne(c, "", cfg) : { light: "grey", label: "Key nahi lagi" };
    st = { ...st, keys: [] };
  } else {
    const per = await Promise.all(keys.map((k) => checkOne(c, k, cfg)));
    per.forEach((r, i) => poolMark(c.id, keys[i], r.code === 429 ? 429 : r.light === "green" ? 200 : r.code, r.retrySec || 60));
    st = { ...combineLights(per), keys: per.map((r, i) => ({ key: maskKey(keys[i]), light: r.light, label: r.label })) };
  }
  if (st.light === "red" && (st.code === 401 || st.code === 403 || st.expired)) st.help = expiryHelp(c.keyUrl);
  delete st.retrySec;
  load()[id] = { ...st, at: now };
  save();
  return load()[id];
}

export async function checkAll(ids) {
  const list = ids || [...CATALOG.map((c) => c.id), "ollama"];
  const out = {};
  await Promise.all(list.map(async (id) => { out[id] = await checkBrain(id).catch((e) => ({ light: "red", label: String(e.message).slice(0, 80), at: Date.now() })); }));
  return out;
}

let bg = null;
export function checkStaleInBackground() {
  const s = load();
  const stale = [...CATALOG.map((c) => c.id), "ollama"].filter((id) => !s[id] || Date.now() - (s[id].at || 0) > CHECK_EVERY_MS);
  if (stale.length && !bg) bg = checkAll(stale).finally(() => { bg = null; });
  return stale.length;
}
