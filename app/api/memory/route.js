import { listMemories, searchMemories, addMemory, updateMemory, deleteMemory, clearMemories, getSettings, setSettings, exportMemories, importMemories, memoryStats, memoryContext, TYPES, TYPE_LABEL } from "../../../lib/memory.js";

export const dynamic = "force-dynamic";

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const deny = () => Response.json({ ok: false, error: "Memory sirf isi laptop par." }, { status: 403 });

// v3.13 Persistent Memory API: ?q= search, ?type= filter, ?export=1 download, ?preview=<sawal> prompt mein kya jaye ga.
export async function GET(req) {
  if (!isLocal(req)) return deny();
  const u = new URL(req.url);
  if (u.searchParams.get("export")) {
    return new Response(JSON.stringify(exportMemories(), null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="faheem-memory-${new Date().toISOString().slice(0, 10)}.json"` } });
  }
  const preview = u.searchParams.get("preview");
  if (preview !== null) return Response.json({ ok: true, context: memoryContext(preview, { project: u.searchParams.get("project") || "" }) });
  const q = (u.searchParams.get("q") || "").trim(), type = u.searchParams.get("type") || "";
  const items = q ? searchMemories(q, { n: 50, type: type || undefined }) : listMemories({ type: type || undefined });
  return Response.json({ ok: true, items, settings: getSettings(), stats: memoryStats(), types: TYPES, labels: TYPE_LABEL });
}

export async function POST(req) {
  if (!isLocal(req)) return deny();
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false, error: "Ghalat JSON" }, { status: 400 }); }
  const a = b?.action;
  let r;
  if (a === "add") r = addMemory(b.item || b);
  else if (a === "update") r = updateMemory(String(b.id || ""), b.item || b);
  else if (a === "delete") r = deleteMemory(String(b.id || ""));
  else if (a === "settings") r = { ok: true, settings: setSettings(b.settings || b) };
  else if (a === "import") r = importMemories(b.data, { mode: b.mode === "replace" ? "replace" : "merge" });
  else if (a === "clear") r = b.confirm === "haan" ? clearMemories() : { ok: false, error: "Tasdeeq chahiye (confirm: haan)" };
  else return Response.json({ ok: false, error: "Ghalat action" }, { status: 400 });
  return Response.json(r, { status: r.ok ? 200 : 400 });
}
