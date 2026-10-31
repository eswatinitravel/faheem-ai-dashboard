import { getConfig } from "./config";

import { CATALOG, keyField, modelField } from "./catalog";
import { parsePool, poolPick, poolMark, codeFromError } from "./brain-status";
import { liveBrains, dedupeLive } from "./free-live";

// Free providers in order (lib/catalog.js). When one hits its limit (429) or fails, the next one answers.
// Pehle key wale brains, phir bina-key (Kilo, OVH, Pollinations, LLM7), aakhir mein laptop ka Ollama.
export function getProviders() {
  const e = getConfig();
  const off = new Set(String(e.DISABLED_BRAINS || "").split(",").map((x) => x.trim()).filter(Boolean));
  const freeOn = (e.FREE_ENABLED || "true") !== "false";
  const keyed = [], keyless = [];
  for (const c of CATALOG) {
    if (off.has(c.id)) continue;
    // v3.14 Key pool: "key1,key2,key3" — 429 par agli key, 401 par key band (lib/brain-status.js).
    const pool = c.noKey ? [] : parsePool(e[keyField(c.id)] || "");
    const key = pool.length ? (poolPick(c.id, pool) || pool[0]) : "";
    if (c.needs && key && !e[c.needs]) continue; // Cloudflare: Account ID ke baghair nahi chalta
    const base = c.needs ? c.base.replace("{account}", encodeURIComponent(e[c.needs] || "")) : c.base;
    const model = e[modelField(c.id)] || c.model;
    const p = { id: c.id, name: c.name, base, key, model, pick: c.pick };
    if (pool.length > 1) p.pool = pool;
    if (c.direct) p.direct = true;
    if (c.minTimeoutMs) p.minTimeoutMs = c.minTimeoutMs;
    if (c.lastResort) p.lastResort = true;
    if (c.roomVisionModel) p.roomVisionModel = c.roomVisionModel;
    if (c.vision) p.vision = true;
    if (c.visionModel) p.visionModel = e[modelField(c.id).replace("_MODEL", "_VISION_MODEL")] || c.visionModel;
    if (key) keyed.push(p);
    else if (c.keyless && freeOn) keyless.push({ ...p, key: c.anonKey || "", keyless: true, name: `${c.name} (free, bina key)` });
  }
  const list = [...keyed, ...keyless];
  // v3.14 Live auto list (stillworks): abhi jawab dene wale bina-key endpoints, Ollama se pehle. Options mein band ho sakta hai.
  if (freeOn && (e.LIVE_FREE_ENABLED || "true") !== "false" && !off.has("live")) {
    for (const b of dedupeLive(liveBrains(), CATALOG)) if (!off.has(b.id) && !list.some((x) => x.id === b.id)) list.push({ ...b, key: "" });
  }
  if ((e.OLLAMA_ENABLED || "true") !== "false" && !off.has("ollama")) {
    list.push({ id: "ollama", name: "Ollama (local)", base: `${(e.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "")}/v1`, key: "ollama", model: e.OLLAMA_MODEL || "llama3.2:3b" });
  }
  return list;
}

// Kisi bhi pasandida tarteeb mein lagayein: jo order mein nahi (naye key wale) unke baad,
// bina-key brains catalog ki tarteeb mein, Ollama hamesha aakhir mein.
export function sortProviders(list, order = []) {
  const cat = CATALOG.map((c) => c.id);
  const rank = (p) => {
    if (p.id === "ollama") return 1000;
    if (p.lastResort) return 950; // AI Horde: bohat dheema, sirf aakhri sahara
    if (p.live) return 900;       // v3.14 live auto list: Ollama se pehle
    if (p.keyless) return 500 + cat.indexOf(p.id);
    const i = order.indexOf(p.id);
    return i >= 0 ? i : 100 + cat.indexOf(p.id);
  };
  return [...list].sort((a, b) => rank(a) - rank(b));
}

