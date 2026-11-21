import { autopilot, pullModel } from "../../../lib/autopilot";
import { getConfig, writeSaved } from "../../../lib/config";
import { audit } from "../../../lib/ops/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });

// v3.20 Model Autopilot: GET = hardware + mashwara; POST pull/use.
export async function GET(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  try { return Response.json({ ok: true, ...(await autopilot(getConfig().OLLAMA_MODEL || "llama3.2:3b")) }); }
  catch (e) { return bad(e.message, 500); }
}

export async function POST(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  const b = await req.json().catch(() => ({}));
  try {
    if (b.action === "pull") { const r = await pullModel(b.model); try { audit("model_pull", b.model); } catch {} return Response.json({ ok: true, ...r }); }
    if (b.action === "use") {
      if (!/^[a-z0-9._:-]{2,60}$/i.test(String(b.model || ""))) return bad("Model ka naam ghalat hai");
      writeSaved({ OLLAMA_MODEL: b.model, OLLAMA_ENABLED: "true" });
      try { audit("model_use", b.model); } catch {}
      return Response.json({ ok: true, model: b.model });
    }
    return bad("Action nahi pehchana");
  } catch (e) { return bad(e.message, 500); }
}
