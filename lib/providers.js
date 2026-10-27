import { getConfig } from "./config";

// Free providers in order. When one hits its limit (429) or fails, the next one answers.
export function getProviders() {
  const e = getConfig();
  const list = [
    { id: "groq", name: "Groq", base: "https://api.groq.com/openai/v1", key: e.GROQ_API_KEY, model: e.GROQ_MODEL || "openai/gpt-oss-120b" },
    { id: "gemini", name: "Gemini", base: "https://generativelanguage.googleapis.com/v1beta/openai", key: e.GEMINI_API_KEY, model: e.GEMINI_MODEL || "gemini-flash-latest" },
    { id: "openrouter", name: "OpenRouter", base: "https://openrouter.ai/api/v1", key: e.OPENROUTER_API_KEY, model: e.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free" },
  ].filter((p) => p.key && p.model);
  if ((e.OLLAMA_ENABLED || "true") !== "false") {
    list.push({ id: "ollama", name: "Ollama (local)", base: `${(e.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "")}/v1`, key: "ollama", model: e.OLLAMA_MODEL || "llama3.2:3b" });
  }
  return list;
}

// Cooldown memory: skip a provider for a while after it says "limit reached".
const cooldown = new Map();

export function isCooling(id) {
  const until = cooldown.get(id);
  return until && until > Date.now();
}

export async function callProvider(p, messages, timeoutMs = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${p.base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({ model: p.model, messages, temperature: 0.7 }),
      signal: ctrl.signal,
    });
    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after")) || 60;
      cooldown.set(p.id, Date.now() + retry * 1000);
      throw new Error(`limit reached (retry in ${retry}s)`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("empty reply");
    return text;
  } finally {
    clearTimeout(t);
  }
}