// "auto" model: brain ki /models list se pehla free chat model (ek dafa dhoond kar yaad).
const autoModels = new Map();
export async function resolveModel(p) {
  if (p.model !== "auto") return p.model;
  if (autoModels.has(p.id)) return autoModels.get(p.id);
  const ids = await listModels(p);
  const chat = ids.filter((m) => !/embed|whisper|tts|guard|rerank|diffusion|image|vision-only|moderation|safety/i.test(m));
  const pick = (p.pick && chat.find((m) => p.pick.test(m))) || chat[0];
  if (!pick) throw new Error("is brain ki model list khali mili");
  autoModels.set(p.id, pick);
  return pick;
}

export async function listModels(p, timeoutMs = 15000) {
  const headers = {};
  if (p.id === "gemini") headers["x-goog-api-key"] = p.key; else if (p.key) headers.Authorization = `Bearer ${p.key}`;
  const r = await fetch(`${p.base}/models`, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text().catch(() => "")).slice(0, 160)}`);
  const j = await r.json();
  return (j.data || j.models || []).map((m) => String(m.id || m.name || "").replace(/^models\//, "")).filter(Boolean);
}

// Jo brains picture dekh sakte hain: Gemini, aur Groq ka vision model (Qwen 3.8, free key se).
export function visionProviders(list) {
  return list.filter((x) => x.vision || x.visionModel).map((x) => (x.vision ? x : { ...x, id: x.id + "-vision", model: x.visionModel, name: `${x.name} Vision`, vision: true }));
}

// Cooldown memory: skip a provider for a while after it says "limit reached".
const cooldown = new Map();
const lastModel = new Map();
export const lastModelUsed = (id) => lastModel.get(id);

// 429 par: same brain ke doosre free models (env se badal sakte hain, comma se).
function FALLBACK_MODELS(id) {
  const e = getConfig();
  const list = (v, d) => String(v || d).split(",").map((x) => x.trim()).filter(Boolean);
  if (id === "gemini") return list(e.GEMINI_FALLBACK_MODELS, "gemini-2.5-flash-lite,gemini-3.1-flash-lite");
  if (id === "openrouter") return list(e.OPENROUTER_FALLBACK_MODELS, "openrouter/free");
  const c = CATALOG.find((x) => x.id === id);
  return c?.fallbacks ? list(c.fallbacks) : [];
}

// 429 ka asli sabab aur sahi intezar: Retry-After, OpenRouter X-RateLimit-Reset, Gemini retryDelay.
export function limitInfo(p, res, body = "") {
  let retry = Number(res.headers.get("retry-after")) || 0;
  let j = null; try { j = JSON.parse(body); } catch {}
  const err = (Array.isArray(j) ? j[0] : j)?.error || {};
  if (p.keyless && err.retry_after) retry = Number(err.retry_after) || retry;
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (!retry && reset > 1e12) retry = Math.ceil((reset - Date.now()) / 1000);
  for (const d of err.details || []) { const m = /^(\d+(?:\.\d+)?)s$/.exec(d?.retryDelay || ""); if (m && !retry) retry = Math.ceil(Number(m[1])); }
  const msg = String(err.message || err.metadata?.raw || body || "");
  let why = "";
  if (/limit:\s*0\b/i.test(msg)) why = "is model ka free quota 0 hai — doosra model chunein";
  else if (/per\s*day|perday|requests_per_day|free-models-per-day|daily/i.test(msg)) { why = "aaj ka free quota khatam"; if (!retry || retry < 600) retry = 3600; }
  else if (/upstream|temporarily rate-limited/i.test(msg)) why = "model abhi upstream par busy hai";
  else if (/per\s*minute|perminute|rpm|tpm/i.test(msg)) why = "ek minute ki had — thora ruk kar";
  else if (msg && !p.keyless) why = msg.replace(/\s+/g, " ").slice(0, 120);
  return { retry: Math.max(1, Math.min(retry || 60, 86400)), why };
}

export function isCooling(id) {
  const until = cooldown.get(id);
  return until && until > Date.now();
}

export async function callProvider(p, messages, timeoutMs = 60000) {
  if (p.minTimeoutMs) timeoutMs = Math.max(timeoutMs, p.minTimeoutMs);
  if (!p.pool || p.pool.length < 2) return callSingle(p, messages, timeoutMs);
  // v3.14 Key pool: 429 = is key ko aaram, agli key; 401/403 = key band, agli key. Sab khatam = asli error.
  const tried = [];
  let cur = p, lastErr;
  for (let i = 0; i < p.pool.length; i++) {
    tried.push(cur.key);
    try {
      const r = await callSingle(cur, messages, timeoutMs);
      poolMark(p.id, cur.key, 200);
      return r;
    } catch (err) {
      lastErr = err;
      const code = codeFromError(err.message);
      if (![401, 403, 429, 402].includes(code)) throw err;
      const m = /retry in (\d+)s/.exec(err.message);
      poolMark(p.id, cur.key, code, m ? Number(m[1]) : 60);
      const next = poolPick(p.id, p.pool, tried);
      if (!next) break;
      cooldown.delete(p.id); // brain abhi zinda hai — doosri key se
      cur = { ...p, key: next };
    }
  }
  throw lastErr;
}

async function callSingle(p, messages, timeoutMs) {
  try {
    return await callOnce(p, messages, timeoutMs);
  } catch (err) {
    // Free bina-key server kabhi kabhi "busy" kehta hai: thora ruk kar ek dafa phir.
    if (/busy|HTTP 50[23]/.test(err.message)) {
      await new Promise((r) => setTimeout(r, 4000));
      return callOnce(p, messages, timeoutMs);
    }
    throw err;
  }
}

// Lambi chat ko chhota karein taake "Request too large" (413) na aaye: system + aakhri messages, ~24k harf.
function trimMessages(messages, limit = 24000) {
  const sys = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  const size = (m) => (typeof m.content === "string" ? m.content.length : JSON.stringify(m.content).length > 200000 ? 2000 : 2000);
  let total = sys.reduce((n, m) => n + size(m), 0);
  const keep = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    let m = rest[i];
    if (typeof m.content === "string" && i < rest.length - 1 && m.content.length > 6000) m = { ...m, content: m.content.slice(0, 3000) + "\n…(purana hissa chhota kiya)…" };
    if (keep.length && total + size(m) > limit) break;
    total += size(m);
    keep.unshift(m);
  }
  return [...sys, ...keep];
}

async function callOnce(p, messages, timeoutMs) {
  if (p.model === "auto") p = { ...p, model: await resolveModel(p) };
  messages = trimMessages(messages, p.id === "groq" ? 20000 : 60000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = { "Content-Type": "application/json" };
    // Google ki nayi "AQ." keys Bearer ke bajaye x-goog-api-key header mein chalti hain; purani AIza bhi.
    if (p.id === "gemini") headers["x-goog-api-key"] = p.key;
    else if (p.key) headers.Authorization = `Bearer ${p.key}`;
    const send = (h) => fetch(p.direct ? p.base : `${p.base}/chat/completions`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ model: p.model, messages, temperature: 0.7 }),
      signal: ctrl.signal,
    });
    let res = await send(headers);
    if (p.id === "gemini" && (res.status === 401 || res.status === 400)) {
      const h2 = { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` };
      const r2 = await send(h2);
      if (r2.ok || r2.status !== 401) res = r2;
    }
    if (res.status === 503 && p.keyless) throw new Error("busy (HTTP 503)");
    if (res.status === 429 || (p.keyless && res.status === 402)) {
      const body = await res.text().catch(() => "");
      const info = limitInfo(p, res, body);
      // v3.10.1: isi brain ka doosra free model try karein (Gemini/OpenRouter ki had har model ki alag hoti hai).
      const tried = p._tried || [p.model];
      const next = (FALLBACK_MODELS(p.id) || []).find((m) => !tried.includes(m));
      if (next) { clearTimeout(t); try { const r = await callOnce({ ...p, model: next, _tried: [...tried, next] }, messages, timeoutMs); lastModel.set(p.id, next); return r; } catch (e2) { if (!/limit reached/.test(e2.message)) throw e2; } }
      cooldown.set(p.id, Date.now() + info.retry * 1000);
      throw new Error(`limit reached (retry in ${info.retry}s)${info.why ? " — " + info.why : ""}`);
    }
    if (!res.ok) {
      const errText = await res.text();
      // Groq ka gpt-oss kabhi kabhi apna "tool call" bana deta hai (HTTP 400 tool_use_failed).
      // Pehle uski koshish ko bacha kar hamari <action> shakal mein badlein; warna dusre Groq model se dobara.
      if (p.id === "groq" && res.status === 400 && /tool_use_failed|Tool choice is none|called a tool/i.test(errText)) {
        const salvaged = salvageToolCall(errText);
        if (salvaged) return salvaged;
        if (!p._retried) {
          const fb = { ...p, model: getConfig().GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b", _retried: true };
          clearTimeout(t);
          return callOnce(fb, messages, timeoutMs);
        }
      }
      // Ollama: model download nahi hua? Laptop par jo model pehle se hai woh khud istemal karein.
      if (p.id === "ollama" && res.status === 404 && /not found/i.test(errText) && !p._retried) {
        const other = await installedOllamaModel(p);
        if (other && other !== p.model) { clearTimeout(t); return callOnce({ ...p, model: other, _retried: true }, messages, timeoutMs); }
        cooldown.set(p.id, Date.now() + 10 * 60 * 1000);
        throw new Error(`model "${p.model}" laptop par nahi hai. CMD mein chalayein: ollama pull ${p.model}`);
      }
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("empty reply");
    // Bina-key servers kabhi error ko "jawab" bana kar 200 ke sath bhej dete hain: usay jawab na samjhein.
    lastModel.set(p.id, p.model);
    if (p.keyless && /^\s*(the api key used for this request|rate limit|too many requests|queue (is )?full|you have reached|⚠️? ?(important notice|ip has been))/i.test(text)) throw new Error("busy (free server ki had)");
    return text;
  } finally {
    clearTimeout(t);
  }
}

