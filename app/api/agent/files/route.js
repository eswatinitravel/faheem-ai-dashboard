import fs from "fs";
import { projectDir, tree, safe } from "../../../../lib/agent/tools";
import { readMemory } from "../../../../lib/agent/loop";
export const dynamic = "force-dynamic";
// ?project=x → file list; ?project=x&path=index.html → file ka mawad
export async function GET(req) {
  const u = new URL(req.url);
  const dir = projectDir(u.searchParams.get("project"));
  const p = u.searchParams.get("path");
  if (!p) return Response.json({ files: tree(dir, 500), history: readMemory(dir).slice(-10) });
  try {
    const full = safe(dir, p);
    const st = fs.statSync(full);
    if (st.size > 2_000_000) return Response.json({ path: p, content: "(file bohat bari hai)" });
    return Response.json({ path: p, content: fs.readFileSync(full, "utf8") });
  } catch (e) { return Response.json({ error: e.message }, { status: 404 }); }
}
