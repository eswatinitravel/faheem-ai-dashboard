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

// ---- 2. Update: backup + khud wapsi + "purane version par wapas" ----
const U = await import("./update-backup.mjs");
const app = path.join(tmp, "app");
const w = (f, c) => { fs.mkdirSync(path.dirname(path.join(app, f)), { recursive: true }); fs.writeFileSync(path.join(app, f), c); };
const r = (f) => fs.readFileSync(path.join(app, f), "utf8");
w("package.json", JSON.stringify({ version: "3.28.0" })); w("lib/a.js", "purana"); w("app/page.js", "purana page");
w("data/chats.json", "meri chats"); w("node_modules/x/index.js", "pkg"); w(".next/BUILD_ID", "b1"); w(".env.local", "KEY=raaz");
let bk;
await t("backup: app files copy, node_modules / data / .next / .env.local nahi", () => {
  bk = U.backup(app, { now: new Date(2026, 10, 26, 22, 0, 0) });
  const names = fs.readdirSync(bk.dir);
  return path.basename(bk.dir) === "v3.28.0-2026-11-26_220000" && names.includes("lib") && names.includes("package.json")
    && !["data", "node_modules", ".next", ".env.local", "backups"].some((n) => names.includes(n)) && U.listBackups(app)[0].version === "3.28.0";
});
await t("naya version lag kar fail -> restore: purani files wapas, nayi files hati, user data wahi", () => {
  w("package.json", JSON.stringify({ version: "3.29.0" })); w("lib/a.js", "naya toota"); w("lib/naya.js", "sirf naye mein"); w("data/chats.json", "meri chats + nayi");
  const res = U.restore(app, bk.dir);
  return res.version === "3.28.0" && JSON.parse(r("package.json")).version === "3.28.0" && r("lib/a.js") === "purana" && !fs.existsSync(path.join(app, "lib/naya.js"))
    && r("data/chats.json") === "meri chats + nayi" && r(".env.local") === "KEY=raaz" && r("node_modules/x/index.js") === "pkg" && r(".next/BUILD_ID") === "b1";
});
await t("rollback (backupDir ke baghair) sab se naya backup lagata hai", () => {
  w("package.json", JSON.stringify({ version: "3.29.0" })); U.backup(app, { now: new Date(2026, 10, 27, 9, 0, 0) });
  w("package.json", JSON.stringify({ version: "3.30.0" }));
  return U.restore(app).version === "3.29.0" && JSON.parse(r("package.json")).version === "3.29.0";
});
await t("sirf aakhri 3 backups rehte hain; adhoora backup kabhi nahi chuna jata", () => {
  for (let i = 0; i < 4; i++) U.backup(app, { now: new Date(2026, 11, 1 + i) });
  fs.mkdirSync(path.join(app, "backups", "v9.9.9-adhoora"), { recursive: true });
  const l = U.listBackups(app);
  return l.length === 3 && !l.some((b) => b.name.includes("adhoora"));
});
await t("koi backup na ho to wapsi saaf error deti hai", () => { const e = path.join(tmp, "khali"); fs.mkdirSync(e); fs.writeFileSync(path.join(e, "package.json"), "{}"); try { U.restore(e); return false; } catch (x) { return /backup nahi mila/i.test(x.message); } });
await t("update.ps1: backup pehle, fail par khud wapsi, -Rollback, ASCII (PowerShell 5.1)", () => {
  const ps = read("scripts/update.ps1");
  return /param\(\[switch\]\$Rollback\)/.test(ps) && ps.indexOf("backup `\"$root`\"") < ps.indexOf("Copy-Item -Path $_.FullName") && /Restore-Backup \$backupDir/.test(ps)
    && /Start-And-Check/.test(ps) && /update-backup\.mjs/.test(ps) && !/[^\x00-\x7F]/.test(ps) && /\$keep = @\("data", ".env.local", "node_modules", ".next"\)/.test(ps);
});
await t("/api/update: rollback action + ?local=1 + ROLLBACK.bat", () => {
  const up = read("app/api/update/route.js");
  return /action === "rollback"/.test(up) && /isLocal\(req\)/.test(up) && /"local"\) === "1"/.test(up) && fs.existsSync(path.join(root, "ROLLBACK.bat")) && /-Rollback/.test(read("ROLLBACK.bat"));
});

// ---- 3. Timeouts: atka hua server dashboard ko nahi rokta; streaming nahi tootti ----
const http = await import("http");
const N = await import("../lib/net.js");
const srv = http.createServer((req, res) => {
  if (req.url.startsWith("/hang")) return; // kabhi jawab nahi
  if (req.url.startsWith("/stream")) { res.writeHead(200, { "Content-Type": "text/plain" }); let i = 0; const iv = setInterval(() => { res.write(`c${i}\n`); if (++i === 5) { clearInterval(iv); res.end(); } }, 120); return; }
  res.end("ok");
});
await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${srv.address().port}`;
await t("fetchWithTimeout: atka server -> saaf Roman Urdu timeout", async () => {
  const t0 = Date.now();
  try { await N.fetchWithTimeout(`${base}/hang`, {}, { ms: 300, what: "Test server" }); return false; }
  catch (e) { return e.timeout === true && /Test server ne 0 second|Test server ne \d+ second mein jawab nahi diya \(timeout\)/.test(e.message) && Date.now() - t0 < 3000; }
});
await t("fetchWithTimeout: Stop (apna signal) timeout nahi kehlata", async () => {
  const ac = new AbortController(); setTimeout(() => ac.abort(), 100);
  try { await N.fetchWithTimeout(`${base}/hang`, { signal: ac.signal }, { ms: 5000 }); return false; } catch (e) { return !e.timeout; }
});
await t("fetchWithTimeout untilHeaders: stream had se lamba chale to bhi poora milta hai", async () => {
  const r = await N.fetchWithTimeout(`${base}/stream`, {}, { ms: 250, untilHeaders: true });
  const txt = await r.text(); return txt.split("\n").filter(Boolean).length === 5;
});
await t("brain call (providers) atke to saaf timeout paigham, 'timeout' lafz ke sath", async () => {
  const P = await import("../lib/providers.js");
  try { await P.callProvider({ id: "testbrain", name: "Test", base: `${base}/hang/v1`, model: "m", key: "k" }, [{ role: "user", content: "hi" }], 300); return false; }
  catch (e) { return /Test brain ne/.test(e.message) && /timeout/.test(e.message) && !/aborted/i.test(e.message); }
});
srv.close();
await t("server ki har bahar wali fetch() par had (signal) hai", () => {
  const walk = (d, out = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, out); else if (/\.js$/.test(f.name)) out.push(p); } return out; };
  const files = [...walk(path.join(root, "lib")), ...walk(path.join(root, "app", "api"))];
  const bare = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/(?<![\w.])fetch\(/g)) {
      const line = src.slice(src.lastIndexOf("\n", m.index) + 1, src.indexOf("\n", m.index));
      if (/^\s*\/\//.test(line) || /fetchImpl/.test(line)) continue; // comment
      let i = m.index + 6, d = 1; while (d && i < src.length) { const c = src[i++]; if (c === "(") d++; else if (c === ")") d--; }
      if (!/signal/.test(src.slice(m.index, i))) bare.push(`${path.relative(root, f)}: ${line.trim().slice(0, 80)}`);
    }
  }
  if (bare.length) throw new Error("bina had: " + bare.join(" | "));
  return true;
});

console.log(`\n${pass} pass, ${fail} fail`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
