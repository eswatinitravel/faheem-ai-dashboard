import { researchProject, isBuildRequest } from "../../../lib/research.js";
import { researchAssistants } from "../../../lib/assistant-research.js";
import { isAssistantRequest } from "../../../lib/zip-intent.js";
export const dynamic = "force-dynamic";
const isLocal = (req) => ["localhost", "127.0.0.1", "[::1]"].includes((req.headers.get("host") || "").split(":")[0]);
// v3.15: POST { text } -> { ok, isBuild, research }
export async function POST(req) {
  if (!isLocal(req)) return Response.json({ ok: false, error: "Sirf isi laptop par." }, { status: 403 });
  let b; try { b = await req.json(); } catch { return Response.json({ ok: false, error: "Ghalat JSON" }, { status: 400 }); }
  const text = String(b?.text || "").slice(0, 500);
  if (!text.trim()) return Response.json({ ok: false, error: "Text khali" }, { status: 400 });
  // v3.16: assistant banana ho to GitHub trending (is hafta) + top assistants ki research
  if (b?.kind === "assistant" || isAssistantRequest(text)) return Response.json({ ok: true, isBuild: true, isAssistant: true, research: await researchAssistants({ online: b?.online !== false }) });
  return Response.json({ ok: true, isBuild: isBuildRequest(text), research: await researchProject(text, { online: b?.online !== false }) });
}
