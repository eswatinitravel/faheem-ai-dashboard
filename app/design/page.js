"use client";
import { useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";

// v3.9 Design Studio: UI UX Pro Max ka design system generator + qawaid search (bina AI, bina internet).
const EXAMPLES = ["luxury fashion ecommerce", "restaurant food delivery", "fintech banking app", "travel agency booking", "beauty spa salon", "SaaS dashboard"];
const DOMS = [["ux", "UX qawaid"], ["style", "Styles"], ["typography", "Fonts"], ["color", "Rang"], ["landing", "Page patterns"], ["chart", "Charts"], ["nextjs", "Next.js"], ["html", "HTML/Tailwind"]];

function Swatch({ name, hex, on }) {
  if (!hex) return null;
  return (
    <button className="swatch" style={{ background: hex, color: on || undefined }} title={`${name} ${hex} (copy)`} onClick={() => navigator.clipboard?.writeText(hex)}>
      <b>{name}</b><span>{hex}</span>
    </button>
  );
}

export default function Design() {
  const [q, setQ] = useState("");
  const [ds, setDs] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sq, setSq] = useState("");
  const [dom, setDom] = useState("ux");
  const [res, setRes] = useState(null);
  const [copied, setCopied] = useState(false);

  async function gen(text) {
    const v = (text ?? q).trim(); if (!v) return;
    setQ(v); setBusy(true); setErr(""); setDs(null);
    const d = await fetch(`/api/design?q=${encodeURIComponent(v)}`).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));
    setBusy(false);
    if (d.ok) setDs(d.system); else setErr(d.error || "Nahi mila");
  }
  async function find(e) {
    e?.preventDefault(); if (!sq.trim()) return;
    const d = await fetch(`/api/design?q=${encodeURIComponent(sq)}&domain=${dom}&n=5`).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));
    setRes(d.ok ? d.results : []);
  }
  const css = ds ? `:root {\n${Object.entries(ds.colors).filter(([k, v]) => v && k !== "notes").map(([k, v]) => `  --${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`).join("\n")}\n  --font-heading: "${ds.typography.heading}";\n  --font-body: "${ds.typography.body}";\n}` : "";
  const c = ds?.colors || {};

  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><Icon name="palette" /> Design Studio · UI UX Pro Max</div>
        <div className="top-actions"><Link href="/tools" className="icon-btn" title="Tools" aria-label="Tools"><Icon name="flask" /></Link><ThemeBalls /></div>
      </header>
      <div className="toolspage">
        <section className="card panel">
          <h3>Design system banayein</h3>
          <p className="muted">Apna kaam likhein (English behtar): poora rang, font, style aur page ka dhaancha mil jayega. Agent Mode aur Website Master yahi khud istemal karte hain.</p>
          <form className="toolsbar" onSubmit={(e) => { e.preventDefault(); gen(); }}>
            <label htmlFor="dsq" className="sr">Business</label>
            <input id="dsq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="jaise: luxury fashion ecommerce" />
            <button type="submit" disabled={busy}>{busy ? "Bana raha…" : "Banao"}</button>
          </form>
          <div className="chips">{EXAMPLES.map((x) => <button key={x} className="chip" onClick={() => gen(x)}>{x}</button>)}</div>
          {err && <p className="warnline">{err}</p>}
        </section>

        {ds && (
          <section className="card panel dsresult" data-product={ds.product}>
            <h3>{ds.product}</h3>
            <p><b>Style:</b> {ds.style.name}{ds.style.keywords ? ` · ${ds.style.keywords.split(",").slice(0, 5).join(",")}` : ""}</p>
            <div className="swatches">
              <Swatch name="Primary" hex={c.primary} on={c.onPrimary} /><Swatch name="Secondary" hex={c.secondary} /><Swatch name="Accent/CTA" hex={c.accent} on={c.onAccent} />
              <Swatch name="Background" hex={c.background} on={c.foreground} /><Swatch name="Text" hex={c.foreground} on={c.background} /><Swatch name="Card" hex={c.card} on={c.foreground} />
              <Swatch name="Muted" hex={c.muted} on={c.mutedForeground} /><Swatch name="Border" hex={c.border} on={c.foreground} />
            </div>
            {c.notes && <p className="muted">{c.notes}</p>}
            <div className="preview" style={{ background: c.background, color: c.foreground, borderColor: c.border }}>
              {ds.typography.url && <link rel="stylesheet" href={ds.typography.url} />}
              <h2 style={{ fontFamily: `"${ds.typography.heading}", serif` }}>Aap ka brand, yahan</h2>
              <p style={{ fontFamily: `"${ds.typography.body}", sans-serif` }}>Heading: {ds.typography.heading} · Body: {ds.typography.body}</p>
              <span className="pbtn" style={{ background: c.accent, color: c.onAccent }}>Abhi khareedein</span>
            </div>
            <p><b>Page dhaancha:</b> {ds.landing.name}{ds.landing.sections ? ` — ${ds.landing.sections}` : ""}</p>
            {ds.landing.cta && <p><b>CTA:</b> {ds.landing.cta}</p>}
            {ds.effects && <p><b>Effects:</b> {ds.effects}</p>}
            {ds.avoid.length > 0 && <p><b>Na karein:</b> {ds.avoid.join(", ")}</p>}
            {ds.considerations && <p><b>Khas baat:</b> {ds.considerations}</p>}
            <pre className="csscode">{css}</pre>
            <button onClick={() => { navigator.clipboard?.writeText(css); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copy ho gaya" : "CSS copy karein"}</button>
          </section>
        )}

        <section className="card panel">
          <h3>Design qawaid dhoondein</h3>
          <form className="toolsbar" onSubmit={find}>
            <label htmlFor="dom" className="sr">Qism</label>
            <select id="dom" value={dom} onChange={(e) => setDom(e.target.value)}>{DOMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <label htmlFor="sq" className="sr">Sawal</label>
            <input id="sq" value={sq} onChange={(e) => setSq(e.target.value)} placeholder="jaise: button loading, dark mode, form error" />
            <button type="submit">Dhoondo</button>
          </form>
          {res && !res.length && <p className="muted">Kuch nahi mila, doosre lafz try karein.</p>}
          <div className="dsrules">
            {res?.map((r, i) => (
              <div key={i} className="tmsg">
                {Object.entries(r).filter(([k, v]) => v && !["No", "_score"].includes(k) && String(v).length < 300).slice(0, 7).map(([k, v]) => <div key={k}><b>{k}:</b> {v}</div>)}
              </div>
            ))}
          </div>
        </section>
        <p className="muted small">Data: UI UX Pro Max (MIT) · nextlevelbuilder/ui-ux-pro-max-skill</p>
      </div>
    </main>
  );
}
