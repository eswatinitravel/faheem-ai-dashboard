import { collectStatus } from "../../../lib/status.js";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
// v3.27 Services + brains ki live sehat (45s cache, ?force=1 se taaza).
export async function GET(req) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  try { return Response.json(await collectStatus({ force })); }
  catch (e) { return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 }); }
}
