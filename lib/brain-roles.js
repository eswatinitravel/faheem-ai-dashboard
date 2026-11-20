// v3.17 Brains ki tarteeb: har kaam (specialist) ke liye key wale brains ka apna order.
// Bina-key brains, live list, AI Horde aur Ollama hamesha baad mein aate hain (chat route + sortProviders).
// Yeh order model ki khoobi par andaza hai (catalog ke model dekh kar); /workflows > Brains par badal sakte hain.
import fs from "fs";
import os from "os";
import path from "path";

export const ROLE_ORDER = {
  coder:    ["gemini", "nvidia", "sambanova", "groq", "zai", "mistral", "openrouter", "huggingface", "cohere", "cloudflare", "hetzner", "nous", "requesty"],
  web:      ["gemini", "nvidia", "zai", "sambanova", "groq", "mistral", "openrouter", "huggingface", "cohere", "cloudflare", "hetzner", "nous", "requesty"],
  uiux:     ["gemini", "zai", "nvidia", "groq", "mistral", "openrouter", "sambanova", "huggingface", "cohere", "cloudflare", "hetzner", "nous", "requesty"],
  writer:   ["gemini", "cohere", "mistral", "groq", "openrouter", "zai", "sambanova", "nvidia", "huggingface", "cloudflare", "hetzner", "nous", "requesty"],
  business: ["groq", "gemini", "cohere", "mistral", "sambanova", "zai", "openrouter", "nvidia", "huggingface", "cloudflare", "hetzner", "nous", "requesty"],
  travel:   ["gemini", "groq", "cohere", "mistral", "openrouter", "zai", "sambanova", "nvidia", "huggingface", "cloudflare", "hetzner", "nous", "requesty"],
  research: ["sambanova", "nvidia", "gemini", "groq", "nous", "openrouter", "zai", "mistral", "cohere", "huggingface", "cloudflare", "hetzner", "requesty"],
  general:  ["groq", "gemini", "mistral", "cohere", "zai", "openrouter", "sambanova", "nvidia", "huggingface", "cloudflare", "hetzner", "nous", "requesty"],
};

export const ROLE_WHY = {
  coder: "Gemini code mein sab se mazboot; NVIDIA aur SambaNova par DeepSeek; Groq sab se tez.",
  web: "Gemini design + code + tasveer dekh sakta hai; DeepSeek (NVIDIA) aur GLM (Z.ai) web code achha likhte hain.",
  uiux: "Gemini tasveer dekh kar design parhta hai; GLM aur DeepSeek baad mein.",
  writer: "Gemini aur Cohere Command-A Urdu/Roman Urdu mein behtar; Mistral achha copywriter.",
  business: "Groq tez hisaab-kitaab; Gemini aur Cohere tafseel ke liye.",
  travel: "Gemini aur Groq ki aam maloomat zyada; Cohere doosri zabaan.",
  research: "DeepSeek (SambaNova, NVIDIA) gehri soch; Gemini aur Groq baad mein.",
  general: "Groq sab se tez jawab; Gemini backup.",
};

const FILE = () => path.join(/*turbopackIgnore: true*/ os.homedir(), ".faheem-ai", "brain-order.json");

export function readOverrides() {
  try { return JSON.parse(fs.readFileSync(FILE(), "utf8")) || {}; } catch { return {}; }
}

export function saveOverride(role, order) {
  if (!ROLE_ORDER[role]) throw new Error(`"${role}" naam ka kaam nahi`);
  const ids = [...new Set((order || []).map(String).filter(Boolean))].slice(0, 40);
  const all = readOverrides();
  if (ids.length) all[role] = ids; else delete all[role];
  fs.mkdirSync(path.dirname(FILE()), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify(all, null, 2));
  return preferFor(role);
}

// Aap ka order pehle, phir default ke baaki brains (koi brain gum na ho), Ollama hamesha aakhir.
export function preferFor(role) {
  const base = ROLE_ORDER[role] || ROLE_ORDER.general;
  const mine = readOverrides()[role] || [];
  return [...new Set([...mine.filter((x) => x !== "ollama"), ...base, "ollama"])];
}

export function allRoles() {
  return Object.keys(ROLE_ORDER).map((id) => ({ id, why: ROLE_WHY[id], order: preferFor(id), custom: !!readOverrides()[id] }));
}
