// v3.14 Brains Rooms API: har brain ka card (masked keys + status light), check, key pool add/remove.
import { CATALOG, PUTER, keyField, modelField } from "../../../lib/catalog";
import { getConfig, writeSaved } from "../../../lib/config";
import { parsePool, joinPool, maskKey, poolSummary } from "../../../lib/brain-status";
import { checkBrain, checkAll, allStatus, checkStaleInBackground, CHECK_EVERY_MS } from "../../../lib/brain-check";
import { ensureLive, liveState, refreshLive, dedupeLive } from "../../../lib/free-live";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const deny = () => Response.json({ ok: false, error: "Sirf isi laptop par." }, { status: 403 });

function roomList() {
  const cfg = getConfig();
  const st = allStatus();
  const rooms = CATALOG.map((c) => {
    const keys = c.noKey ? [] : parsePool(cfg[keyField(c.id)] || "");
    return {
      id: c.id, name: c.name, model: cfg[modelField(c.id)] || c.model, keyUrl: c.keyUrl, note: c.note, needs: c.needs || "",
      keyless: !!c.keyless, noKey: !!c.noKey, optionalKey: !!c.optionalKey, vision: !!(c.vision || c.visionModel || c.roomVisionModel),
      keys: keys.map(maskKey), pool: poolSummary(c.id, keys), status: st[c.id] || (keys.length || c.keyless ? null : { light: "grey", label: "Key nahi lagi" }),
      slow: !!c.lastResort,
    };
  });
  rooms.push({ id: "ollama", name: "Ollama (local)", model: cfg.OLLAMA_MODEL || "llama3.2:3b", keyUrl: "https://ollama.com/download", note: "Laptop par, bina internet, bina limit (8GB par chhota model).", keyless: true, noKey: true, vision: false, keys: [], pool: [], status: st.ollama || null });
  rooms.push({ ...PUTER, keyless: true, noKey: true, keys: [], pool: [], status: null });
  return rooms;
}

export async function GET(req) {
  if (!isLocal(req)) return deny();
  try { ensureLive(); } catch {}
  const stale = checkStaleInBackground();
  const live = liveState();
  return Response.json({ ok: true, rooms: roomList(), checkEveryMin: CHECK_EVERY_MS / 60000, staleChecking: stale,
    live: { at: live.at, error: live.error, source: live.source, enabled: (getConfig().LIVE_FREE_ENABLED || "true") !== "false", brains: dedupeLive(live.brains, CATALOG).map((b) => ({ id: b.id, name: b.name, model: b.model, base: b.base })) } },
    { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  if (!isLocal(req)) return deny();
  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Ghalat JSON" }, { status: 400 }); }
  const c = CATALOG.find((x) => x.id === body.id);
  if (body.action === "check") {
    if (!c && body.id !== "ollama") return Response.json({ ok: false, error: "brain nahi mila" }, { status: 404 });
    return Response.json({ ok: true, id: body.id, status: await checkBrain(body.id) });
  }
  if (body.action === "checkAll") return Response.json({ ok: true, status: await checkAll() });
  if (body.action === "liveRefresh") { const r = await refreshLive({}); return Response.json({ ...r, live: liveState().brains.map((b) => ({ id: b.id, name: b.name })) }); }
  if (!c) return Response.json({ ok: false, error: "brain nahi mila" }, { status: 404 });
  if (c.noKey) return Response.json({ ok: false, error: "Is brain ko key nahi chahiye" }, { status: 400 });
  const field = keyField(c.id);
  const cur = parsePool(getConfig()[field] || "");
  // save: nayi key(s) — mode "add" purani ke sath jorta hai (+ button), "replace" sab badal deta hai
  if (body.action === "save") {
    const fresh = parsePool(Array.isArray(body.keys) ? body.keys.join(",") : body.keys);
    if (!fresh.length) return Response.json({ ok: false, error: "Key khali hai" }, { status: 400 });
    if (fresh.some((k) => k.length < 12 || /@/.test(k))) return Response.json({ ok: false, error: "Ye key nahi lagti (bohat chhoti ya email)" }, { status: 400 });
    const next = body.mode === "add" ? joinPool([...cur, ...fresh]) : joinPool(fresh);
    writeSaved({ [field]: next });
    const status = await checkBrain(c.id);
    return Response.json({ ok: true, id: c.id, keys: parsePool(next).map(maskKey), status });
  }
  if (body.action === "removeKey") {
    const i = Number(body.index);
    if (!(i >= 0 && i < cur.length)) return Response.json({ ok: false, error: "key nahi mili" }, { status: 400 });
    const next = cur.filter((_, j) => j !== i);
    writeSaved({ [field]: next.join(",") });
    const status = await checkBrain(c.id);
    return Response.json({ ok: true, keys: next.map(maskKey), status });
  }
  return Response.json({ ok: false, error: "action?" }, { status: 400 });
}
