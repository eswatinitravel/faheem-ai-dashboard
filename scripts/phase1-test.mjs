// v3.29 Phase 1 bugs test (bina server, Linux CI par bhi): schedules boot / chhoote runs, update backup + rollback, fetch timeouts.
import fs from "fs"; import os from "os"; import path from "path";
import { register } from "module";
register("./ext-resolve-hook.mjs", import.meta.url); // lib/* ke bina-".js" imports
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p1-"));
process.env.FAHEEM_OPS_DIR = path.join(tmp, "ops"); process.env.HOME = tmp; process.env.USERPROFILE = tmp;
import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };

// ---- 1. Schedules: server shuru hote hi, chhoote runs ek dafa ----
const S = await import("../lib/ops/scheduler.js");
const Q = await import("../lib/ops/queue.js");
const B = await import("../lib/ops/boot.js");
const schedFile = path.join(tmp, "ops", "schedules.json");
const setDue = (id, iso) => { const l = JSON.parse(fs.readFileSync(schedFile, "utf8")); l.find((x) => x.id === id).nextRunAt = iso; fs.writeFileSync(schedFile, JSON.stringify(l)); };

await t("chhoota hua 15m schedule (3 ghante purana) sirf EK dafa chalta hai", () => {
  const s = S.createSchedule({ prompt: "har 15 min", every: "15m" });
  setDue(s.id, new Date(Date.now() - 3 * 3600e3).toISOString());
  const before = Q.listJobs().length;
  const n1 = S.tick(); const n2 = S.tick(); const n3 = S.tick();
  const after = S.listSchedules().find((x) => x.id === s.id);
  return n1 === 1 && n2 === 0 && n3 === 0 && Q.listJobs().length === before + 1 && Date.parse(after.nextRunAt) > Date.now() && after.history[0].catchUp === true;
});
await t("chhoota hua daily schedule (2 din purana): ek run, agla waqt mustaqbil mein", () => {
  const s = S.createSchedule({ prompt: "roz", every: "daily@09:00" });
  setDue(s.id, new Date(Date.now() - 2 * 86400e3).toISOString());
  const n = S.tick(); const after = S.listSchedules().find((x) => x.id === s.id);
  return n === 1 && Date.parse(after.nextRunAt) > Date.now() && Date.parse(after.nextRunAt) - Date.now() <= 86400e3;
});
await t("chhoota hua 'once' schedule ek dafa chal kar completed", () => {
  const s = S.createSchedule({ prompt: "ek dafa", every: "once" });
  setDue(s.id, new Date(Date.now() - 86400e3).toISOString());
  const n = S.tick(); return n === 1 && S.listSchedules().find((x) => x.id === s.id).status === "completed" && S.tick() === 0;
});
await t("waqt par chalne wala run catchUp nahi likha jata", () => {
  const s = S.createSchedule({ prompt: "abhi", every: "2h", at: new Date(Date.now() - 1000).toISOString() });
  S.tick(); return !S.listSchedules().find((x) => x.id === s.id).history[0].catchUp;
});
await t("boot(): shuru par foran tick + dobara bulane par dobara timer nahi", () => {
  const s = S.createSchedule({ prompt: "boot par", every: "1h" });
  setDue(s.id, new Date(Date.now() - 5 * 3600e3).toISOString());
  const first = B.boot(); const second = B.boot(); const third = B.boot();
  const after = S.listSchedules().find((x) => x.id === s.id);
  Q.stopWorker();
  return first === true && second === false && third === false && after.history.length === 1 && Date.parse(after.nextRunAt) > Date.now();
});
await t("server.mjs listen ke baad /api/ops?boot=1 bulata hai (opt-out FAHEEM_NO_OPS_BOOT)", () => {
  const s = read("server.mjs"); const r = read("app/api/ops/route.js");
  return /\/api\/ops\?boot=1/.test(s) && /wakeOps\(\)/.test(s) && /FAHEEM_NO_OPS_BOOT/.test(s) && /searchParams\.get\("boot"\) === "1"/.test(r);
});

console.log(`\n${pass} pass, ${fail} fail`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
