// v3.14 Meta page API (sirf isi laptop par):
//   GET                      -> paid key lagi hai? (masked), qeemat
//   POST {action:"open"}     -> Windows par meta.ai alag Edge app window mein (iframe nahi — Meta block karta hai)
//   POST {action:"edit"}     -> PAID Meta Model API (muse-image-1.0), sirf key + paidOn + confirm=true ho to
import { spawn } from "child_process";
import { getConfig } from "../../../lib/config";
import { maskKey } from "../../../lib/brain-status";
import { META_SITE, META_API, paidAllowed } from "../../../lib/meta";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const deny = () => Response.json({ ok: false, error: "Sirf isi laptop par." }, { status: 403 });

export async function GET(req) {
  if (!isLocal(req)) return deny();
  const k = getConfig().META_API_KEY || "";
  return Response.json({ ok: true, keySet: !!k, preview: maskKey(k), price: META_API.pricePerImage, model: META_API.model, site: META_SITE });
}

export async function POST(req) {
  if (!isLocal(req)) return deny();
  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Ghalat JSON" }, { status: 400 }); }
  if (body.action === "open") {
    if (process.platform !== "win32") return Response.json({ ok: false, fallback: true, url: META_SITE, error: "Windows nahi — browser ki nayi window mein khol rahe hain." });
    try {
      // Edge "app" window: alag khirki, apna login (Meta cookies dashboard se alag rehti hain).
      spawn("cmd.exe", ["/c", "start", "", "msedge", `--app=${META_SITE}`, "--window-size=1200,860"], { detached: true, stdio: "ignore", windowsHide: true }).unref();
      return Response.json({ ok: true, opened: "edge-app" });
    } catch (e) { return Response.json({ ok: false, fallback: true, url: META_SITE, error: e.message }); }
  }
  if (body.action === "edit") {
    const key = getConfig().META_API_KEY || "";
    if (!paidAllowed({ keySet: !!key, paidOn: body.paidOn, confirm: body.confirmPaid })) {
      return Response.json({ ok: false, error: key ? "Paid API band hai: switch on karein aur '$0.01 lagega' tick karein." : "Meta Model API key nahi lagi (yeh paid hai). Free raasta: 'Meta AI mein kholo'." }, { status: 400 });
    }
    const img = String(body.image || "");
    const m = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(img);
    if (!m) return Response.json({ ok: false, error: "Tasveer (PNG/JPG/WEBP) chahiye" }, { status: 400 });
    const prompt = String(body.prompt || "").trim().slice(0, 4000);
    if (!prompt) return Response.json({ ok: false, error: "Prompt likhein" }, { status: 400 });
    const fd = new FormData();
    fd.append("model", META_API.model);
    fd.append("prompt", prompt);
    fd.append("image", new Blob([Buffer.from(m[3], "base64")], { type: m[1] }), "input." + (m[2] === "jpeg" ? "jpg" : m[2]));
    try {
      const r = await fetch(META_API.base + META_API.path, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd, signal: AbortSignal.timeout(110000) });
      const t = await r.text();
      if (!r.ok) return Response.json({ ok: false, error: `Meta API HTTP ${r.status}: ${t.slice(0, 200)}` });
      const j = JSON.parse(t);
      const d = (j.data || [])[0] || {};
      const out = d.b64_json ? `data:image/png;base64,${d.b64_json}` : d.url || "";
      if (!out) return Response.json({ ok: false, error: "Meta API ne tasveer nahi lautayi" });
      return Response.json({ ok: true, image: out, cost: META_API.pricePerImage });
    } catch (e) { return Response.json({ ok: false, error: "Meta API: " + String(e.message).slice(0, 160) }); }
  }
  return Response.json({ ok: false, error: "action?" }, { status: 400 });
}
