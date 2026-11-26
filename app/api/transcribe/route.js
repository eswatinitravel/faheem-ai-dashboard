import { getConfig } from "../../../lib/config";
import { fetchWithTimeout, TIMEOUTS } from "../../../lib/net.js";

export const dynamic = "force-dynamic";

// Speech-to-text with Groq Whisper (free tier). Understands Urdu, English and mixed speech.
export async function POST(req) {
  const { GROQ_API_KEY } = getConfig();
  if (!GROQ_API_KEY) return Response.json({ error: "Voice ke liye Settings mein Groq key chahiye." }, { status: 400 });
  const form = await req.formData();
  const audio = form.get("audio");
  if (!audio || typeof audio === "string") return Response.json({ error: "No audio" }, { status: 400 });

  const out = new FormData();
  out.append("file", audio, "speech.webm");
  out.append("model", "whisper-large-v3-turbo");
  out.append("response_format", "json");
  let res;
  try {
    res = await fetchWithTimeout("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: out,
    }, { ms: TIMEOUTS.whisper, what: "Groq Whisper" });
  } catch (e) {
    return Response.json({ error: e.timeout ? e.message : `Groq Whisper se raabta nahi hua: ${String(e.message).slice(0, 120)}` }, { status: 504 });
  }
  if (!res.ok) return Response.json({ error: `Whisper ${res.status}: ${(await res.text()).slice(0, 200)}` }, { status: 502 });
  const data = await res.json();
  return Response.json({ text: (data.text || "").trim() });
}
