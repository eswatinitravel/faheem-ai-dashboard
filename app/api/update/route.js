import fs from "fs";
import path from "path";
import { spawn } from "child_process";

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
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/package.json?ref=main&t=${Date.now()}`, { cache: "no-store", headers: { Accept: "application/vnd.github.raw+json", "User-Agent": "faheem-ai" } });
      if (!r.ok) throw new Error(`GitHub API ${r.status}`);
      return JSON.parse(await r.text()).version;
    },
    async () => {
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/package.json?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      return (await r.json()).version;
    },
  ];
  let last;
  for (const t of tries) { try { const v = await t(); if (v) return v; } catch (e) { last = e; } }
  throw last || new Error("version nahi mila");
}

export async function GET() {
  const { version, updateRepo } = pkg();
  try {
    const latest = await latestVersion(updateRepo);
    return Response.json({ current: version, latest, available: newer(latest, version), checkedAt: Date.now() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ current: version, latest: null, available: false, error: err.message }, { headers: { "Cache-Control": "no-store" } });
  }
}

// Start the updater (Windows) in its own window, then this server is restarted by it.
export async function POST(req) {
  if (!isLocal(req)) return Response.json({ error: "Sirf isi laptop se." }, { status: 403 });
  if (process.platform !== "win32") return Response.json({ error: "Auto-update sirf Windows par. Docker par: git pull && docker compose up -d --build" }, { status: 400 });
  const script = path.join(process.cwd(), "scripts", "update.ps1");
  // v3.2.7: pehle "cmd /c start" ki quoting Windows par toot jati thi aur window khulti hi nahi thi.
  // Ab PowerShell ka Start-Process hamesha nayi, dikhne wali window kholta hai.
  const q = script.replace(/'/g, "''");
  const cmd = `Start-Process -FilePath powershell.exe -WindowStyle Normal -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${q}"'`;
  const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.on("error", () => {});
  child.unref();
  return Response.json({ ok: true });
}
