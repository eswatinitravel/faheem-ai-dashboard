// Awaz: STT = Groq Whisper (free key, Urdu + English khud pehchaan). TTS = Edge ki free awazein (msedge-tts, ur-PK-UzmaNeural),
// na chale to chat window Windows ki apni awaz (speechSynthesis) istemal karti hai.
async function transcribe(buf, mime, cfg) {
  if (!cfg.GROQ_API_KEY) throw new Error("Awaz samajhne ke liye free Groq key chahiye (Settings).");
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: mime || "audio/webm" }), "voice.webm");
  fd.append("model", cfg.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  fd.append("response_format", "verbose_json");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${cfg.GROQ_API_KEY}` }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Whisper ${r.status}: ${(j.error && j.error.message) || ""}`.slice(0, 200));
  return { text: String(j.text || "").trim(), language: j.language || "" };
}

const WAKE_RE = /\b(hey|hay|hi|he|ae|ay)\s*,?\s*(puppy|pappy|pappi|puppi|papi)\b|ہے\s*پپی|ہیلو\s*پپی|ہائے\s*پپی/i;
const isWake = (text) => WAKE_RE.test(String(text || ""));

async function speak(text, voice) {
  let MsEdgeTTS, OUTPUT_FORMAT;
  try { ({ MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts")); } catch { return null; }
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const out = await tts.toStream(String(text).slice(0, 1200));
  const audioStream = (out && out.audioStream) || out;
  const chunks = [];
  await new Promise((res, rej) => { audioStream.on("data", (d) => chunks.push(d)); audioStream.on("end", res); audioStream.on("close", res); audioStream.on("error", rej); setTimeout(res, 20000); });
  try { tts.close(); } catch {}
  return chunks.length ? Buffer.concat(chunks) : null;
}

module.exports = { transcribe, speak, isWake, WAKE_RE };
