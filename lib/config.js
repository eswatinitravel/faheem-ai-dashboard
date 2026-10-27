import fs from "fs";
import os from "os";
import path from "path";

// Keys saved from the in-app Settings live in the user's home folder
// (C:\Users\<naam>\.faheem-ai\keys.json), so a new ZIP install or update never loses them.
const FILE = path.join(os.homedir(), ".faheem-ai", "keys.json");
export const KEYS_FILE = FILE;
const BACKUP = path.join(process.cwd(), "data", "keys.backup.json");
const OLD_FILE = path.join(process.cwd(), "data", "keys.json"); // v2.4 and older
export const FIELDS = ["GROQ_API_KEY", "GROQ_MODEL", "GEMINI_API_KEY", "GEMINI_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "OLLAMA_ENABLED", "OLLAMA_URL", "OLLAMA_MODEL", "FREE_ENABLED", "LLM7_MODEL"];

function readJson(f) {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; }
}

export function readSaved() {
  const cur = readJson(FILE);
  if (cur) return cur;
  // Pehli dafa: purani data/keys.json se keys utha kar nayi jagah mehfooz kar dein.
  const old = readJson(OLD_FILE) || readJson(BACKUP);
  if (old) {
    try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(old, null, 2)); } catch {}
    return old;
  }
  return {};
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
  // Doosri copy project ke data/ folder mein (update kabhi data/ ko nahi chhedta).
  try { fs.mkdirSync(path.dirname(BACKUP), { recursive: true }); fs.writeFileSync(BACKUP, JSON.stringify(current, null, 2)); } catch {}
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
