import { FIELDS, getConfig, writeSaved, KEYS_FILE } from "../../../lib/config";

export const dynamic = "force-dynamic";

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}

const mask = (v) => (v ? `${v.slice(0, 4)}••••${v.slice(-4)}` : "");

export async function GET(req) {
  if (!isLocal(req)) return Response.json({ error: "Settings sirf isi laptop par." }, { status: 403 });
  const c = getConfig();
  const out = {};
  for (const k of FIELDS) out[k] = k.endsWith("_KEY") ? { set: !!c[k], preview: mask(c[k] || "") } : c[k] || "";
  out._file = KEYS_FILE;
  return Response.json(out);
}

export async function POST(req) {
  if (!isLocal(req)) return Response.json({ error: "Settings sirf isi laptop par." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  writeSaved(body || {});
  return Response.json({ ok: true });
}
