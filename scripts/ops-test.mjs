// v3.17 ops test: queue, retry/backoff, dead-letter, recovery, approvals, audit, pause, schedules, brain roles.
import fs from "fs"; import os from "os"; import path from "path";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ops-"));
process.env.FAHEEM_OPS_DIR = path.join(tmp, "ops"); process.env.HOME = tmp; process.env.USERPROFILE = tmp;
const Q = await import("../lib/ops/queue.js");
const A = await import("../lib/ops/approvals.js");
const AU = await import("../lib/ops/audit.js");
const C = await import("../lib/ops/control.js");
const S = await import("../lib/ops/scheduler.js");
const R = await import("../lib/brain-roles.js");
let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };
const jobs = () => Q.listJobs();
const j1 = () => jobs()[0];

await t("kaam pehle save hota hai", () => { const j = Q.enqueue("echo", { x: 1 }, { title: "test" }); return j.status === "queued" && fs.existsSync(path.join(tmp, "ops", "jobs.json")); });
await t("idempotency: wahi key = wahi kaam", () => { const a = Q.enqueue("echo", {}, { key: "k1" }); const b = Q.enqueue("echo", {}, { key: "k1" }); return a.id === b.id; });
Q.registerHandler("echo", async (j) => `ok ${j.payload.x ?? ""}`);
await t("handler chal kar completed", async () => { await Q.runOnce(); await Q.runOnce(); return jobs().filter((j) => j.status === "completed").length === 2; });
let n = 0; Q.registerHandler("flaky", async () => { if (++n < 3) throw new Error("busy"); return "theek"; });
await t("ghalti par retrying + backoff", async () => { Q.enqueue("flaky", {}, { title: "flaky" }); await Q.runOnce(); const j = j1(); return j.status === "retrying" && Date.parse(j.runAt) > Date.now(); });
await t("backoff ke baad kamyab", async () => { await Q.runOnce(Date.now() + 5000); await Q.runOnce(Date.now() + 20000); return j1().status === "completed" && j1().attempts === 3; });
Q.registerHandler("bad", async () => { throw new Error("hamesha fail sk-abcdefghijklmnop1234"); });
await t("5 dafa ke baad dead_letter + key chhupi", async () => { Q.enqueue("bad", {}, { title: "bad" }); for (let i = 0; i < 6; i++) await Q.runOnce(Date.now() + 1e7); const j = j1(); return j.status === "dead_letter" && j.attempts === 5 && !j.error.includes("sk-abc"); });
await t("dead_letter se Retry", () => Q.retryJob(j1().id).status === "queued");
await t("Cancel", () => Q.cancelJob(j1().id).status === "cancelled");
await t("crash recovery: running wapas queued", () => { const f = path.join(tmp, "ops", "jobs.json"); const all = JSON.parse(fs.readFileSync(f, "utf8")); all.push({ id: "job_x", kind: "echo", title: "crash", payload: {}, status: "running", attempts: 1, maxAttempts: 5, createdAt: new Date().toISOString(), runAt: new Date().toISOString(), steps: [] }); fs.writeFileSync(f, JSON.stringify(all)); return Q.recover() === 1 && jobs().find((j) => j.id === "job_x").status === "queued"; });
Q.registerHandler("needs_ok", async (j, ctx) => (j.payload.approvalId ? "chala" : ctx.waitForApproval("apr_1")));
await t("waiting_for_approval aur phir resume", async () => { const j = Q.enqueue("needs_ok", {}, { title: "ok?" }); await Q.runOnce(); await Q.runOnce(); await Q.runOnce(); const w = jobs().find((x) => x.id === j.id); if (w.status !== "waiting_for_approval") throw new Error(w.status); Q.resumeAfterApproval(j.id, "apr_1"); for (let i = 0; i < 4; i++) await Q.runOnce(); return jobs().find((x) => x.id === j.id).status === "completed"; });

