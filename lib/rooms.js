// v3.14 Brains Rooms: har brain ka apna chat room, history isi laptop par ~/.faheem-ai/rooms/<id>.json
import fs from "fs";
import os from "os";
import path from "path";

export const MAX_MESSAGES = 200; // har room mein aakhri 200 messages
export const roomsDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.FAHEEM_ROOMS_DIR || path.join(os.homedir(), ".faheem-ai", "rooms"));

// Sirf a-z 0-9 - _ (../ ya ajeeb naam se file system bahar nahi ja sakta)
export function safeRoomId(id) {
  const s = String(id || "").toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(s) ? s : null;
}
const fileOf = (id) => { const s = safeRoomId(id); return s ? path.join(roomsDir(), s + ".json") : null; };

export function readRoom(id) {
  const f = fileOf(id);
  if (!f) return null;
  try { const j = JSON.parse(fs.readFileSync(f, "utf8")); return Array.isArray(j.messages) ? j : { id, messages: [] }; } catch { return { id: safeRoomId(id), messages: [] }; }
}

// Picture ka data history mein nahi rakhte (bhaari) — sirf naam.
const lite = (m) => ({
  role: m.role === "assistant" ? "assistant" : m.role === "note" ? "note" : "user",
  content: String(m.content || "").slice(0, 40000),
  at: m.at || Date.now(),
  ...(m.err ? { err: true } : {}),
  ...(m.ms ? { ms: m.ms } : {}),
  ...(m.model ? { model: String(m.model).slice(0, 120) } : {}),
  ...(Array.isArray(m.files) && m.files.length ? { files: m.files.slice(0, 6).map((f) => String(f).slice(0, 120)) } : {}),
});

export function appendRoom(id, msgs) {
  const f = fileOf(id);
  if (!f) throw new Error("ghalat room id");
  const cur = readRoom(id);
  const messages = [...cur.messages, ...(msgs || []).map(lite)].slice(-MAX_MESSAGES);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ id: safeRoomId(id), updated: Date.now(), messages }, null, 1));
  return { id: safeRoomId(id), messages };
}

export function clearRoom(id) {
  const f = fileOf(id);
  if (!f) return false;
  try { fs.unlinkSync(f); } catch {}
  return true;
}

// AI ko bhejne ke liye: sirf user/assistant, bina error, aakhri 12
export function historyFor(room, n = 12) {
  return (room?.messages || []).filter((m) => (m.role === "user" || m.role === "assistant") && !m.err).slice(-n).map((m) => ({ role: m.role, content: m.content }));
}
