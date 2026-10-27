import { designSystem, search, DOMAINS, uxCheck } from "../../../lib/uupm/index.js";
import { detectHtml, RULES, available } from "../../../lib/impeccable/index.js";

export const dynamic = "force-dynamic";

// UI UX Pro Max: /api/design?q=luxury fashion store            -> poora design system
//                /api/design?q=button loading&domain=ux&n=5     -> qawaid search
export async function GET(req) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").slice(0, 200).trim();
  const domain = u.searchParams.get("domain") || "";
  if (u.searchParams.get("rules") === "impeccable") return Response.json({ ok: true, available: available(), count: RULES.length, rules: RULES });
  if (!q) return Response.json({ ok: false, error: "q (sawal) khali hai", domains: Object.keys(DOMAINS) }, { status: 400 });
  try {
    if (!domain || domain === "system") {
      const ds = designSystem(q);
      return ds ? Response.json({ ok: true, system: ds }) : Response.json({ ok: false, error: "Is ke liye design system nahi mila — aur lafz likhein (jaise 'fashion ecommerce')." }, { status: 404 });
    }
    if (!DOMAINS[domain]) return Response.json({ ok: false, error: "Ghalat domain", domains: Object.keys(DOMAINS) }, { status: 400 });
    const n = Math.min(Math.max(Number(u.searchParams.get("n")) || 5, 1), 20);
    return Response.json({ ok: true, domain, results: search(q, domain, n) });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// HTML/CSS bhejein: UX Pro checks + Impeccable (62 checks) wapas.
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const html = String(b.html || "").slice(0, 2_000_000), css = String(b.css || "").slice(0, 1_000_000);
  const ux = uxCheck(html, css);
  const impeccable = b.impeccable === false ? null : await detectHtml(html, css).catch((e) => ({ ok: false, reason: e.message, findings: [] }));
  return Response.json({ ...ux, impeccable });
}
