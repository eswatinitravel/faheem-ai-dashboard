import { researchProject, isBuildRequest } from "../../../lib/research.js";
export const dynamic = "force-dynamic";
const isLocal = (req) => ["localhost", "127.0.0.1", "[::1]"].includes((req.headers.get("host") || "").split(":")[0]);
// v3.15: POST { text } -> { ok, isBuild, research }
export async function POST(req) {
  if (!isLocal(req)) return Response.json({ ok: false, error: "Sirf isi laptop par." }, { status: 403 });
  let b; try { b = await req.json(); } catch { return Response.json({ ok: false, error: "Ghalat JSON" }, { status: 400 }); }
  const text = String(b?.text || "").slice(0, 500);
  if (!text.trim()) return Response.json({ ok: false, error: "Text khali" }, { status: 400 });
  return Response.json({ ok: true, isBuild: isBuildRequest(text), research: await researchProject(text, { online: b?.online !== false }) });
}
