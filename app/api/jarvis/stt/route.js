import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { getConfig } from "../../../../lib/config";
import { localSttReady, PY } from "../../../../lib/jarvis/stt.js";
import { fetchWithTimeout, TIMEOUTS } from "../../../../lib/net.js";
import { viaVoice } from "../../../../lib/jarvis/voice.js";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Awaz -> text: 1) laptop wala Whisper (free, offline)  2) Groq Whisper (free key)  3) nahi to browser khud sunega (code: "browser").
export async function POST(req) {
  const form = await req.formData();
  const audio = form.get("audio");
  if (!audio || typeof audio === "string") return Response.json({ error: "No audio" }, { status: 400 });
  const lang = String(form.get("lang") || "");
  if (await localSttReady()) {
    // v3.32: pehle voice server (model pehle se load, foran jawab)
    const model0 = getConfig().WHISPER_MODEL || "small";
    const vr = await viaVoice(`/stt?model=${encodeURIComponent(model0)}${lang === "en" || lang === "ur" ? "&lang=" + lang : ""}`, Buffer.from(await audio.arrayBuffer()), "application/octet-stream", 60000);
    if (vr) { const d = await vr.json().catch(() => null); if (d && typeof d.text === "string") return Response.json({ text: d.text.trim(), engine: "local-whisper (server)" }); }
    const f = path.join(os.tmpdir(), `jarvis-${Date.now()}.webm`);
    fs.writeFileSync(f, Buffer.from(await audio.arrayBuffer()));
    const model = getConfig().WHISPER_MODEL || "small";
    const text = await new Promise((res) => execFile(PY, [path.join(process.cwd(), "lib", "jarvis", "stt.py"), f, model], { timeout: 110000, windowsHide: true, maxBuffer: 1 << 20 }, (e, out) => res(e ? null : String(out || "").trim())));
    try { fs.unlinkSync(f); } catch {}
    if (text !== null) return Response.json({ text, engine: "local-whisper" });
  }
  const { GROQ_API_KEY } = getConfig();
  if (GROQ_API_KEY) {
    const out = new FormData();
    out.append("file", audio, "speech.webm");
    out.append("model", "whisper-large-v3-turbo");
    if (lang === "en" || lang === "ur") out.append("language", lang);
    let r;
    try { r = await fetchWithTimeout("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${GROQ_API_KEY.split(",")[0].trim()}` }, body: out }, { ms: TIMEOUTS.whisper, what: "Groq Whisper" }); }
    catch (e) { return Response.json({ error: e.timeout ? e.message : `Groq Whisper se raabta nahi hua: ${String(e.message).slice(0, 120)}`, code: "browser" }, { status: 504 }); }
    if (r.ok) { const d = await r.json(); return Response.json({ text: (d.text || "").trim(), engine: "groq-whisper" }); }
    if (r.status === 401 || r.status === 403) return Response.json({ error: "Groq key expire ya ghalat hai. Nayi free key console.groq.com/keys se lagayein. Abhi browser sunega.", code: "browser" }, { status: 400 });
    if (r.status === 429) return Response.json({ error: "Groq ki limit poori. Abhi browser sunega.", code: "browser" }, { status: 429 });
  }
  return Response.json({ error: "Laptop par Whisper nahi aur Groq key bhi nahi.", code: "browser" }, { status: 400 });
}
