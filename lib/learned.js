// v3.15 Self-improvement loop ("Seekha hua"): har kaam ke baad chhota sabaq — kis kaam par kaun sa brain chala,
// ghalti → hal, user ki tasheeh, design audit score. Agli dafa routing/prompt mein wapas. Bounded (MAX), koi paid call nahi.
import fs from "fs"; import os from "os"; import path from "path";
export const MAX_LEARNED = 200;
const dir = () => path.resolve(process.env.FAHEEM_MEMORY_DIR || path.join(os.homedir(), ".faheem-ai", "memory"));
const file = () => path.join(dir(), "learned.json");
let cache = null, cacheFile = "";
export function readLearned() {
  if (cache && cacheFile === file()) return cache;
  try { cache = JSON.parse(fs.readFileSync(file(), "utf8")); if (!Array.isArray(cache)) cache = []; } catch { cache = []; }
  cacheFile = file(); return cache;
}
function save(list) { fs.mkdirSync(dir(), { recursive: true }); cache = list.slice(-MAX_LEARNED); cacheFile = file(); fs.writeFileSync(file(), JSON.stringify(cache, null, 1)); return cache; }
const KINDS = ["brain", "fix", "correction", "audit"];
export function addLearned({ kind = "brain", task = "general", brain = "", ok = true, text = "", score } = {}) {
  if (!KINDS.includes(kind)) return { ok: false, error: "ghalat kind" };
  const it = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, task: String(task).slice(0, 30), brain: String(brain).slice(0, 40), ok: !!ok, text: String(text).slice(0, 300), at: new Date().toISOString() };
  if (typeof score === "number") it.score = Math.round(score);
  save([...readLearned(), it]); return { ok: true, item: it };
}
export function deleteLearned(id) { const l = readLearned(); const n = l.filter((x) => x.id !== id); if (n.length === l.length) return { ok: false, error: "nahi mila" }; save(n); return { ok: true }; }
export function clearLearned() { save([]); return { ok: true }; }
// Har task type par sab se kamyab brain (kam az kam 2 koshishen).
export function bestBrains(task) {
  const st = {};
  for (const x of readLearned()) if (x.kind === "brain" && x.task === task && x.brain) { const s = (st[x.brain] ||= { ok: 0, n: 0 }); s.n++; if (x.ok) s.ok++; }
  return Object.entries(st).filter(([, s]) => s.n >= 2).sort((a, b) => b[1].ok / b[1].n - a[1].ok / a[1].n || b[1].n - a[1].n).map(([b]) => b);
}
// Providers ki list: jo brain is kaam par pehle kamyab raha, use aage.
export function reorderByLearned(providers, task) {
  const best = bestBrains(task); if (!best.length) return providers;
  const r = (p) => { const i = best.indexOf(p.name) >= 0 ? best.indexOf(p.name) : best.indexOf(p.id); return i < 0 ? 999 : i; };
  return [...providers].sort((a, b) => r(a) - r(b));
}
// Prompt ke liye chhota hissa (max ~6 lines).
export function learnedContext(task) {
  const l = readLearned().filter((x) => (x.kind === "fix" || x.kind === "correction") && x.text).slice(-6);
  const audits = readLearned().filter((x) => x.kind === "audit" && x.task === task).slice(-5);
  const out = l.map((x) => `- ${x.kind === "correction" ? "User ki tasheeh" : "Pichli ghalti → hal"}: ${x.text.slice(0, 160)}`);
  if (audits.length) out.push(`- Pichle design audit score: ${audits.map((a) => a.score).join(", ")} (100 ka) — kam score wali ghaltiyan na dohrayein.`);
  return out.length ? "SEEKHA HUA (pichle kaamon se):\n" + out.join("\n") : "";
}
const CORRECTION = /^(nahi|nai|no\b|ghalat|galat|wrong|aisa nahi|theek nahi|ye nahi|not like)/i;
export const isCorrection = (t) => CORRECTION.test(String(t || "").trim());
