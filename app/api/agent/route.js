import { runAgent } from "../../../lib/agent/loop";
import { runTeamMode } from "../../../lib/agent/team-run";

export const dynamic = "force-dynamic";
export const maxDuration = 1800;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}

// 🤖 Agent Mode: Cursor jaisa — agent khud files parhta/likhta, commands chalata, check karta, theek karta.
export async function POST(req) {
  if (!isLocal(req)) return Response.json({ error: "Agent sirf isi laptop par." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const task = String(body?.task || "").trim();
  if (!task) return Response.json({ error: "Kaam likhein." }, { status: 400 });
  const images = (Array.isArray(body?.images) ? body.images : []).filter((a) => typeof a?.dataUrl === "string" && a.dataUrl.startsWith("data:image/")).slice(0, 3);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      let open = true;
      const emit = (o) => { if (!open) return; try { ctrl.enqueue(enc.encode(JSON.stringify({ ...o, at: Date.now() }) + "\n")); } catch { open = false; } };
      // v3.13: Team mode (Designer → Coder → Tester → Reviewer) sirf jab user ne on kiya ho; warna purana Agent Mode.
      try { if (body.team === true) await runTeamMode({ project: body.project, task, images, emit, signal: req.signal }); else await runAgent({ project: body.project, task, images, emit, signal: req.signal }); }
      catch (e) { emit({ type: "error", text: e.message }); }
      open = false;
      try { ctrl.close(); } catch {}
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
