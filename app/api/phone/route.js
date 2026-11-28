import { readPhone, writePhone, phoneInfo, phoneSeen } from "../../../lib/phone.js";
import { apkInfo, ensureApk } from "../../../lib/apk.js";
import { audit } from "../../../lib/ops/audit.js";
export const dynamic = "force-dynamic";
// v3.27 Phone se jodo: LAN IP + Base URL + key. Yeh route sirf laptop se khulta hai (proxy.js).
function view() {
  const p = readPhone();
  return { ok: true, ...phoneInfo(), enabled: p.enabled, fullLan: p.fullLan, key: p.key, startHost: "0.0.0.0", apk: apkInfo(), seen: phoneSeen() };
}
export async function GET() {
  if (!readPhone().key) writePhone({}); // pehli dafa key bana do (abhi band)
  if (readPhone().enabled && !apkInfo().ready) ensureApk().catch(() => {}); // v3.41: phone scan kare to app tayar mile
  return Response.json(view());
}
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (b.action === "enable") { writePhone({ enabled: !!b.value, ...(b.value ? {} : { fullLan: false }) }); audit("phone_connect", b.value ? "Phone connect On" : "Phone connect band"); }
  else if (b.action === "fullLan") { writePhone({ fullLan: !!b.value }); audit("phone_connect", b.value ? "Poora dashboard phone par On" : "Poora dashboard phone par band"); }
  else if (b.action === "rotate") { writePhone({ rotate: true }); audit("phone_connect", "Phone key nayi bani"); }
  else if (b.action === "apk") { const r = await ensureApk({ force: true }); if (!r.ok) return Response.json({ ...view(), ok: false, error: r.error }); if (r.warn) return Response.json({ ...view(), warn: r.warn }); }
  else return Response.json({ ok: false, error: "action: enable | fullLan | rotate | apk" }, { status: 400 });
  return Response.json(view());
}
