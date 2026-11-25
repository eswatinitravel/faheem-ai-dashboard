"use client";
// v3.27 n8n webhook trigger (n8n-io/n8n, fair-code / Sustainable Use License — code shamil nahi, sirf HTTP POST).
import { useEffect, useState } from "react";
import Icon from "./Icon";

const KEY = "faheem-n8n-webhook";
const SAMPLE = '{\n  "kaam": "naya order",\n  "customer": "Ali",\n  "total": 2500\n}';

export default function N8nWebhook() {
  const [url, setUrl] = useState("");
  const [body, setBody] = useState(SAMPLE);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); if (s.url) setUrl(s.url); if (s.body) setBody(s.body); } catch {} }, []);
  let jsonErr = "";
  try { if (body.trim()) JSON.parse(body); } catch (e) { jsonErr = "JSON theek nahi: " + e.message.slice(0, 80); }
  async function fire(e) {
    e.preventDefault(); if (!url.trim() || jsonErr) return;
    try { localStorage.setItem(KEY, JSON.stringify({ url: url.trim(), body })); } catch {}
    setBusy(true); setRes(null);
    const d = await fetch("/api/n8n", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim(), payload: body }) }).then((r) => r.json()).catch((er) => ({ ok: false, error: er.message }));
    setBusy(false); setRes(d);
  }
  return (
    <section className="card panel" data-n8n>
      <h3><Icon name="loop" size={16} /> n8n webhook trigger</h3>
      <p className="muted">n8n mein <b>Webhook</b> node lagayein (HTTP Method: POST), us ka <b>Production URL</b> (ya test ke liye Test URL) yahan paste karein. Bhejo dabane par JSON n8n ko jata hai aur workflow chal jata hai. n8n laptop par: <code>npx n8n</code> → <a href="http://localhost:5678" target="_blank" rel="noreferrer">localhost:5678</a> · <a href="https://github.com/n8n-io/n8n" target="_blank" rel="noreferrer">github.com/n8n-io/n8n</a></p>
      <form onSubmit={fire} className="n8n-form">
        <label htmlFor="n8nurl" className="sr">Webhook URL</label>
        <input id="n8nurl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:5678/webhook/…" inputMode="url" data-n8n-url />
        <label htmlFor="n8nbody" className="sr">JSON</label>
        <textarea id="n8nbody" rows={6} value={body} onChange={(e) => setBody(e.target.value)} className="auditbox" spellCheck={false} />
        <div className="btnrow">
          <button disabled={busy || !url.trim() || !!jsonErr}><Icon name="send" size={13} /> {busy ? "Bhej raha…" : "Webhook bhejo"}</button>
          {jsonErr && <span className="warnline">{jsonErr}</span>}
          {res && <span className={"tstat " + (res.ok ? "ok" : "bad")}>{res.ok ? `Pahunch gaya (HTTP ${res.status}, ${res.ms} ms)` : res.error || `HTTP ${res.status}`}</span>}
        </div>
      </form>
      {res?.response && <pre className="csscode">{res.response}</pre>}
      <p className="muted small-note">Server se jata hai (CORS ka masla nahi). Har bhejna Audit log mein; Pause All par nahi jata. URL sirf is browser mein yaad rehta hai.</p>
      <style>{`.n8n-form{display:grid;gap:8px}.n8n-form input{width:100%}`}</style>
    </section>
  );
}
