// OpenAI-compatible bridge: Dyad (ya koi bhi app) yahan baat kare to jawab
// Faheem AI ki free pipeline deti hai — aapki keys pehle, phir bina-key free brains.
// Dyad mein: Base URL = http://localhost:3000/api/v1 , API key = free , Model = faheem-free
import { getProviders, callProvider, isCooling } from "../../../../../lib/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ORDER = ["groq", "gemini", "zai", "mistral", "openrouter", "pollinations", "llm7", "ollama"];

function toText(c) {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => (typeof p === "string" ? p : p?.text || "")).join("\n");
  return c == null ? "" : String(c);
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) return Response.json({ error: { message: "messages required" } }, { status: 400 });
  const messages = body.messages
    .filter((m) => m && ["system", "user", "assistant"].includes(m.role))
    .map((m) => ({ role: m.role, content: toText(m.content) }))
    .filter((m) => m.content);

  const providers = getProviders().sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const errors = [];
  let reply = null, used = null;
  for (const p of providers) {
    if (isCooling(p.id)) { errors.push(`${p.name}: cooling down`); continue; }
    try { reply = await callProvider(p, messages, 240000); used = p; break; }
    catch (err) { errors.push(`${p.name}: ${err.message}`); }
  }
  if (reply == null) return Response.json({ error: { message: "Koi free brain jawab nahi de saka: " + errors.join(" | ") } }, { status: 503 });

  const id = "chatcmpl-" + Date.now().toString(36);
  const created = Math.floor(Date.now() / 1000);
  const model = body.model || "faheem-free";

  if (!body.stream) {
    return Response.json({
      id, object: "chat.completion", created, model,
      choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      system_fingerprint: used.id,
    });
  }

  // Streaming (Dyad isi tarah maangta hai): jawab chhote tukron mein bhejein.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(ctrl) {
      const send = (obj) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }] });
      for (let i = 0; i < reply.length; i += 400) {
        send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { content: reply.slice(i, i + 400) }, finish_reason: null }] });
      }
      send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } });
      ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
