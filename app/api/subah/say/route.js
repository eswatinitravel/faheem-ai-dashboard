// v3.40 Jarvis page har ~20s puchta hai: "kuch bolna hai?" (subah ki report). Isi se pata chalta hai page khula hai.
import { pageHeartbeat } from "../../../../lib/speak.js";
export const dynamic = "force-dynamic";
export async function GET(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) return Response.json({ ok: false }, { status: 403 });
  return Response.json({ ok: true, say: pageHeartbeat() });
}
