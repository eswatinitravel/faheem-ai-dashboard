import { getConfig } from "./config";

// Free providers in order. When one hits its limit (429) or fails, the next one answers.
export function getProviders() {
  const e = getConfig();
  const list = [
    { id: "groq", name: "Groq", base: "https://api.groq.com/openai/v1", key: e.GROQ_API_KEY, model: e.GROQ_MODEL || "openai/gpt-oss-120b", visionModel: e.GROQ_VISION_MODEL || "qwen/qwen3.8-27b" },
    { id: "gemini", name: "Gemini", base: "https://generativelanguage.googleapis.com/v1beta/openai", key: e.GEMINI_API_KEY, model: e.GEMINI_MODEL || "gemini-flash-latest", vision: true },
    { id: "openrouter", name: "OpenRouter", base: "https://openrouter.ai/api/v1", key: e.OPENROUTER_API_KEY, model: e.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free" },
    // v3.7: do aur hamesha-free brains (sirf free key, card nahi).
    { id: "zai", name: "Z.ai GLM", base: "https://api.z.ai/api/paas/v4", key: e.ZAI_API_KEY, model: e.ZAI_MODEL || "glm-4.7-flash" },
    { id: "mistral", name: "Mistral", base: "https://api.mistral.ai/v1", key: e.MISTRAL_API_KEY, model: e.MISTRAL_MODEL || "mistral-small-latest" },
  ].filter((p) => p.key && p.model);
  // Bina key wale free brains: koi key lagani nahi parti, hamesha tayyar.
  if ((e.FREE_ENABLED || "true") !== "false") {
    list.push({ id: "pollinations", name: "Pollinations (free, bina key)", base: "https://text.pollinations.ai/openai", direct: true, key: "", model: "openai", keyless: true });
    list.push({ id: "llm7", name: "LLM7 (free, bina key)", base: "https://api.llm7.io/v1", key: "", model: e.LLM7_MODEL || "default", keyless: true });
  }
  if ((e.OLLAMA_ENABLED || "true") !== "false") {
    list.push({ id: "ollama", name: "Ollama (local)", base: `${(e.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "")}/v1`, key: "ollama", model: e.OLLAMA_MODEL || "llama3.2:3b" });
  }
  return list;
}

// Jo brains picture dekh sakte hain: Gemini, aur Groq ka vision model (Qwen 3.8, free key se).
export function visionProviders(list) {
  return list.filter((x) => x.vision || x.visionModel).map((x) => (x.vision ? x : { ...x, id: x.id + "-vision", model: x.visionModel, name: `${x.name} Vision`, vision: true }));
}

// Cooldown memory: skip a provider for a while after it says "limit reached".
const cooldown = new Map();

export function isCooling(id) {
  const until = cooldown.get(id);
  return until && until > Date.now();
}

export async function callProvider(p, messages, timeoutMs = 60000) {
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
      let retry = Number(res.headers.get("retry-after")) || 60;
      if (p.keyless) {
        try { const j = JSON.parse(await res.clone().text()); if (j?.error?.retry_after) retry = Number(j.error.retry_after); } catch {}
      }
      cooldown.set(p.id, Date.now() + retry * 1000);
      throw new Error(`limit reached (retry in ${retry}s)`);
    }
    if (!res.ok) {
      const errText = await res.text();
      // Groq ka gpt-oss kabhi kabhi apna "tool call" bana deta hai (HTTP 400 tool_use_failed).
      // Pehle uski koshish ko bacha kar hamari <action> shakal mein badlein; warna dusre Groq model se dobara.
      if (p.id === "groq" && res.status === 400 && /tool_use_failed|Tool choice is none|called a tool/i.test(errText)) {
        const salvaged = salvageToolCall(errText);
        if (salvaged) return salvaged;
        if (!p._retried) {
          const fb = { ...p, model: getConfig().GROQ_FALLBACK_MODEL || "llama-3.3-70b-versatile", _retried: true };
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
