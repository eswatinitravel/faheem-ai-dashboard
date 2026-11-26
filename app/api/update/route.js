import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fetchWithTimeout, TIMEOUTS } from "../../../lib/net.js";

export const dynamic = "force-dynamic";

const pkg = () => JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));

function newer(a, b) {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}

// Check GitHub for a newer version.
// v3.2.9: pehle raw.githubusercontent 5 minute purana copy deta tha. Ab GitHub API (taaza) pehle, raw (cache-buster) baad mein.
async function latestVersion(repo) {
  const tries = [
    async () => {
      const r = await fetchWithTimeout(`https://api.github.com/repos/${repo}/contents/package.json?ref=main&t=${Date.now()}`, { cache: "no-store", headers: { Accept: "application/vnd.github.raw+json", "User-Agent": "faheem-ai" } }, { ms: TIMEOUTS.updateCheck, what: "GitHub (update check)" });
      if (!r.ok) throw new Error(`GitHub API ${r.status}`);
      return JSON.parse(await r.text()).version;
    },
    async () => {
      const r = await fetchWithTimeout(`https://raw.githubusercontent.com/${repo}/main/package.json?t=${Date.now()}`, { cache: "no-store" }, { ms: TIMEOUTS.updateCheck, what: "GitHub (update check)" });
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      return (await r.json()).version;
    },
  ];
  let last;
  for (const t of tries) { try { const v = await t(); if (v) return v; } catch (e) { last = e; } }
  throw last || new Error("version nahi mila");
}

// v3.29: aakhri mukammal backup (scripts/update-backup.mjs ka faheem-backup.json) — "Purane version par wapas" button ke liye.
function lastBackup() {
  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), "backups");
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())
      .map((d) => { try { const m = JSON.parse(fs.readFileSync(path.join(dir, d.name, "faheem-backup.json"), "utf8")); return m.complete ? { name: d.name, version: m.version, createdAt: m.createdAt } : null; } catch { return null; } })
      .filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
  } catch { return null; }
}

export async function GET(req) {
  const { version, updateRepo } = pkg();
  const backup = lastBackup();
  const h = { headers: { "Cache-Control": "no-store" } };
  // ?local=1: sirf apna version (update.ps1 naye server ko parakhta hai — GitHub ka intezar nahi).
  if (req && new URL(req.url).searchParams.get("local") === "1") return Response.json({ current: version, backup }, h);
  try {
    const latest = await latestVersion(updateRepo);
    return Response.json({ current: version, latest, available: newer(latest, version), backup, checkedAt: Date.now() }, h);
  } catch (err) {
    return Response.json({ current: version, latest: null, available: false, backup, error: err.message }, h);
  }
}

// Updater (ya wapsi) apni dikhne wali PowerShell window mein, server ke process-tree se bahar.
function launchPs(args) {
  const script = path.join(process.cwd(), "scripts", "update.ps1");
  const q = script.replace(/'/g, "''");
  const cmd = `Start-Process -FilePath powershell.exe -WindowStyle Normal -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${q}"${args ? " " + args : ""}'`;
  const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd], { cwd: process.cwd(), detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", () => {});
  child.unref();
}

// Start the updater (Windows) in its own window, then this server is restarted by it.
export async function POST(req) {
  if (!isLocal(req)) return Response.json({ error: "Sirf isi laptop se." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  // v3.29: "Purane version par wapas" — aakhri backup (update se pehle bana) wapas lagata hai. Chats/keys (data/, ~/.faheem-ai) nahi chhoota.
  if (body?.action === "rollback") {
    const b = lastBackup();
    if (!b) return Response.json({ error: "Koi purana version (backup) nahi mila. Backup har update se pehle banta hai." }, { status: 400 });
    if (process.platform !== "win32") return Response.json({ error: "Wapsi sirf Windows par. Linux/Docker par: node scripts/update-backup.mjs restore . && npm install && npm run build" }, { status: 400 });
    const bat = path.join(process.cwd(), "ROLLBACK.bat");
    let launched = false;
    if (fs.existsSync(bat)) {
      try { const c = spawn("explorer.exe", [bat], { cwd: process.cwd(), detached: true, stdio: "ignore" }); c.on("error", () => {}); c.unref(); launched = true; } catch {}
    }
    if (!launched) launchPs("-Rollback");
    return Response.json({ ok: true, rollback: b });
  }
  if (process.platform !== "win32") return Response.json({ error: "Auto-update sirf Windows par. Docker par: git pull && docker compose up -d --build" }, { status: 400 });
  // v3.6.3: ab UPDATE.bat ko explorer.exe kholta hai, bilkul double-click jaisa. Is tarah updater
  // server ke process-tree se bahar, apni dikhne wali window mein chalta hai aur server band hone par nahi marta.
  const bat = path.join(process.cwd(), "UPDATE.bat");
  let launched = false;
  if (fs.existsSync(bat)) {
    try {
      const c = spawn("explorer.exe", [bat], { cwd: process.cwd(), detached: true, stdio: "ignore" });
      c.on("error", () => {});
      c.unref();
      launched = true;
    } catch {}
  }
  if (!launched) launchPs("");
  return Response.json({ ok: true });
}
