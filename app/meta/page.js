"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";
import { META_SITE, META_TEMPLATES, META_STEPS, META_API } from "../../lib/meta";
import { thinking } from "../../lib/thinking";
import { puterEditImage, puterSignIn } from "../../lib/puter-client";

// v3.14 Meta page: Meta AI (Muse Image) se tasveer edit. FREE raasta: meta.ai alag window. PAID API: default BAND.
const PREF = "faheem-meta-paid";

function readFileAsDataUrl(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("file parhi nahi gayi")); r.readAsDataURL(file); });
}
async function urlToDataUrl(url) {
  const b = await (await fetch(url)).blob();
  return readFileAsDataUrl(b);
}

export default function MetaPage() {
  const [img, setImg] = useState("");
  const [imgName, setImgName] = useState("");
  const [prompt, setPrompt] = useState(META_TEMPLATES[0].en);
  const [gallery, setGallery] = useState([]);
  const [info, setInfo] = useState(null);
  const [paidOn, setPaidOn] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [keyIn, setKeyIn] = useState("");
  const [out, setOut] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const loadInfo = () => fetch("/api/meta", { cache: "no-store" }).then((r) => r.json()).then(setInfo).catch(() => setInfo({ keySet: false }));
  useEffect(() => {
    loadInfo();
    fetch("/api/gallery", { cache: "no-store" }).then((r) => r.json()).then((d) => setGallery((d.files || []).filter((f) => f.kind === "image").slice(0, 24))).catch(() => {});
    try { setPaidOn(localStorage.getItem(PREF) === "on"); } catch {}
  }, []);

  async function pick(files) {
    const f = files?.[0];
    if (!f || !f.type.startsWith("image/")) { setMsg("✕ Sirf tasveer (PNG/JPG/WEBP)"); return; }
    setImg(await readFileAsDataUrl(f)); setImgName(f.name); setOut(""); setMsg("");
  }
  async function fromGallery(f) { try { setImg(await urlToDataUrl(f.url)); setImgName(f.original || f.name); setOut(""); } catch (e) { setMsg("✕ " + e.message); } }

  const copy = async (t) => { try { await navigator.clipboard.writeText(t); setMsg("Prompt copy ho gaya ✓ — Meta AI mein Ctrl+V"); } catch { setMsg("Copy nahi hua — khud select karke copy karein"); } };
  async function copyImage() {
    if (!img) return setMsg("Pehle tasveer chunein");
    try {
      const png = await new Promise((res) => { const i = new Image(); i.onload = () => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; c.getContext("2d").drawImage(i, 0, 0); c.toBlob(res, "image/png"); }; i.src = img; });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      setMsg("Tasveer copy ✓ — Meta AI chat mein Ctrl+V");
    } catch { setMsg("Tasveer copy nahi hui — Meta AI mein + se upload karein"); }
  }
  async function openMeta() {
    const r = await fetch("/api/meta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "open" }) }).then((x) => x.json()).catch(() => ({ fallback: true }));
    if (r.ok) setMsg("Meta AI alag Edge window mein khul gaya ↗ (pehli dafa Facebook/Meta login)");
    else { window.open(META_SITE, "metaai", "popup,width=1200,height=860"); setMsg("Meta AI nayi window mein khola ↗"); }
  }
  function setPaid(v) { setPaidOn(v); setConfirm(false); try { localStorage.setItem(PREF, v ? "on" : "off"); } catch {} }
  async function saveKey() {
    if (!keyIn.trim()) return;
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ META_API_KEY: keyIn.trim() }) });
    setKeyIn(""); loadInfo(); setMsg("Meta API key save ✓ (paid — switch abhi bhi band hai jab tak aap on na karein)");
  }
  async function paidEdit() {
    if (!img || !prompt.trim()) return setMsg("Tasveer + prompt dono chahiye");
    setBusy(true); setMsg("Meta Model API (PAID $0.01)…");
    const r = await fetch("/api/meta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "edit", image: img, prompt, paidOn, confirmPaid: confirm }) }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }));
    setBusy(false);
    if (r.ok) { setOut(r.image); setMsg(`Tayyar ✓ (kharch: $${r.cost})`); } else setMsg("✕ " + r.error);
  }
  async function freeEdit() {
    if (!img || !prompt.trim()) return setMsg("Tasveer + prompt dono chahiye");
    setBusy(true); setMsg("Puter.js (free) — pehli dafa Puter sign-in khulega…");
    const id = thinking.start("meta-puter");
    try { await puterSignIn(); const src = await puterEditImage(prompt, img); if (!src) throw new Error("natija khali"); setOut(src); setMsg("Free edit tayyar ✓ (Puter.js)"); }
    catch (e) { setMsg("✕ Puter: " + (e?.message || String(e)) + " — Meta AI wala free raasta istemal karein."); }
    finally { thinking.stop(id); setBusy(false); }
  }
  async function saveToGallery() {
    if (!out) return;
    try {
      const blob = await (await fetch(out)).blob();
      const fd = new FormData();
      fd.append("files", new Blob([blob], { type: blob.type || "image/png" }), `meta-edit-${Date.now()}.${(blob.type || "image/png").includes("jpeg") ? "jpg" : "png"}`);
      const r = await (await fetch("/api/gallery", { method: "POST", body: fd })).json();
      setMsg(r.ok ? "Gallery mein save ✓" : "✕ " + (r.rejected?.[0]?.error || r.error || "save nahi hua"));
    } catch (e) { setMsg("✕ " + e.message + " (link wali tasveer: pehle Download karein)"); }
  }

  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><Icon name="image" /> Meta AI · tasveer edit</div>
        <div className="top-actions"><Link href="/brains" className="icon-btn" title="Brains Rooms" aria-label="Brains"><Icon name="brain" /></Link><Link href="/gallery" className="icon-btn" title="Gallery" aria-label="Gallery"><Icon name="grid" /></Link><ThemeBalls /></div>
      </header>
      <div className="metapage" data-meta-page>
        <div className="metagrid">
          <section className="card panel">
            <b>1. Tasveer chunein</b>
            <div className="metapick" role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={(e) => { if (e.key === "Enter") fileRef.current?.click(); }}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}
              onPaste={(e) => { if (e.clipboardData?.files?.length) pick(e.clipboardData.files); }}>
              {img ? <img src={img} alt={imgName || "chuni hui tasveer"} /> : <span className="muted">Click, drag-drop ya Ctrl+V — PNG/JPG/WEBP</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
            {gallery.length > 0 && <><small className="muted">Gallery se:</small><div className="gthumbs">{gallery.map((f) => <img key={f.name} src={f.url} alt={f.original || f.name} title={f.original || f.name} onClick={() => fromGallery(f)} />)}</div></>}
            <b>2. Prompt (tayyar templates)</b>
            {META_TEMPLATES.map((t) => (
              <div key={t.id} className="tpl" data-template={t.id}>
                <b style={{ fontSize: 12.5 }}>{t.title}</b>
                <div className="tplrow"><span>{t.ur}</span><button className="ghost" onClick={() => copy(t.ur)}><Icon name="copy" size={12} /> Copy</button></div>
                <div className="tplrow"><span className="muted">{t.en}</span><button className="ghost" onClick={() => { copy(t.en); setPrompt(t.en); }}><Icon name="copy" size={12} /> Copy</button></div>
              </div>
            ))}
            <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} aria-label="Edit prompt" />
          </section>

          <section className="card panel">
            <b>3. Meta AI mein edit karein <span className="freebadge">FREE</span></b>
            <ol className="metasteps">{META_STEPS.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <div className="btnrow">
              <button onClick={copyImage} className="ghost"><Icon name="copy" size={14} /> Tasveer copy karein</button>
              <button onClick={() => copy(prompt)} className="ghost"><Icon name="copy" size={14} /> Prompt copy</button>
              <button onClick={openMeta} data-open-meta><Icon name="globe" size={14} /> Meta AI mein kholo</button>
            </div>
            <small className="muted">Meta AI dashboard ke andar (iframe) nahi khulta — Meta isay block karta hai, is liye alag Edge window.</small>

            <b style={{ marginTop: 6 }}>Free backup: dashboard ke andar <span className="freebadge">Puter.js</span></b>
            <small className="muted">Puter account (ek dafa sign-in, koi key nahi). Free mahana hissa, had likhi nahi — kabhi ruk sakta hai.</small>
            <div className="btnrow"><button className="ghost" onClick={freeEdit} disabled={busy || !img} data-puter-edit>Puter se free edit</button></div>

            <b style={{ marginTop: 6 }}>Meta Model API <span className="paidbadge">PAID</span></b>
            <p className="paidwarn" data-paid-warning>Paid: ${META_API.pricePerImage.toFixed(2)} har tasveer (api.meta.ai, {META_API.model}). Default band hai.</p>
            <div className="krow btnrow">
              <input type="password" autoComplete="off" placeholder={info?.keySet ? `Lagi hui: ${info.preview}` : "Meta Model API key (optional)"} value={keyIn} onChange={(e) => setKeyIn(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
              <button className="ghost" onClick={saveKey} disabled={!keyIn.trim()}>Save</button>
            </div>
            <label className="toggle"><input type="checkbox" checked={paidOn} onChange={(e) => setPaid(e.target.checked)} data-paid-toggle /> Paid API istemal karein</label>
            {paidOn && <label className="toggle"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} data-paid-confirm /> Haan, mujhe pata hai ${META_API.pricePerImage.toFixed(2)} lagega</label>}
            <div className="btnrow"><button onClick={paidEdit} disabled={busy || !img || !paidOn || !confirm || !info?.keySet} data-paid-run>Paid edit chalayein</button></div>

            <b style={{ marginTop: 6 }}>4. Natija</b>
            <div className="metaout">{out ? <img src={out} alt="Edit ki hui tasveer" /> : <span className="muted">Meta AI se download ki hui tasveer yahan daalein, ya Puter/Paid ka natija yahan aayega.</span>}</div>
            <label className="ghost linkbtn" style={{ cursor: "pointer", width: "fit-content" }}>Natija ki tasveer chunein<input type="file" accept="image/*" hidden data-result-input onChange={async (e) => { const f = e.target.files?.[0]; if (f) setOut(await readFileAsDataUrl(f)); e.target.value = ""; }} /></label>
            {out && <div className="btnrow"><button onClick={saveToGallery}><Icon name="download" size={14} /> Gallery mein save</button><a className="linkbtn ghost" href={out} download={`meta-edit-${Date.now()}.png`}>Download</a></div>}
            {msg && <small data-meta-msg>{msg}</small>}
          </section>
        </div>
      </div>
    </main>
  );
}
