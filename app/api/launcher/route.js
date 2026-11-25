import { readTiles, saveTiles, resetTiles, MAX_TILES } from "../../../lib/launcher.js";
export const dynamic = "force-dynamic";
// v3.27 Launcher tiles: GET = list, POST {action:"save", tiles} | {action:"reset"}
export async function GET() { return Response.json({ ok: true, max: MAX_TILES, ...readTiles() }); }
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (b.action === "reset") return Response.json({ ok: true, tiles: resetTiles(), custom: false });
  if (b.action === "save") {
    if (!Array.isArray(b.tiles)) return Response.json({ ok: false, error: "tiles list chahiye" }, { status: 400 });
    return Response.json({ ok: true, tiles: saveTiles(b.tiles), custom: true });
  }
  return Response.json({ ok: false, error: "action: save | reset" }, { status: 400 });
}
