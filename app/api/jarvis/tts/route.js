import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { PY } from "../../../../lib/jarvis/stt.js";
import { kittenReady, KITTEN_VOICES } from "../../../../lib/jarvis/tts.js";
import { viaVoice } from "../../../../lib/jarvis/voice.js";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Text -> wav: KittenTTS 2 nano (Hindi model, Apache-2.0), laptop par offline. Pehli dafa ~11 MB model download.
// Install: pip install onnxruntime numpy phonemizer espeakng_loader. Na ho to 400 code "browser" (page apni awaz par chala jata hai).
export async function GET() {
  return Response.json({ ready: await kittenReady(), voices: KITTEN_VOICES });
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, 1200);
  const voice = KITTEN_VOICES.includes(String(body.voice || "").toLowerCase()) ? String(body.voice).toLowerCase() : "priya";
  if (!text) return Response.json({ error: "No text" }, { status: 400 });
  if (!(await kittenReady())) return Response.json({ error: "Kitten awaz laptop par nahi lagi.", code: "browser" }, { status: 400 });
  // v3.32: pehle voice server (Kitten pehle se load)
  const vr = await viaVoice("/tts", JSON.stringify({ text, voice }), "application/json", 60000);
  if (vr) { const buf = Buffer.from(await vr.arrayBuffer()); if (buf.length > 100) return new Response(buf, { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } }); }
  const f = path.join(os.tmpdir(), `kitten-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.wav`);
  const ok = await new Promise((res) => execFile(PY, [path.join(process.cwd(), "lib", "jarvis", "kitten_tts.py"), f, voice, text], { timeout: 110000, windowsHide: true, maxBuffer: 1 << 20, env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" } }, (e) => res(!e)));
  let wav = null;
  try { if (ok) wav = fs.readFileSync(f); } catch {}
  try { fs.unlinkSync(f); } catch {}
  if (!wav || wav.length < 100) return Response.json({ error: "Kitten awaz nahi bani.", code: "browser" }, { status: 500 });
  return new Response(wav, { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
}
