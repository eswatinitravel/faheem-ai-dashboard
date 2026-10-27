import { getProviders, callProvider, isCooling } from "../../../lib/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// v3.8 Tools page: har brain ko alag se, bina fallback, seedha chalayein (1 by 1 test + chat).
export async function GET() {
  const list = getProviders().map((p) => ({ id: p.id, name: p.name, model: p.model, keyless: !!p.keyless, cooling: !!isCooling(p.id) }));
  return Response.json({ providers: list }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const p = getProviders().find((x) => x.id === body.provider);
  if (!p) return Response.json({ ok: false, error: "Yeh brain mojood nahi (key nahi lagi?)" }, { status: 404 });
  const history = Array.isArray(body.messages) ? body.messages.filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant")).slice(-12) : [];
  if (!history.length) return Response.json({ ok: false, error: "Message khali hai" }, { status: 400 });
  const messages = [{ role: "system", content: "You are a helpful assistant inside Faheem's AI dashboard. Reply briefly in the user's language (Roman Urdu or English)." }, ...history];
  const t0 = Date.now();
  try {
    const text = await callProvider(p, messages, Math.min(Number(body.timeoutMs) || 60000, 110000));
    return Response.json({ ok: true, provider: p.id, model: p.model, ms: Date.now() - t0, text });
  } catch (e) {
    return Response.json({ ok: false, provider: p.id, model: p.model, ms: Date.now() - t0, error: e.message || String(e) });
  }
}
