import { projectDir, undoLast } from "../../../../lib/agent/tools";
export const dynamic = "force-dynamic";
export async function POST(req) {
  const { project } = await req.json().catch(() => ({}));
  return Response.json(undoLast(projectDir(project)));
}
