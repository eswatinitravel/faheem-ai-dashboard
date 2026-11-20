// v3.17 Pakki kaam-queue (Arena se): har kaam pehle save, phir chalta hai. Crash / restart ke baad wapas.
// Statuses: queued, running, waiting_for_approval, retrying, completed, failed, cancelled, dead_letter.
import { readJson, writeJson, newId } from "./store.js";
import { audit, redact } from "./audit.js";
import { isPaused } from "./control.js";

export const BACKOFF_S = [1, 2, 5, 10, 30];
export const RETRY_LIMIT = Number(process.env.JOB_RETRY_LIMIT) || 5;
const HANDLERS = new Map();
let timer = null, busy = false;

const load = () => readJson("jobs.json", []);
const save = (jobs) => {
  // Purane mukammal kaam 500 se zyada hon to hata dein; khule kaam kabhi nahi.
  const open = jobs.filter((j) => !["completed", "cancelled"].includes(j.status));
  const done = jobs.filter((j) => ["completed", "cancelled"].includes(j.status)).slice(-500);
  return writeJson("jobs.json", [...open, ...done].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
};
const step = (j, text) => { j.steps.push({ at: new Date().toISOString(), text: redact(text) }); if (j.steps.length > 60) j.steps.splice(0, j.steps.length - 60); };

export function registerHandler(kind, fn) { HANDLERS.set(kind, fn); }

export function enqueue(kind, payload = {}, { title = kind, key = null, runAt = null } = {}) {
  const jobs = load();
  if (key) { const old = jobs.find((j) => j.key === key); if (old) return old; } // idempotency: wahi key = wahi kaam
  const j = { id: newId("job"), kind, title: String(title).slice(0, 160), key, payload, status: "queued", attempts: 0, maxAttempts: RETRY_LIMIT,
    createdAt: new Date().toISOString(), runAt: runAt || new Date().toISOString(), steps: [], error: null, result: null };
  step(j, "Kaam save hua, line mein hai");
  jobs.push(j); save(jobs);
  audit("job_queued", j.title, { id: j.id, kind });
  return j;
}

// Server shuru hone par: pichle process ke "running" kaam wapas line mein (attempt zaya nahi).
export function recover() {
  const jobs = load(); let n = 0;
  for (const j of jobs) if (j.status === "running") { j.status = "queued"; step(j, "Server dobara chala — kaam wapas line mein"); n++; }
  if (n) { save(jobs); audit("recover", `${n} adhoore kaam wapas line mein`); }
  return n;
}

export function retryJob(id) {
  const jobs = load(); const j = jobs.find((x) => x.id === id);
  if (!j) throw new Error("Kaam nahi mila");
  if (!["failed", "dead_letter", "cancelled"].includes(j.status)) throw new Error(`Is haal (${j.status}) mein retry nahi`);
  j.status = "queued"; j.attempts = 0; j.error = null; j.runAt = new Date().toISOString(); step(j, "Haath se dobara line mein");
  save(jobs); audit("job_retry", j.title, { id }); return j;
}

export function cancelJob(id) {
  const jobs = load(); const j = jobs.find((x) => x.id === id);
  if (!j) throw new Error("Kaam nahi mila");
  if (["completed", "cancelled"].includes(j.status)) return j;
  j.status = "cancelled"; step(j, "Cancel kiya"); save(jobs); audit("job_cancel", j.title, { id }); return j;
}

export function resumeAfterApproval(jobId, approvalId) {
  const jobs = load(); const j = jobs.find((x) => x.id === jobId);
  if (!j || j.status !== "waiting_for_approval") return null;
  j.status = "queued"; j.payload = { ...j.payload, approvalId }; step(j, "Ijazat mil gayi — dobara line mein"); save(jobs); return j;
}

export const listJobs = () => load().slice().reverse();

// Ek kaam chalayein. Handler: async (job, ctx) => result. ctx.step(text), ctx.waitForApproval(approvalId).
export async function runOnce(now = Date.now()) {
  if (busy || isPaused()) return null;
  const jobs = load();
  const j = jobs.find((x) => ["queued", "retrying"].includes(x.status) && Date.parse(x.runAt) <= now);
  if (!j) return null;
  busy = true;
  j.status = "running"; j.attempts += 1; j.startedAt = new Date().toISOString(); step(j, `Chal raha hai (koshish ${j.attempts}/${j.maxAttempts})`);
  save(jobs);
  const id = j.id;
  const patch = (fn) => { const all = load(); const x = all.find((y) => y.id === id); if (x) { fn(x); save(all); } return x; };
  try {
    const h = HANDLERS.get(j.kind);
    if (!h) throw Object.assign(new Error(`"${j.kind}" ka handler nahi`), { final: true });
    let waiting = null;
    const result = await h(j, { step: (t) => patch((x) => step(x, t)), waitForApproval: (aid) => { waiting = aid; return "waiting"; } });
    if (waiting) return patch((x) => { x.status = "waiting_for_approval"; x.attempts -= 1; x.approvalId = waiting; step(x, "Aap ki ijazat ka intezar"); });
    return patch((x) => { if (x.status === "cancelled") return; x.status = "completed"; x.result = typeof result === "string" ? redact(result) : JSON.parse(redact(result ?? null)); x.finishedAt = new Date().toISOString(); step(x, "Mukammal"); });
  } catch (e) {
    const msg = redact(e?.message || String(e));
    const x = patch((x) => {
      if (x.status === "cancelled") return;
      x.error = msg;
      if (e?.final || x.attempts >= x.maxAttempts) { x.status = "dead_letter"; step(x, `Fail: ${msg} — failed list mein`); }
      else { const s = BACKOFF_S[Math.min(x.attempts - 1, BACKOFF_S.length - 1)]; x.status = "retrying"; x.runAt = new Date(Date.now() + s * 1000).toISOString(); step(x, `Ghalti: ${msg} — ${s}s baad dobara`); }
    });
    if (x?.status === "dead_letter") audit("job_dead_letter", x.title, { id, error: msg });
    return x;
  } finally { busy = false; }
}

export function startWorker(everyMs = 1500) {
  if (timer) return;
  recover();
  timer = setInterval(() => { runOnce().catch(() => {}); }, everyMs);
  timer.unref?.();
}
export function stopWorker() { if (timer) clearInterval(timer); timer = null; }

export function counts() {
  const c = {};
  for (const j of load()) c[j.status] = (c[j.status] || 0) + 1;
  return c;
}
