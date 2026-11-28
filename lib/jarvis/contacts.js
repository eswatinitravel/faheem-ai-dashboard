// v3.43 Jarvis ki chhoti phone book (sirf isi laptop par, ~/.faheem-ai/contacts.json, 0600). WhatsApp naam se.
import fs from "fs"; import os from "os"; import path from "path";
const FILE = () => path.join(os.homedir(), ".faheem-ai", "contacts.json");
const norm = (n) => String(n || "").toLowerCase().replace(/\b(bhai|sahab|saab|ji|jaan)\b/g, "").replace(/[^a-z0-9\u0600-\u06ff ]/g, "").replace(/\s+/g, " ").trim();
export function readContacts() { try { const j = JSON.parse(fs.readFileSync(FILE(), "utf8")); return j && typeof j === "object" ? j : {}; } catch { return {}; } }
export function saveContact(name, phone) {
  const k = norm(name); if (!k || k.length > 40 || !phone) return false;
  const all = readContacts(); all[k] = { name: String(name).trim().slice(0, 40), phone };
  const keys = Object.keys(all); if (keys.length > 500) delete all[keys[0]];
  fs.mkdirSync(path.dirname(FILE()), { recursive: true }); fs.writeFileSync(FILE(), JSON.stringify(all, null, 2), { mode: 0o600 });
  try { fs.chmodSync(FILE(), 0o600); } catch {}
  return true;
}
export function findContact(name) {
  const k = norm(name); if (!k) return null; const all = readContacts();
  if (all[k]) return all[k];
  const hits = Object.entries(all).filter(([n]) => n.split(" ")[0] === k.split(" ")[0]);
  return hits.length === 1 ? hits[0][1] : null; // do Ali hon to andaza nahi
}
