// v3.24 Jarvis ki yaad: baat cheet ka log, ghaltiyan, aur Self-Improve se seekhe hue qawaid (sab laptop par, ~/.faheem-ai/jarvis).
import fs from "fs";
import os from "os";
import path from "path";

const DIR = () => path.resolve(process.env.FAHEEM_JARVIS_DIR || path.join(os.homedir(), ".faheem-ai", "jarvis"));
const f = (n) => path.join(DIR(), n);
const readJ = (n, d) => { try { return JSON.parse(fs.readFileSync(f(n), "utf8")); } catch { return d; } };
const writeJ = (n, v) => { fs.mkdirSync(DIR(), { recursive: true }); fs.writeFileSync(f(n), JSON.stringify(v, null, 1)); };

export const MAX_LOG = 400, MAX_NOTES = 40;
export function logTurn(t) {
  const list = readJ("log.json", []);
  list.push({ at: new Date().toISOString(), user: String(t.user || "").slice(0, 400), reply: String(t.reply || "").slice(0, 600), emotion: t.emotion || "neutral", brain: t.brain || "", ok: t.ok !== false, action: t.action || null, ms: t.ms || 0, correction: !!t.correction });
  writeJ("log.json", list.slice(-MAX_LOG));
}
export const readLog = (n = 60) => readJ("log.json", []).slice(-n);
export const readNotes = () => readJ("notes.json", []);
export function addNotes(items = [], from = "self-improve") {
  const cur = readNotes();
  for (const text of items) {
    const t = String(text || "").trim().slice(0, 220);
    if (t.length < 8 || cur.some((x) => x.text.toLowerCase() === t.toLowerCase())) continue;
    cur.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: t, from, at: new Date().toISOString() });
  }
  writeJ("notes.json", cur.slice(-MAX_NOTES));
  return readNotes();
}
export function deleteNote(id) { writeJ("notes.json", readNotes().filter((x) => x.id !== id)); return readNotes(); }
export function notesPrompt() {
  const n = readNotes().slice(-15);
  return n.length ? "JARVIS NE SEEKHA (follow these learned rules):\n" + n.map((x) => "- " + x.text).join("\n") : "";
}
// Chhote stats: Self-Improve aur page ke liye.
export function stats() {
  const l = readJ("log.json", []);
  const fails = l.filter((x) => !x.ok || x.correction).length;
  const avg = l.length ? Math.round(l.reduce((s, x) => s + (x.ms || 0), 0) / l.length) : 0;
  return { turns: l.length, fails, avgMs: avg, notes: readNotes().length };
}
export const prefs = () => readJ("prefs.json", {});
export const savePrefs = (p) => { writeJ("prefs.json", { ...prefs(), ...p }); return prefs(); };
