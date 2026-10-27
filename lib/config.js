import fs from "fs";
import path from "path";

// Keys saved from the in-app Settings live here (only on this laptop, never on GitHub).
const FILE = path.join(process.cwd(), "data", "keys.json");
export const FIELDS = ["GROQ_API_KEY", "GROQ_MODEL", "GEMINI_API_KEY", "GEMINI_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "OLLAMA_ENABLED", "OLLAMA_URL", "OLLAMA_MODEL"];

export function readSaved() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

export function writeSaved(values) {
  const current = readSaved();
  for (const k of FIELDS) {
    if (typeof values[k] === "string") {
      const v = values[k].trim();
      if (v) current[k] = v;
      else delete current[k];
    }
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(current, null, 2));
  return current;
}

// Settings saved in the app win over .env.local.
export function getConfig() {
  const clean = (v) => (typeof v === "string" ? v.trim().replace(/^["']|["']$/g, "") : v);
  const out = {};
  for (const k of FIELDS) out[k] = clean(process.env[k]);
  const saved = readSaved();
  for (const k of FIELDS) if (saved[k]) out[k] = clean(saved[k]);
  return out;
}
