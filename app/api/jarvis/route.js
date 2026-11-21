import { jarvisTurn } from "../../../lib/jarvis/brain.js";
import { stats, readNotes, prefs, savePrefs } from "../../../lib/jarvis/memory.js";
import { hasChromeDevtools } from "../../../lib/jarvis/actions.js";
import { ollamaStatus } from "../../../lib/autopilot.js";
import { isPaused } from "../../../lib/ops/control";
import { localSttReady } from "../../../lib/jarvis/stt.js";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

// Jarvis ki halat: Ollama, local Whisper, Chrome control, seekhe hue qawaid.
export async function GET() {
  let ollama = null; try { ollama = await ollamaStatus(); } catch {}
  return Response.json({ ollama, localStt: await localSttReady(), chromeDevtools: hasChromeDevtools(), stats: stats(), notes: readNotes(), prefs: prefs(), platform: process.platform });
}

export async function POST(req) {
  let b; try { b = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const text = String(b?.text || "").trim().slice(0, 2000);
  if (b?.prefs) return Response.json({ prefs: savePrefs(b.prefs) });
  if (!text) return Response.json({ error: "Kuch kahiye." }, { status: 400 });
  try { if (isPaused()) return Response.json({ reply: "Pause All chalu hai. Pehle Resume dabayein.", emotion: "neutral" }); } catch {}
  const out = await jarvisTurn({ text, history: Array.isArray(b.history) ? b.history : [], gender: b.gender === "female" ? "female" : "male", lang: ["en", "ur-script", "roman"].includes(b.lang) ? b.lang : "roman", pending: b.pending || null, preferLocal: b.preferLocal !== false, role: String(b.role || "assistant"), tone: String(b.tone || "friendly"), name: String(b.name || "") });
  return Response.json(out);
}
