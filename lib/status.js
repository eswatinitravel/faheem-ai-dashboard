// v3.27 Status tiles: har brain / service ka chhota live ping (Dashy MIT, Homarr Apache-2.0, Heimdall MIT ke
// "status check" idea se; apna code). Sirf sasti GET (/models, /api/tags) — koi chat token kharch nahi.
import fs from "fs";
import path from "path";
import { getProviders, isCooling, coolingLeftSec } from "./providers.js";
import { getConfig } from "./config.js";
import { statusFromHttp } from "./brain-status.js";
import { cachedStatus } from "./brain-check.js";
import { localSttReady } from "./jarvis/stt.js";
import { kittenReady } from "./jarvis/tts.js";
import { readPhone } from "./phone.js";

const LIGHT = { green: "ok", yellow: "warn", amber: "warn", red: "bad", grey: "off" };
const MAX_BRAINS = 24;

async function timed(fn) {
  const t = Date.now();
  try { const r = await fn(); return { ...r, ms: Date.now() - t }; }
  catch (e) { return { state: "bad", detail: /timeout|abort/i.test(String(e?.name) + e?.message) ? "Jawab nahi aaya (timeout)" : String(e?.message || e).slice(0, 120), ms: Date.now() - t }; }
}

async function httpProbe(url, { headers = {}, timeoutMs = 6000 } = {}) {
  const r = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  const body = await r.text().catch(() => "");
  return { status: r.status, body, retry: Number(r.headers.get("retry-after")) || 0 };
}

export function brainHeaders(p) {
  if (p.id === "gemini") return { "x-goog-api-key": p.key };
  return p.key ? { Authorization: `Bearer ${p.key}` } : {};
}

async function checkOllama(cfg) {
  if ((cfg.OLLAMA_ENABLED || "true") === "false") return { state: "off", detail: "Options mein band" };
  const base = (cfg.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
  const r = await httpProbe(`${base}/api/tags`, { timeoutMs: 3000 }).catch(() => null);
  if (!r) return { state: "bad", detail: "Band hai — Ollama app chalayein (localhost:11434)" };
  if (r.status !== 200) return { state: "bad", detail: `HTTP ${r.status}` };
  let n = 0, first = ""; try { const j = JSON.parse(r.body); n = (j.models || []).length; first = j.models?.[0]?.name || ""; } catch {}
  return n ? { state: "ok", detail: `${n} model${n > 1 ? "s" : ""}${first ? ` · ${first}` : ""}` } : { state: "warn", detail: "Chal raha, koi model nahi (ollama pull qwen2.5:3b)" };
}

export function isNewer(a, b) {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

async function checkGithub(repo, current) {
  const r = await httpProbe(`https://api.github.com/repos/${repo}/contents/package.json?ref=main`, { headers: { Accept: "application/vnd.github.raw+json", "User-Agent": "faheem-ai" }, timeoutMs: 8000 });
  if (r.status === 403 || r.status === 429) return { state: "warn", detail: "GitHub ki ghante wali had — thori der baad" };
  if (r.status !== 200) return { state: "bad", detail: `GitHub HTTP ${r.status}` };
  const latest = JSON.parse(r.body).version;
  const newer = isNewer(latest, current);
  return newer ? { state: "warn", detail: `Naya version v${latest} — UPDATE.bat ya sidebar se update` } : { state: "ok", detail: `Taaza (yahan v${current}, GitHub v${latest})` };
}

async function checkBrain(p) {
  if (isCooling(p.id)) return { state: "warn", detail: `Limit par — ${Math.max(1, Math.ceil(coolingLeftSec(p.id) / 60))} min baad` };
  const r = await httpProbe(`${p.base}/models`, { headers: brainHeaders(p), timeoutMs: p.lastResort ? 9000 : 6000 });
  const st = statusFromHttp(r.status, r.body, r.retry);
  // /models khula hai lekin aakhri asli chat check (har 30 min) limit / ghalat key keh chuka ho to woh dikhao.
  const deep = cachedStatus(p.id);
  if (st.light === "green" && deep?.light && deep.light !== "green" && Date.now() - (deep.at || deep.checkedAt || 0) < 3600000) return { state: LIGHT[deep.light] || "warn", detail: deep.label || "Asli check mein masla" };
  return { state: LIGHT[st.light] || "bad", detail: st.label };
}

let ghCache = { at: 0, v: null };
let allCache = { at: 0, v: null, running: null };

export async function collectStatus({ force = false } = {}) {
  if (!force && allCache.v && Date.now() - allCache.at < 45000) return allCache.v;
  if (allCache.running) return allCache.running;
  allCache.running = (async () => {
    const cfg = getConfig();
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    const now = Date.now();
    const brains = getProviders().filter((p) => p.id !== "ollama").slice(0, MAX_BRAINS);
    const gh = !force && ghCache.v && now - ghCache.at < 10 * 60000 ? Promise.resolve(ghCache.v) : timed(() => checkGithub(pkg.updateRepo || "eswatinitravel/faheem-ai-dashboard", pkg.version)).then((v) => { ghCache = { at: Date.now(), v }; return v; });
    const phone = readPhone();
    const tasks = [
      ["server", "Dashboard server", "Yeh app (Next.js)", "monitor", Promise.resolve({ state: "ok", detail: `v${pkg.version} · ${Math.round(process.uptime() / 60)} min se chal raha`, ms: 0 })],
      ["ollama", "Ollama (laptop)", "Bina limit, bina internet", "brain", timed(() => checkOllama(cfg))],
      ["whisper", "Whisper (awaz → text)", "faster_whisper Python package", "mic", timed(async () => ((await localSttReady()) ? { state: "ok", detail: "Laptop par lagi hui" } : { state: "warn", detail: "Nahi lagi — Groq/browser se sunta hai (pip install faster-whisper)" }))],
      ["kitten", "Kitten TTS (offline awaz)", "GET /api/jarvis/tts jaisa package check", "mic", timed(async () => ((await kittenReady()) ? { state: "ok", detail: "Tayyar (Priya/Arjun)" } : { state: "warn", detail: "Nahi lagi — browser awaz (pip install onnxruntime numpy phonemizer espeakng_loader)" }))],
      ["github", "GitHub update", pkg.updateRepo || "", "github", gh],
      ["phone", "Phone connect", "/connect", "phone", Promise.resolve({ state: phone.enabled ? "ok" : "off", detail: phone.enabled ? "On — Maid/PocketPal jud sakte hain" : "Band (default)", ms: 0 })],
      ...brains.map((p) => [`brain:${p.id}`, p.name, p.keyless ? "Bina key free" : p.live ? "Live free list" : "Aap ki key", "zap", timed(() => checkBrain(p))]),
    ];
    const done = await Promise.all(tasks.map(([, , , , pr]) => pr));
    const items = tasks.map(([id, name, sub, icon], i) => ({ id, name, sub, icon, group: id.startsWith("brain:") ? "brains" : "services", state: done[i].state, detail: done[i].detail, ms: done[i].ms, at: Date.now() }));
    const counts = items.reduce((a, x) => ((a[x.state] = (a[x.state] || 0) + 1), a), {});
    const v = { ok: true, at: Date.now(), counts, items };
    allCache = { at: Date.now(), v, running: null };
    return v;
  })().finally(() => { allCache.running = null; });
  return allCache.running;
}
