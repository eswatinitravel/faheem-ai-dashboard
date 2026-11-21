import os from "os";
import fs from "fs";
import { execFile } from "child_process";

export const dynamic = "force-dynamic";
let prev = null; let batt = { at: 0, v: null, charging: null };

function cpuPct() {
  const c = os.cpus(); const t = c.reduce((a, x) => { const s = Object.values(x.times).reduce((p, q) => p + q, 0); a.total += s; a.idle += x.times.idle; return a; }, { total: 0, idle: 0 });
  const p = prev; prev = t; if (!p) return null;
  const dt = t.total - p.total; return dt > 0 ? Math.round(100 * (1 - (t.idle - p.idle) / dt)) : null;
}
function battery() {
  if (process.platform !== "win32" || Date.now() - batt.at < 30000) return;
  batt.at = Date.now();
  execFile("powershell", ["-NoProfile", "-Command", "$b=Get-CimInstance Win32_Battery; if($b){\"$($b.EstimatedChargeRemaining),$($b.BatteryStatus)\"}"], { timeout: 6000, windowsHide: true }, (e, out) => {
    const [v, st] = String(out || "").trim().split(","); if (v) batt = { at: Date.now(), v: Number(v), charging: st === "2" };
  });
}

export async function GET() {
  battery();
  let cpu = cpuPct(); if (cpu == null) { await new Promise((r) => setTimeout(r, 250)); cpu = cpuPct(); }
  const mem = { total: os.totalmem(), free: os.freemem() };
  let disk = null;
  try { const s = fs.statfsSync(process.platform === "win32" ? (process.env.SystemDrive || "C:") + "\\" : "/"); disk = { total: s.blocks * s.bsize, free: s.bavail * s.bsize }; } catch {}
  return Response.json({
    cpu, cores: os.cpus().length, cpuName: os.cpus()[0]?.model || "",
    ram: Math.round(100 * (1 - mem.free / mem.total)), ramGB: [(mem.total - mem.free) / 2 ** 30, mem.total / 2 ** 30].map((x) => +x.toFixed(1)),
    disk: disk ? Math.round(100 * (1 - disk.free / disk.total)) : null, diskGB: disk ? [(disk.total - disk.free) / 2 ** 30, disk.total / 2 ** 30].map((x) => Math.round(x)) : null,
    battery: batt.v, charging: batt.charging, uptimeH: +(os.uptime() / 3600).toFixed(1),
  });
}