await t("approval: manzoori ke baghair nahi chalta", () => { const a = A.requestApproval({ tool: "delete_file", args: { path: "a.txt" } }); return !A.consume(a.id, "delete_file", { path: "a.txt" }).ok && a.risk === "high"; });
await t("approval: manzoor + wahi args = ek dafa", () => { const a = A.requestApproval({ tool: "delete_file", args: { path: "b.txt" } }); A.decide(a.id, true); return A.consume(a.id, "delete_file", { path: "b.txt" }).ok && !A.consume(a.id, "delete_file", { path: "b.txt" }).ok; });
await t("approval: args badle to nahi", () => { const a = A.requestApproval({ tool: "delete_file", args: { path: "c.txt" } }); A.decide(a.id, true); return !A.consume(a.id, "delete_file", { path: "d.txt" }).ok; });
await t("approval: reject", () => { const a = A.requestApproval({ tool: "run_command", args: { cmd: "npm i x" } }); return A.decide(a.id, false).status === "rejected"; });
await t("approval: expire", () => { const f = path.join(tmp, "ops", "approvals.json"); const a = A.requestApproval({ tool: "publish", args: {} }); const all = JSON.parse(fs.readFileSync(f, "utf8")); all.find((x) => x.id === a.id).expiresAt = new Date(Date.now() - 1000).toISOString(); fs.writeFileSync(f, JSON.stringify(all)); return A.listApprovals().find((x) => x.id === a.id).status === "expired"; });
await t("gate: pehli dafa ijazat maangta, manzoori ke baad chalta", () => { const g1 = A.gate("delete_file", { project: "p", path: "z.txt" }, "test"); if (g1.allowed) return false; const g2 = A.gate("delete_file", { project: "p", path: "z.txt" }); if (g2.allowed || g2.id !== g1.id) return false; A.decide(g1.id, true); return A.gate("delete_file", { project: "p", path: "z.txt" }).allowed === true; });
await t("audit log mein records, secret chhupa", () => { AU.audit("x", "key AIzaSyA1234567890abcdefghijkl", { api_key: "abcdef123456" }); const l = AU.listAudit(); return l.length > 5 && !JSON.stringify(l).includes("AIzaSyA1234") && !JSON.stringify(l).includes("abcdef123456"); });
await t("Pause All queue rokta hai", async () => { C.setPaused(true); Q.enqueue("echo", {}, { title: "paused" }); const r = await Q.runOnce(); const ok = r === null && j1().status === "queued"; C.setPaused(false); await Q.runOnce(); return ok && j1().status === "completed"; });
await t("schedule: nextRun daily/15m", () => { const base = new Date(2026, 10, 20, 10, 0); return S.nextRun("15m", base).getTime() - base.getTime() === 900000 && S.nextRun("daily@09:00", base).getDate() === 21 && S.nextRun("bakwas") === null; });
await t("schedule: tick kaam line mein daalta hai + history", () => { const s = S.createSchedule({ prompt: "hello", every: "15m", at: new Date(Date.now() - 1000).toISOString() }); const c = S.tick(); const after = S.listSchedules().find((x) => x.id === s.id); return c === 1 && after.history.length === 1 && Date.parse(after.nextRunAt) > Date.now(); });
await t("schedule: Run Now", () => { const s = S.listSchedules()[0]; return !!S.runNow(s.id).id && S.listSchedules()[0].history.length === 2; });
await t("schedule: ghalat waqt rad", () => { try { S.createSchedule({ prompt: "x", every: "kabhi" }); return false; } catch { return true; } });
await t("brains: har kaam ka order, Ollama aakhir", () => R.allRoles().length === 8 && R.allRoles().every((r) => r.order.at(-1) === "ollama" && r.order.length >= 13));
await t("brains: research pehle DeepSeek (sambanova)", () => R.preferFor("research")[0] === "sambanova" && R.preferFor("general")[0] === "groq");
await t("brains: apna order save aur default wapas", () => { R.saveOverride("coder", ["mistral", "groq"]); const o = R.preferFor("coder"); const ok = o[0] === "mistral" && o[1] === "groq" && o.includes("gemini"); R.saveOverride("coder", []); return ok && R.preferFor("coder")[0] === "gemini"; });

console.log(`\n${pass} pass, ${fail} fail`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
