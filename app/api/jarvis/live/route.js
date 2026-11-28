// v3.42 Jarvis Live: token + setup (POST action=start) aur tool call (action=tool). Sirf laptop (proxy.js LAN se nahi kholta).
import { createLiveToken, liveSetup, liveSettings, liveTool } from "../../../../lib/jarvis/live.js";
import { isPaused } from "../../../../lib/ops/control";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET() {
  const s = liveSettings();
  return Response.json({ ok: true, ready: s.ready, model: s.model });
}
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const gender = b.gender === "female" ? "female" : "male";
  if (b.action === "start") {
    const t = await createLiveToken();
    if (!t.ok) return Response.json(t, { status: 400 });
    return Response.json({ ...t, setup: liveSetup({ model: t.model, gender, name: String(b.name || "").slice(0, 40) }) });
  }
  if (b.action === "tool") {
    try { if (isPaused()) return Response.json({ reply: "Pause All chalu hai. Laptop par Resume dabayein.", pending: null }); } catch {}
    const r = await liveTool({ hukum: b.hukum, pending: b.pending || null, gender });
    return Response.json(r);
  }
  return Response.json({ ok: false, error: "action: start | tool" }, { status: 400 });
}
