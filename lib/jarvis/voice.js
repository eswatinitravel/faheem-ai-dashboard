// v3.32 Voice server se baat (lib/jarvis/voice_server.py, sirf 127.0.0.1:5577).
// Na chal raha ho to ek dafa chupke se chalata hai; tab tak purana tareeqa (har baar naya Python) kaam karta hai.
import { spawn } from "child_process";
import path from "path";
import { PY } from "./stt.js";

const PORT = Number(process.env.JARVIS_VOICE_PORT || 5577);
const BASE = `http://127.0.0.1:${PORT}`;
let starting = 0;

export async function voiceUp() {
  try { const r = await fetch(BASE + "/health", { signal: AbortSignal.timeout(800) }); return r.ok; } catch { return false; }
}

export function startVoice() {
  if (Date.now() - starting < 60000) return; // ek minute mein ek hi koshish
  starting = Date.now();
  try {
    const c = spawn(PY, [path.join(process.cwd(), "lib", "jarvis", "voice_server.py"), String(PORT)], { detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" } });
    c.on("error", () => {}); c.unref();
  } catch {}
}

// Voice server se kaam; na mile to null (route purane raaste par chala jata hai).
export async function viaVoice(pathname, body, contentType, ms = 60000) {
  if (!(await voiceUp())) { startVoice(); return null; }
  try {
    const r = await fetch(BASE + pathname, { method: "POST", headers: { "Content-Type": contentType }, body, signal: AbortSignal.timeout(ms) });
    return r.ok ? r : null;
  } catch { return null; }
}
