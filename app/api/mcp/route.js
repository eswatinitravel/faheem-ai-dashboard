// v3.37 MCP servers + Recipes: list, add, test, tool chalao, recipe chalao. Sirf isi laptop se (localhost).
import { readServers, saveServer, removeServer, listTools, callTool, close, MCP_FILE } from "../../../lib/mcp/client.js";
import { listRecipes, saveRecipe, deleteRecipe, runRecipe, USER_DIR } from "../../../lib/mcp/recipes.js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });
const mask = (v) => (String(v).length > 8 ? String(v).slice(0, 3) + "…" + String(v).slice(-2) : "•••");
// Browser ko keys kabhi poori nahi dikhate.
const safe = (s) => ({ ...s, env: Object.fromEntries(Object.entries(s.env || {}).map(([k, v]) => [k, mask(v)])), headers: s.headers ? Object.fromEntries(Object.entries(s.headers).map(([k, v]) => [k, /\$\{/.test(v) ? v : mask(v)])) : undefined });

export async function GET(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  return Response.json({ ok: true, file: MCP_FILE, recipesDir: USER_DIR, servers: readServers().map(safe), recipes: listRecipes() });
}

export async function POST(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  let b; try { b = await req.json(); } catch { return bad("Bad request"); }
  try {
    switch (b?.action) {
      case "save_server": return Response.json({ ok: true, server: safe(saveServer(String(b.name || ""), b.spec || {})) });
      case "remove_server": removeServer(String(b.name || "")); return Response.json({ ok: true });
      case "test": { close(String(b.name || "")); const tools = await listTools(String(b.name || "")); return Response.json({ ok: true, tools }); }
      case "tools": return Response.json({ ok: true, tools: await listTools(String(b.name || "")) });
      // Aap ne khud button dabaya = ijazat.
      case "call": { const r = await callTool(String(b.name || ""), String(b.tool || ""), b.args || {}); return Response.json({ ok: r.ok, text: r.text }); }
      case "save_recipe": return Response.json({ ok: true, recipe: saveRecipe(String(b.id || ""), b.recipe || {}) });
      case "delete_recipe": deleteRecipe(String(b.id || "")); return Response.json({ ok: true });
      case "run_recipe": { const steps = []; const r = await runRecipe(String(b.id || ""), b.values || {}, { allowTools: b.allowTools === true, onStep: (s) => steps.push(s) }); return Response.json({ ...r, log: steps }); }
      default: return bad("action?");
    }
  } catch (e) { return bad(e.message || String(e)); }
}
