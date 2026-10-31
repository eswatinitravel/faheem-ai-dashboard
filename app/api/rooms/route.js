// v3.14 Rooms API: har brain ka alag chat room. History ~/.faheem-ai/rooms/<id>.json (isi laptop par).
//   GET ?id=groq            -> us room ki history
//   POST {action:"send", id, message, attachments} -> sirf ISI brain se jawab (fallback nahi), history mein save
//   POST {action:"append", id, messages}            -> Puter (browser) room ki history save
//   POST {action:"clear", id}                       -> history mitayein
import { getProviders, callProvider, lastModelUsed } from "../../../lib/providers";
import { readRoom, appendRoom, clearRoom, historyFor, safeRoomId } from "../../../lib/rooms";
import { routeAttachments } from "../../../lib/brain-status";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const deny = () => Response.json({ ok: false, error: "Sirf isi laptop par." }, { status: 403 });

export async function GET(req) {
  if (!isLocal(req)) return deny();
  const id = new URL(req.url).searchParams.get("id");
  if (!safeRoomId(id)) return Response.json({ ok: false, error: "ghalat room id" }, { status: 400 });
  return Response.json({ ok: true, ...readRoom(id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  if (!isLocal(req)) return deny();
  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Ghalat JSON" }, { status: 400 }); }
  const id = safeRoomId(body?.id);
  if (!id) return Response.json({ ok: false, error: "ghalat room id" }, { status: 400 });

  if (body.action === "clear") { clearRoom(id); return Response.json({ ok: true }); }
  if (body.action === "append") {
    const msgs = Array.isArray(body.messages) ? body.messages.slice(0, 10) : [];
    if (!msgs.length) return Response.json({ ok: false, error: "khali" }, { status: 400 });
    return Response.json({ ok: true, ...appendRoom(id, msgs) });
  }
  if (body.action !== "send") return Response.json({ ok: false, error: "action?" }, { status: 400 });

  const text = String(body.message || "").trim();
  const atts = Array.isArray(body.attachments) ? body.attachments : [];
  if (!text && !atts.length) return Response.json({ ok: false, error: "Message khali hai" }, { status: 400 });
  let p = getProviders().find((x) => x.id === id);
  if (!p) return Response.json({ ok: false, error: "Yeh brain abhi chalu nahi — pehle iski key lagayein (ya Options mein on karein)." }, { status: 404 });

  // Picture sirf vision brain ko: Gemini (khud), Groq (vision model), Free.ai (qwen25-vl).
  const visionModel = p.vision ? null : (p.visionModel || p.roomVisionModel || null);
  const brain = { name: p.name, vision: !!(p.vision || visionModel) };
  const routed = routeAttachments(brain, text, atts);
  if (routed.imageCount && visionModel) p = { ...p, model: visionModel, vision: true };

  const room = readRoom(id);
  const messages = [
    { role: "system", content: "You are a helpful assistant inside Faheem's AI dashboard (Brains Rooms). Reply in the user's language (Roman Urdu or English), clearly and briefly." },
    ...historyFor(room),
    { role: "user", content: routed.content },
  ];
  const files = atts.map((a) => a?.name).filter(Boolean);
  const t0 = Date.now();
  try {
    const reply = await callProvider(p, messages, Math.min(Number(body.timeoutMs) || (id === "ollama" ? 110000 : 90000), 200000));
    const model = lastModelUsed(p.id) || p.model;
    appendRoom(id, [{ role: "user", content: text || "(sirf file)", files }, ...routed.notes.map((n) => ({ role: "note", content: n })), { role: "assistant", content: reply, ms: Date.now() - t0, model }]);
    return Response.json({ ok: true, text: reply, notes: routed.notes, ms: Date.now() - t0, model, sentImages: routed.imageCount });
  } catch (e) {
    const err = String(e.message || e).slice(0, 400);
    appendRoom(id, [{ role: "user", content: text || "(sirf file)", files }, ...routed.notes.map((n) => ({ role: "note", content: n })), { role: "assistant", content: err, err: true, ms: Date.now() - t0 }]);
    return Response.json({ ok: false, error: err, notes: routed.notes, ms: Date.now() - t0 });
  }
}
