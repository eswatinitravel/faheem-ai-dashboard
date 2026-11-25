import { readPhone, writePhone, phoneInfo } from "../../../lib/phone.js";
import { audit } from "../../../lib/ops/audit.js";
export const dynamic = "force-dynamic";
// v3.27 Phone se jodo: LAN IP + Base URL + key. Yeh route sirf laptop se khulta hai (proxy.js).
function view() {
  const p = readPhone();
  return { ok: true, ...phoneInfo(), enabled: p.enabled, fullLan: p.fullLan, key: p.key, startHost: "0.0.0.0" };
}
export async function GET() {
  if (!readPhone().key) writePhone({}); // pehli dafa key bana do (abhi band)
  return Response.json(view());
}
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (b.action === "enable") { writePhone({ enabled: !!b.value, ...(b.value ? {} : { fullLan: false }) }); audit("phone_connect", b.value ? "Phone connect On" : "Phone connect band"); }
  else if (b.action === "fullLan") { writePhone({ fullLan: !!b.value }); audit("phone_connect", b.value ? "Poora dashboard phone par On" : "Poora dashboard phone par band"); }
  else if (b.action === "rotate") { writePhone({ rotate: true }); audit("phone_connect", "Phone key nayi bani"); }
  else return Response.json({ ok: false, error: "action: enable | fullLan | rotate" }, { status: 400 });
  return Response.json(view());
}
