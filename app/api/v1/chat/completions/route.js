// OpenAI-compatible bridge: Dyad (ya koi bhi app) yahan baat kare to jawab
// Faheem AI ki free pipeline deti hai — aapki keys pehle, phir bina-key free brains.
// v3.27: phone (Maid / PocketPal AI) bhi isi se judta hai — LAN se sirf /connect wali key ke saath (proxy.js).
// Dyad mein: Base URL = http://localhost:3000/api/v1 , API key = free , Model = faheem-free
import { getProviders, callProvider, isCooling, sortProviders } from "../../../../../lib/providers";
import { preflight, withCors } from "../../../../../lib/cors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ORDER = ["groq", "gemini", "zai", "mistral", "openrouter"];

function toText(c) {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => (typeof p === "string" ? p : p?.text || "")).join("\n");
  return c == null ? "" : String(c);
}

export const OPTIONS = (req) => preflight(req);
export async function POST(req) { return withCors(req, await handle(req)); }
async function handle(req) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) return Response.json({ error: { message: "messages required" } }, { status: 400 });
  const messages = body.messages
    .filter((m) => m && ["system", "user", "assistant"].includes(m.role))
    .map((m) => ({ role: m.role, content: toText(m.content) }))
    .filter((m) => m.content);

  const id = "chatcmpl-" + Date.now().toString(36);
  const created = Math.floor(Date.now() / 1000);
  const model = body.model || "faheem-free";

  if (!body.stream) {
    const { reply, used, errors } = await answer(messages);
    if (reply == null) return Response.json({ error: { message: "Koi free brain jawab nahi de saka: " + errors.join(" | ") } }, { status: 503 });
    return Response.json({
      id, object: "chat.completion", created, model,
      choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      system_fingerprint: used.id,
    });
  }

  // Streaming (Dyad, Maid, PocketPal isi tarah maangte hain). v3.27: stream foran shuru, brain soche to har 10s
  // ": ping" (SSE comment) taake phone app ka idle timeout na kate; phir jawab chhote tukron mein.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (obj) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }] });
      const ping = setInterval(() => { try { ctrl.enqueue(enc.encode(": ping\n\n")); } catch {} }, 10000);
      let res;
      try { res = await answer(messages); } finally { clearInterval(ping); }
      if (res.reply == null) {
        send({ error: { message: "Koi free brain jawab nahi de saka: " + res.errors.join(" | ").slice(0, 600) } });
      } else {
        for (let i = 0; i < res.reply.length; i += 400) {
          send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { content: res.reply.slice(i, i + 400) }, finish_reason: null }] });
        }
        send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } });
      }
      ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}

async function answer(messages) {
  const providers = sortProviders(getProviders(), ORDER);
  const errors = [];
  for (const p of providers) {
    if (isCooling(p.id)) { errors.push(`${p.name}: cooling down`); continue; }
    try { return { reply: await callProvider(p, messages, 240000), used: p, errors }; }
    catch (err) { errors.push(`${p.name}: ${err.message}`); }
  }
  return { reply: null, used: null, errors };
}
