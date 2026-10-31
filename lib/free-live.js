// v3.14 Live auto list: stillworks.supercapybara.com/api/llm/up har ghante parh kar jo bina-key
// OpenAI-jaise endpoints abhi jawab de rahe hain, unhein "temporary brains" bana kar Ollama se pehle lagaya jata hai.
// Service band ho to purana cache (ya khali list) — dashboard kabhi nahi rukta. Options mein On/Off.
import fs from "fs";
import os from "os";
import path from "path";

export const LIVE_URL = "https://stillworks.supercapybara.com/api/llm/up";
export const LIVE_TTL_MS = 60 * 60 * 1000; // har ghanta
export const LIVE_MAX = 10;               // list se 10 tak parhte hain
export const LIVE_USE = 6;                // pipeline mein zyada se zyada 6 temporary brains (catalog duplicates hata kar)
// Terms of Service ki wajah se kabhi nahi: OpenCode Zen free, Hack Club AI, gpt4free / web scrapers.
export const LIVE_DENY = /opencode|zen|hack-?club|gpt4free|g4f|scrap/i;
const SKIP_MODEL = /guard|safety|moderation|embed|rerank|whisper|tts|image|diffusion/i;

const cacheFile = () => path.join(process.env.FAHEEM_LIVE_DIR || path.join(os.homedir(), ".faheem-ai"), "live-brains.json");

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

// JSON -> temporary brains. skip = [{base, model}] jo pehle se catalog mein hain.
export function parseLive(json, skip = []) {
  const rows = Array.isArray(json?.models) ? json.models : [];
  const out = [];
  const seen = new Set();
  for (const m of rows) {
    if (!m || typeof m !== "object") continue;
    const auth = m.auth || m.auth_mode;
    if (auth !== "none") continue;
    if (m.openai_compatible === false || m.chat_capable === false) continue;
    const endpoint = String(m.endpoint || "");
    const model = String(m.model || "");
    let base = String(m.openai_base_url || "");
    if (!base && m.base_url) base = String(m.base_url).replace(/\/$/, "") + String(m.chat_path || "/v1/chat/completions").replace(/\/chat\/completions$/, "");
    if (!endpoint || !model || !/^https:\/\//.test(base)) continue;
    if (LIVE_DENY.test(endpoint) || LIVE_DENY.test(base)) continue;
    if (SKIP_MODEL.test(model)) continue;
    if (skip.some((s) => s.model === model && sameHost(base, s.base))) continue;
    const id = "live-" + slug(endpoint + "-" + model);
    if (seen.has(id)) continue;
    seen.add(id);
    // Pollinations ka "openai_base_url" khud hi poora chat raasta hai (/openai) — seedha POST.
    const direct = /\/openai\/?$/.test(base) && /pollinations/.test(base);
    out.push({ id, name: `${endpoint} · ${model} (live, bina key)`, base: base.replace(/\/$/, ""), model, keyless: true, live: true, direct, latency: Number(m.latency_ms) || 0, answered: m.answered || "" });
    if (out.length >= LIVE_MAX) break;
  }
  return out;
}

// Catalog mein pehle se mojood (same host + same model) live brains hata dein — ek hi brain do dafa na aaye.
const sameHost = (a, b) => String(a).replace(/\/$/, "").startsWith(String(b).replace(/\/(openai|v1)?\/?$/, ""));
export function dedupeLive(brains, catalog = []) {
  return (brains || []).filter((b) => !catalog.some((c) => c.model === b.model && sameHost(b.base, c.base))).slice(0, LIVE_USE);
}

let mem = { at: 0, brains: [], error: "", source: "none" };
let inflight = null;

export const liveState = () => ({ ...mem, brains: [...mem.brains] });
export const liveBrains = () => mem.brains;
export function setLiveForTest(brains, at = Date.now()) { mem = { at, brains, error: "", source: "test" }; }

function loadFile() {
  try { const j = JSON.parse(fs.readFileSync(cacheFile(), "utf8")); if (Array.isArray(j.brains)) mem = { at: j.at || 0, brains: j.brains, error: "", source: "cache" }; } catch {}
}

// Fetch + parse + cache. Fail-safe: koi bhi ghalti ho, purani list rehti hai.
export async function refreshLive({ fetchImpl = fetch, skip = [], timeoutMs = 12000 } = {}) {
  try {
    const r = await fetchImpl(LIVE_URL, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const brains = parseLive(j, skip);
    mem = { at: Date.now(), brains, error: "", source: "live" };
    try { fs.mkdirSync(path.dirname(cacheFile()), { recursive: true }); fs.writeFileSync(cacheFile(), JSON.stringify({ at: mem.at, brains }, null, 1)); } catch {}
    return { ok: true, count: brains.length };
  } catch (e) {
    mem = { ...mem, error: String(e.message || e).slice(0, 120), at: mem.at || 0, failAt: Date.now() };
    return { ok: false, error: mem.error, kept: mem.brains.length };
  }
}

// Routes isay bulate hain: cache khali ho to file se; purana ho to background mein taaza (intezar nahi).
export function ensureLive(skip = []) {
  if (!mem.brains.length && mem.source === "none") loadFile();
  if (Date.now() - mem.at > LIVE_TTL_MS && Date.now() - (mem.failAt || 0) > 10 * 60 * 1000 && !inflight) {
    inflight = refreshLive({ skip }).finally(() => { inflight = null; });
  }
  return inflight;
}
