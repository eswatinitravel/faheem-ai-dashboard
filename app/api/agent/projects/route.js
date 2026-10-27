import { listProjects, projectDir, cleanName } from "../../../../lib/agent/tools";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json({ projects: listProjects() }); }
export async function POST(req) {
  const { name } = await req.json().catch(() => ({}));
  const n = cleanName(name);
  projectDir(n);
  return Response.json({ ok: true, name: n });
}
