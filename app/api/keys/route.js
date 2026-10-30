// v3.11 Auto Setup: key paste karein -> brain khud pehchaana jaye -> live test -> save -> free models.
import { CATALOG, detectKey, keyField, modelField } from "../../../lib/catalog";
import { getConfig, writeSaved } from "../../../lib/config";
import { getProviders, listModels, callProvider, isCooling } from "../../../lib/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const mask = (v) => (v ? `${v.slice(0, 4)}••••${v.slice(-4)}` : "");

function probeFor(c, key, cfg) {
  const base = c.needs ? c.base.replace("{account}", encodeURIComponent(cfg[c.needs] || "")) : c.base;
  return { id: c.id, base, key, model: c.model, pick: c.pick };
}

// Key ko brain ki /models par aazmayein. 200 = sahi key + sahi brain.
// Kuch brains (OpenRouter, NVIDIA, SambaNova, HF, Nous) ki /models list sab ke liye khuli hai,
// is liye wahan key ko 5-token chat se parakhte hain (401/403 = ghalat key; 200/429 = key sahi).
async function tryKey(c, key, cfg) {
  try {
    const p = probeFor(c, key, cfg);
    if (c.publicModels && key) {
      const model = c.model === "auto" ? (await listModels(p, 10000))[0] : c.model;
      const r = await fetch(`${p.base}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: "user", content: "hi" }] }), signal: AbortSignal.timeout(20000) });
      if (r.status === 401 || r.status === 403) throw new Error(`HTTP ${r.status}: key qubool nahi`);
    }
    const models = await listModels(p, 10000);
    return { ok: true, id: c.id, models };
  } catch (e) { return { ok: false, id: c.id, error: e.message }; }
}

export async function GET(req) {
  if (!isLocal(req)) return Response.json({ error: "Sirf isi laptop par." }, { status: 403 });
  const cfg = getConfig();
  const active = new Set(getProviders().map((p) => p.id));
  return Response.json({
    brains: CATALOG.map((c) => ({
      id: c.id, name: c.name, note: c.note, keyUrl: c.keyUrl, signup: c.signup || "", needs: c.needs || "",
      keyless: !!c.keyless, set: !!cfg[keyField(c.id)], preview: mask(cfg[keyField(c.id)] || ""),
      model: cfg[modelField(c.id)] || c.model, active: active.has(c.id), cooling: !!isCooling(c.id),
    })),
  });
}

export async function POST(req) {
  if (!isLocal(req)) return Response.json({ error: "Sirf isi laptop par." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const cfg = getConfig();
  if (body.needs) for (const [k, v] of Object.entries(body.needs)) if (CATALOG.some((c) => c.needs === k)) cfg[k] = String(v || "").trim();

  // 1) Auto: key paste -> pehchaan -> test -> save
  if (body.action === "auto") {
    const d = detectKey(body.key);
    if (d.error) return Response.json({ ok: false, error: d.error });
    const chosen = body.id ? CATALOG.filter((c) => c.id === body.id) : d.sure ? CATALOG.filter((c) => c.id === d.id) : CATALOG.filter((c) => d.candidates.includes(c.id) && (!c.needs || cfg[c.needs]));
    const results = await Promise.all(chosen.map((c) => tryKey(c, d.key, cfg)));
    const win = results.find((r) => r.ok);
    if (!win) return Response.json({ ok: false, error: d.sure ? `${chosen[0].name} ne key qubool nahi ki: ${results[0]?.error || ""}` : "Ye key kisi brain ne qubool nahi ki. Neeche se brain chun kar dobara try karein.", tried: results.map((r) => r.id) });
    const c = CATALOG.find((x) => x.id === win.id);
    const save = { [keyField(c.id)]: d.key };
    if (c.needs && body.needs?.[c.needs]) save[c.needs] = String(body.needs[c.needs]).trim();
    // Default model brain ki list mein na ho to pehla free chat model chun lein.
    const free = win.models.filter((m) => !/embed|whisper|tts|guard|rerank|diffusion|image|safety/i.test(m));
    let model = cfg[modelField(c.id)] || c.model;
    if (model !== "auto" && free.length && !free.includes(model)) {
      const better = (c.pick && free.find((m) => c.pick.test(m))) || free.find((m) => /:free$/.test(m)) || free[0];
      if (better) { model = better; save[modelField(c.id)] = better; }
    }
    writeSaved(save);
    return Response.json({ ok: true, id: c.id, name: c.name, model, models: free.slice(0, 40), preview: mask(d.key) });
  }

  // 2) Test: lagi hui key se asli "hi" (pipeline wala hi raasta).
  if (body.action === "test") {
    const p = getProviders().find((x) => x.id === body.id);
    if (!p) return Response.json({ ok: false, error: "Is brain ki key nahi lagi (ya band hai)." });
    const t0 = Date.now();
    try {
      const text = await callProvider(p, [{ role: "user", content: "Reply with exactly: OK" }], 45000);
      return Response.json({ ok: true, ms: Date.now() - t0, text: String(text).slice(0, 80) });
    } catch (e) { return Response.json({ ok: false, ms: Date.now() - t0, error: e.message }); }
  }

  // 3) Models: brain ki free models ki list (Settings ke dropdown ke liye).
  if (body.action === "models") {
    const c = CATALOG.find((x) => x.id === body.id);
    if (!c) return Response.json({ ok: false, error: "brain nahi mila" });
    const r = await tryKey(c, cfg[keyField(c.id)] || "", cfg);
    return Response.json(r.ok ? { ok: true, models: r.models.filter((m) => !/embed|whisper|tts|guard|rerank|diffusion|image|safety/i.test(m)).slice(0, 80) } : r);
  }

  // 4) Remove: key hata dein.
  if (body.action === "remove") {
    const c = CATALOG.find((x) => x.id === body.id);
    if (!c) return Response.json({ ok: false });
    writeSaved({ [keyField(c.id)]: "" });
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false, error: "action?" }, { status: 400 });
}
