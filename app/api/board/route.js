// v3.38 Task board API. Sirf isi laptop se (localhost); CSRF guard proxy.js mein.
import { COLUMNS, ASSIGNEES, listCards, addCard, updateCard, moveCard, addComment, deleteCard, review, runCard, setAutopilot, summary } from "../../../lib/board.js";
import { listRecipes } from "../../../lib/mcp/recipes.js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });

export async function GET(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  let recipes = []; try { recipes = listRecipes().filter((r) => !r.errors?.length).map((r) => ({ id: r.id, title: r.title, parameters: r.parameters || [] })); } catch {}
  return Response.json({ ok: true, columns: COLUMNS, assignees: ASSIGNEES, cards: listCards(), recipes, summary: summary() });
}

export async function POST(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  let b; try { b = await req.json(); } catch { return bad("Bad request"); }
  const id = String(b?.id || "");
  try {
    switch (b?.action) {
      case "add": return Response.json({ ok: true, card: addCard(b.card || {}) });
      case "update": return Response.json({ ok: true, card: updateCard(id, b.card || {}) });
      case "move": return Response.json({ ok: true, card: moveCard(id, String(b.column || "")) });
      case "comment": return Response.json({ ok: true, card: addComment(id, String(b.text || "").trim() || "-", "aap") });
      case "delete": { try { await setAutopilot(id, ""); } catch {} deleteCard(id); return Response.json({ ok: true }); }
      case "approve": return Response.json({ ok: true, card: review(id, true, String(b.note || "")) });
      case "reject": return Response.json({ ok: true, card: review(id, false, String(b.note || "")) });
      // Aap ne "Chalao" ya "Haan, tool chalao" dabaya = is dafa ki ijazat.
      case "run": return Response.json({ ok: true, card: await runCard(id, { allowTools: b.allowTools === true }) });
      case "autopilot": return Response.json({ ok: true, card: await setAutopilot(id, String(b.every || "")) });
      default: return bad("action?");
    }
  } catch (e) { return bad(e.message || String(e)); }
}
