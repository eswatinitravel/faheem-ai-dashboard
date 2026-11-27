// v3.31.1 Jarvis streaming: NDJSON. {"type":"sentence","text"} har jumle par, aakhir mein {"type":"done",...}.
import { jarvisTurn } from "../../../../lib/jarvis/brain.js";
import { isPaused } from "../../../../lib/ops/control";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

export async function POST(req) {
  let b; try { b = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const text = String(b?.text || "").trim().slice(0, 2000);
  const images = Array.isArray(b?.images) ? b.images.filter((x) => typeof x === "string").slice(0, 3) : [];
  if (!text && !images.length) return Response.json({ error: "Kuch kahiye." }, { status: 400 });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const put = (o) => { try { ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch {} };
      try {
        let paused = false; try { paused = isPaused(); } catch {}
        if (paused) { put({ type: "done", reply: "Pause All chalu hai. Pehle Resume dabayein.", tail: "Pause All chalu hai. Pehle Resume dabayein.", emotion: "neutral" }); return ctrl.close(); }
        const out = await jarvisTurn({ text, images, history: Array.isArray(b.history) ? b.history : [], gender: b.gender === "female" ? "female" : "male", lang: ["en", "ur-script", "roman"].includes(b.lang) ? b.lang : "roman", pending: b.pending || null, preferLocal: b.preferLocal !== false, role: String(b.role || "assistant"), tone: String(b.tone || "professional"), name: String(b.name || ""), onSentence: (s) => put({ type: "sentence", text: s }) });
        const spoken = norm(out.spoken), reply = norm(out.reply);
        let tail = "";
        if (!spoken) tail = reply;
        else if (reply.startsWith(spoken)) tail = reply.slice(spoken.length).trim();
        else if (out.pending || (out.action?.result && !out.action.result.ok)) tail = norm(out.action?.result?.say || reply);
        const { spoken: _s, ...rest } = out;
        put({ type: "done", ...rest, tail });
      } catch (e) { put({ type: "error", error: String(e?.message || e).slice(0, 200) }); }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" } });
}
