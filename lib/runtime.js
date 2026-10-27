// Runtime Tester ka wrapper: scripts/runtime-test.cjs ko alag process mein chalata hai (20 sec had).
// Kabhi crash nahi karta: tester na chal sake to { skipped: true } wapas deta hai, kaam rukta nahi.
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const SCRIPT = path.join(process.cwd(), "scripts", "runtime-test.cjs");

export function runtimeTest({ file, html } = {}) {
  return new Promise((resolve) => {
    if (!fs.existsSync(SCRIPT)) return resolve({ skipped: true, errors: [], reason: "tester file nahi" });
    let out = "", err = "", done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    let child;
    try {
      child = spawn(process.execPath, [SCRIPT, file || "-"], { cwd: process.cwd(), windowsHide: true });
    } catch (e) { return finish({ skipped: true, errors: [], reason: e.message }); }
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      finish({ ok: false, errors: ["Page 20 second mein khatam nahi hua — shayad JavaScript mein ruk jane wala loop (infinite loop) hai."], clicked: 0 });
    }, 20000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); finish({ skipped: true, errors: [], reason: e.message }); });
    child.on("close", () => {
      clearTimeout(timer);
      const line = out.trim().split("\n").reverse().find((l) => l.startsWith("{"));
      try { finish(JSON.parse(line)); }
      catch { finish({ skipped: true, errors: [], reason: (err || out).slice(0, 200) || "no output" }); }
    });
    if (!file) { try { child.stdin.end(String(html || "")); } catch {} }
  });
}
