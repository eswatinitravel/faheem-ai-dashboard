// v3.17 Scheduled tasks + reminders (Arena + Nexa): har X minute / roz ek waqt / ek dafa. Run Now aur history.
import { readJson, writeJson, newId } from "./store.js";
import { enqueue } from "./queue.js";
import { audit } from "./audit.js";
import { isPaused } from "./control.js";

const load = () => readJson("schedules.json", []);
const save = (l) => writeJson("schedules.json", l);

// every: "once" | "15m" | "2h" | "daily@09:00" (laptop ka waqt)
export function nextRun(every, from = new Date()) {
  const m = /^(\d+)([mh])$/.exec(every || "");
  if (m) return new Date(from.getTime() + Number(m[1]) * (m[2] === "h" ? 3600e3 : 60e3));
  const d = /^daily@(\d{1,2}):(\d{2})$/.exec(every || "");
  if (d) { const n = new Date(from); n.setHours(Number(d[1]), Number(d[2]), 0, 0); if (n <= from) n.setDate(n.getDate() + 1); return n; }
  return null;
}

export function createSchedule({ title, prompt, every = "once", at = null, kind = "prompt" }) {
  if (!String(prompt || "").trim()) throw new Error("Kaam likhein");
  if (every !== "once" && !nextRun(every)) throw new Error('Waqt ghalat: "15m", "2h", "daily@09:00" ya "once"');
  const first = at ? new Date(at) : every === "once" ? new Date(Date.now() + 60e3) : nextRun(every);
  if (isNaN(first)) throw new Error("Waqt ghalat");
  const s = { id: newId("sch"), title: String(title || prompt).slice(0, 120), prompt: String(prompt).slice(0, 4000), every, kind, status: "active",
    nextRunAt: first.toISOString(), lastRunAt: null, history: [], createdAt: new Date().toISOString() };
  const l = load(); l.push(s); save(l); audit("schedule_created", s.title, { id: s.id, every });
  return s;
}

function fire(s, manual, catchUp = false) {
  const job = enqueue(s.kind === "reminder" ? "reminder" : "prompt", { prompt: s.prompt, scheduleId: s.id }, { title: `${manual ? "Run Now" : catchUp ? "Schedule (chhoota hua)" : "Schedule"}: ${s.title}` });
  s.lastRunAt = new Date().toISOString();
  s.history = [{ at: s.lastRunAt, jobId: job.id, manual: !!manual, ...(catchUp ? { catchUp: true, dueAt: s.nextRunAt } : {}) }, ...(s.history || [])].slice(0, 30);
  return job;
}

export function runNow(id) {
  const l = load(); const s = l.find((x) => x.id === id);
  if (!s) throw new Error("Schedule nahi mila");
  const job = fire(s, true); save(l); return job;
}

export function setScheduleStatus(id, status) {
  const l = load(); const s = l.find((x) => x.id === id);
  if (!s) throw new Error("Schedule nahi mila");
  if (status === "deleted") { save(l.filter((x) => x.id !== id)); audit("schedule_deleted", s.title, { id }); return null; }
  s.status = status === "paused" ? "paused" : "active";
  if (s.status === "active" && Date.parse(s.nextRunAt) < Date.now()) s.nextRunAt = (nextRun(s.every) || new Date()).toISOString();
  save(l); return s;
}

// v3.29: dashboard band tha aur waqt guzar gaya? Har schedule sirf EK dafa chalta hai (sailaab nahi),
// phir agla waqt "abhi" se ginte hain. 2 minute se zyada der wala run history mein "chhoota hua" (catchUp) likha jata hai.
export const CATCH_UP_MS = 2 * 60e3;
export function tick(now = new Date()) {
  if (isPaused()) return 0;
  const l = load(); let n = 0;
  for (const s of l) {
    if (s.status !== "active" || Date.parse(s.nextRunAt) > now.getTime()) continue;
    const late = now.getTime() - Date.parse(s.nextRunAt) > CATCH_UP_MS;
    fire(s, false, late); n++;
    if (late) audit("schedule_catch_up", s.title, { id: s.id, dueAt: s.nextRunAt });
    const nx = s.every === "once" ? null : nextRun(s.every, now);
    if (nx) s.nextRunAt = nx.toISOString(); else s.status = "completed";
  }
  if (n) save(l);
  return n;
}

export const listSchedules = () => load();