// Groq ki failed_generation (model ka banaya hua tool call) ko <action> mein badlein.
function salvageToolCall(errText) {
  let gen;
  try { gen = JSON.parse(errText)?.error?.failed_generation; } catch { return null; }
  if (!gen || typeof gen !== "string") return null;
  if (/<action\s+tool=/.test(gen)) return gen;
  const calls = [];
  const tryPush = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(tryPush);
    const name = o.name || o.tool || o.function?.name;
    let args = o.arguments ?? o.parameters ?? o.args ?? o.function?.arguments ?? {};
    if (typeof args === "string") { try { args = JSON.parse(args); } catch { args = {}; } }
    if (name) calls.push({ name: String(name).replace(/^.*[.:]/, ""), args });
  };
  try { tryPush(JSON.parse(gen)); } catch {
    for (const m of gen.matchAll(/\{[\s\S]*?\}(?=\s*(?:\{|$|<))/g)) { try { tryPush(JSON.parse(m[0])); } catch {} }
  }
  if (!calls.length) return null;
  return "THOUGHT: (tool call badla gaya)\n" + calls.map(({ name, args }) => {
    if (name === "write_file") {
      const { content = "", ...rest } = args;
      const attrs = Object.entries(rest).map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;")}"`).join("");
      return `<action tool="write_file"${attrs}>\n${content}\n</action>`;
    }
    if (name === "edit_file") return `<action tool="edit_file" path="${args.path || ""}"><old>${args.old ?? args.old_text ?? ""}</old><new>${args.new ?? args.new_text ?? ""}</new></action>`;
    return `<action tool="${name}">${JSON.stringify(args)}</action>`;
  }).join("\n");
}

async function installedOllamaModel(p) {
  try {
    const r = await fetch(p.base.replace(/\/v1$/, "") + "/api/tags", { signal: AbortSignal.timeout(4000) });
    const j = await r.json();
    const names = (j.models || []).map((m) => m.name).filter((n) => !/embed/i.test(n));
    return names[0] || null;
  } catch { return null; }
}
