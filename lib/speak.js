// v3.40 Jarvis khud bolta hai (subah ki report waghera).
// Jarvis page khula ho (pichle 90s mein us ne /api/subah/say pucha) to page apni achhi awaz mein bolta hai.
// Warna Windows ki apni awaz (System.Speech) se laptop bolta hai. Text env se jata hai, command mein nahi (injection nahi).
import { spawn } from "child_process";

const G = globalThis;
G.__jarvisSayQueue ||= [];
export function pageHeartbeat() { G.__jarvisPageSeen = Date.now(); const q = G.__jarvisSayQueue; G.__jarvisSayQueue = []; return q; }
export const pageActive = () => Date.now() - (G.__jarvisPageSeen || 0) < 90000;

export function speakOnLaptop(text) {
  if (process.platform !== "win32") return false;
  const ps = "$t=$env:JARVIS_SAY; Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate=0; $s.Speak($t)";
  try {
    const c = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps], { detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env, JARVIS_SAY: String(text).slice(0, 4000) } });
    c.unref(); return true;
  } catch { return false; }
}

export async function announce(text, title = "Jarvis") {
  if (pageActive()) { G.__jarvisSayQueue.push({ at: new Date().toISOString(), title, text: String(text).slice(0, 4000) }); return "page"; }
  return speakOnLaptop(text) ? "laptop" : "none";
}
