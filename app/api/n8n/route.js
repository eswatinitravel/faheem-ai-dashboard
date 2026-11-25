import { audit } from "../../../lib/ops/audit.js";
import { isPaused } from "../../../lib/ops/control.js";
export const dynamic = "force-dynamic";
// v3.27 n8n webhook trigger: user ka diya hua webhook URL, JSON POST (server se, is liye CORS ka masla nahi).
// n8n (fair-code, Sustainable Use License) ka koi code shamil nahi — sirf HTTP call.
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  let url;
  try { url = new URL(String(b.url || "")); } catch { return Response.json({ ok: false, error: "Sahi webhook URL dein (http:// ya https://)" }, { status: 400 }); }
  if (!/^https?:$/.test(url.protocol)) return Response.json({ ok: false, error: "Sirf http/https webhook" }, { status: 400 });
  if (isPaused()) return Response.json({ ok: false, error: "Pause All chalu hai — pehle Resume karein." }, { status: 423 });
  let payload = b.payload;
  if (typeof payload === "string") { try { payload = payload.trim() ? JSON.parse(payload) : {}; } catch { return Response.json({ ok: false, error: "JSON theek nahi (comma/quotes dekhein)" }, { status: 400 }); } }
  if (payload == null || typeof payload !== "object") payload = { value: payload };
  const body = JSON.stringify({ ...payload, _source: "faheem-ai-dashboard", _sentAt: new Date().toISOString() });
  if (body.length > 100000) return Response.json({ ok: false, error: "Payload 100 KB se bara" }, { status: 400 });
  const t = Date.now();
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "faheem-ai-dashboard" }, body, signal: AbortSignal.timeout(20000), redirect: "follow" });
    const text = (await r.text().catch(() => "")).slice(0, 2000);
    audit("n8n_webhook", `${url.host}${url.pathname} -> ${r.status}`);
    return Response.json({ ok: r.ok, status: r.status, ms: Date.now() - t, response: text });
  } catch (e) {
    audit("n8n_webhook", `${url.host}${url.pathname} -> fail`);
    return Response.json({ ok: false, status: 0, ms: Date.now() - t, error: /timeout|abort/i.test(String(e?.name) + e?.message) ? "20s mein jawab nahi aaya" : "Raabta nahi hua: " + String(e.message).slice(0, 120) }, { status: 502 });
  }
}
