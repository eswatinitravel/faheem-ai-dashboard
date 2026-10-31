import { projectDir } from "../../../../lib/agent/tools";
import { readBoard, ROLES, DEFAULTS } from "../../../../lib/agent/team.js";
export const dynamic = "force-dynamic";
// v3.13: Team ka shared task board (~/.faheem-ai/projects/<id>/team.json) parhein.
export async function GET(req) {
  const u = new URL(req.url);
  const dir = projectDir(u.searchParams.get("project"));
  return Response.json({ ok: true, board: readBoard(dir), roles: ROLES, defaults: DEFAULTS });
}
