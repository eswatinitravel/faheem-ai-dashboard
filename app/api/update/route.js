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
export async function GET() {
  const { version, updateRepo } = pkg();
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${updateRepo}/main/package.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const latest = (await res.json()).version;
    return Response.json({ current: version, latest, available: newer(latest, version) });
  } catch (err) {
    return Response.json({ current: version, latest: null, available: false, error: err.message });
  }
}

// Start the updater (Windows) in its own window, then this server is restarted by it.
export async function POST(req) {
  if (!isLocal(req)) return Response.json({ error: "Sirf isi laptop se." }, { status: 403 });
  if (process.platform !== "win32") return Response.json({ error: "Auto-update sirf Windows par. Docker par: git pull && docker compose up -d --build" }, { status: 400 });
  const script = path.join(process.cwd(), "scripts", "update.ps1");
  // "start" se hamesha nayi dikhne wali window khulti hai, chahe server chhupa (hidden) chal raha ho.
  const child = spawn("cmd.exe", ["/c", "start", "\"Faheem AI - Update\"", "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return Response.json({ ok: true });
}
