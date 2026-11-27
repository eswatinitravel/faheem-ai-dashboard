"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import JarvisVisual, { JV_LOOKS, savedLook, saveLook } from "../components/JarvisVisual";

// v3.39 Subah ki report: user ke pins ka design. Mission-control (kaala, patli lines, beech mein particle chhalla)
// + glass holographic panel (chamakta orb ek gol pad par). Kal ka focus (ActivityWatch), board, aur emails
// jin ke jawab Jarvis ne TAYAR kiye hain. Bhejna sirf aap ke "Bhejo" + haan par.
const post = (body) => fetch("/api/subah", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));
const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
const time = (t) => { try { return new Date(t).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

export default function Subah() {
  const [d, setD] = useState(null);
  const [look, setLook] = useState("torus");
  const [mode, setMode] = useState("idle");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [setup, setSetup] = useState({ user: "nazfaheem121@gmail.com", pass: "" });
  const [open, setOpen] = useState(null);
  const [drafts, setDrafts] = useState({});

  const load = useCallback(async () => { const r = await fetch("/api/subah", { cache: "no-store" }).then((x) => x.json()).catch(() => null); if (r?.ok) setD(r); }, []);
  useEffect(() => { setLook(savedLook()); load(); }, [load]);
  const say = (t) => { setMsg(t); setTimeout(() => setMsg(""), 5000); };
  async function act(name, body, okMsg) {
    setBusy(name); setMode("thinking");
    const r = await post(body);
    setBusy(""); setMode("idle");
    say(r.ok ? okMsg || "Ho gaya" : r.error || "Masla"); if (r.ok) await load();
    return r;
  }
  function speak() {
    const t = d?.briefing?.text; if (!t || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(t); u.lang = "en-IN"; u.rate = 1;
    u.onstart = () => setMode("speaking"); u.onend = () => setMode("idle");
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  async function send(it) {
    const text = drafts[it.id] ?? it.draft;
    if (text !== it.draft) await post({ action: "mail_edit", id: it.id, text });
    if (!confirm(`Yeh jawab ${it.replyTo} ko bhej dun?\n\n${text.slice(0, 400)}`)) return;
    await act("send" + it.id, { action: "mail_send", id: it.id, confirm: true }, `Jawab chala gaya: ${it.replyTo}`);
  }

  const b = d?.briefing; const aw = b?.aw; const mail = d?.mail;
  const maxApp = Math.max(1, ...(aw?.apps || []).map((a) => a.min));
  const items = (mail?.items || []).filter((x) => x.status !== "sent").slice(0, 12);

  return (
    <main className="sb">
      <div className="sb-grid-bg" aria-hidden="true" />
      <header className="sb-top">
        <Link href="/" className="sb-ic" aria-label="Wapas"><Icon name="back" /></Link>
        <div className="sb-title"><span className="sb-dot" /> SUBAH KI REPORT <span className="sb-sub">{b ? time(b.at) : "abhi nahi bani"}</span></div>
        <div className="sb-tags">
          <span>FOCUS {aw?.ok ? fmt(aw.totalMin) : "--"}</span>
          <span>BOARD {b?.board ? b.board.by.todo + " baqi" : "--"}</span>
          <span>MAIL {mail?.setUp ? (mail.counts.drafted + " tayar") : "band"}</span>
          <span>{d?.schedule ? "ROZ " + d.schedule.every.replace("daily@", "") : "ROZ: band"}</span>
        </div>
      </header>

      <section className="sb-main">
        <aside className="sb-col">
          <div className="sb-panel">
            <h2>Kal ka focus</h2>
            {aw?.ok ? (<>
              <div className="sb-big">{fmt(aw.totalMin)}<small> laptop par kaam</small></div>
              <ul className="sb-bars">{aw.apps.slice(0, 6).map((a) => <li key={a.app}><span>{a.app}</span><i style={{ width: `${(a.min / maxApp) * 100}%` }} /><b>{fmt(a.min)}</b></li>)}</ul>
            </>) : <p className="sb-muted">{aw?.reason || "Report banayein. ActivityWatch laptop par chalna chahiye (activitywatch.net)."}</p>}
          </div>
          <div className="sb-panel">
            <h2>Kal sab se zyada</h2>
            <ul className="sb-list">{(aw?.titles || []).map((t, i) => <li key={i}><b>{t.app}</b> {t.title} <span>{fmt(t.min)}</span></li>)}{!aw?.titles?.length && <li className="sb-muted">Abhi data nahi.</li>}</ul>
          </div>
        </aside>

        <div className="sb-stage">
          <div className="sb-holo" role="status" aria-live="polite">
            <div className="sb-holo-head">JARVIS · {b ? "aaj" : "tayar"}</div>
            <p>{b?.text || "Abhi report nahi bani. \"Report banao\" dabayein."}</p>
            {msg && <p className="sb-msg">{msg}</p>}
          </div>
          <div className="sb-orb"><JarvisVisual look={look === "classic" ? "torus" : look} mode={mode} level={0} /></div>
          <div className="sb-pad" aria-hidden="true"><i /><i /><i /></div>
          <div className="sb-actions">
            <button onClick={() => act("build", { action: "build" }, "Report tayar")} disabled={!!busy}>{busy === "build" ? "Ban rahi hai…" : "Report banao"}</button>
            <button onClick={speak} disabled={!b}>Suno</button>
            <label className="sr" htmlFor="sb-when">Roz kab</label>
            <select id="sb-when" value={d?.schedule?.every || ""} onChange={(e) => act("sch", { action: "schedule", every: e.target.value }, e.target.value ? "Roz report chalu" : "Roz report band")}>
              <option value="">Roz: band</option><option value="daily@07:00">Roz 7 baje</option><option value="daily@08:00">Roz 8 baje</option><option value="daily@09:00">Roz 9 baje</option>
            </select>
            <label className="sr" htmlFor="sb-look">Jarvis ki shakal</label>
            <select id="sb-look" value={look} onChange={(e) => { setLook(e.target.value); saveLook(e.target.value); }}>
              {JV_LOOKS.filter((l) => l.id !== "classic").map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <aside className="sb-col">
          <div className="sb-panel">
            <h2>Board</h2>
            {b?.board ? (<div className="sb-kpis"><div><b>{b.board.by.todo}</b>baqi</div><div><b>{b.board.by.doing}</b>chal rahe</div><div><b>{b.board.by.review}</b>review</div><div><b>{b.board.by.done}</b>done</div></div>) : <p className="sb-muted">--</p>}
            {b?.urgent?.length > 0 && <ul className="sb-list">{b.urgent.map((u) => <li key={u}><b>!</b> {u}</li>)}</ul>}
            <Link className="sb-link" href="/board">Board kholo</Link>
          </div>
          <div className="sb-panel">
            <h2>Gmail</h2>
            {mail?.setUp ? (<>
              <p className="sb-muted">{mail.user} · aakhri check {mail.lastCheck ? time(mail.lastCheck) : "abhi nahi"}</p>
              {mail.lastError && <p className="sb-err">{mail.lastError}</p>}
              <div className="sb-kpis"><div><b>{mail.counts.new}</b>nayi</div><div><b>{mail.counts.drafted}</b>jawab tayar</div><div><b>{mail.counts.sent}</b>bheje</div></div>
              <button onClick={() => act("mail", { action: "mail_refresh" }, "Emails parh li, jawab tayar")} disabled={!!busy}>{busy === "mail" ? "Parh raha…" : "Abhi parho"}</button>
              <button className="sb-ghostbtn" onClick={() => confirm("Gmail ka login hata dun?") && act("forget", { action: "mail_forget" }, "Gmail hata diya")}>Hatao</button>
            </>) : (
              <form onSubmit={(e) => { e.preventDefault(); act("setup", { action: "mail_setup", ...setup }, "Gmail jur gaya").then(() => setSetup({ ...setup, pass: "" })); }}>
                <p className="sb-muted">Google App Password chahiye (asal password nahi). myaccount.google.com → Security → 2-Step Verification on → App passwords → naam "Jarvis" → 16 haroof yahan.</p>
                <label htmlFor="sb-u">Gmail</label><input id="sb-u" value={setup.user} onChange={(e) => setSetup({ ...setup, user: e.target.value })} autoComplete="off" />
                <label htmlFor="sb-p">App Password</label><input id="sb-p" type="password" value={setup.pass} onChange={(e) => setSetup({ ...setup, pass: e.target.value })} autoComplete="new-password" placeholder="abcd efgh ijkl mnop" />
                <button type="submit" disabled={!!busy}>{busy === "setup" ? "Check…" : "Jodo"}</button>
              </form>
            )}
          </div>
        </aside>
      </section>

      {mail?.setUp && (
        <section className="sb-panel sb-mail" aria-label="Emails">
          <h2>Emails · Jarvis ke tayar jawab <span className="sb-muted">(bhejna sirf aap ke kehne par)</span></h2>
          {!items.length && <p className="sb-muted">Koi email nahi. "Abhi parho" dabayein.</p>}
          {items.map((it) => (
            <article key={it.id} className={"sb-mailrow " + it.status}>
              <button className="sb-mailhead" onClick={() => setOpen(open === it.id ? null : it.id)} aria-expanded={open === it.id}>
                <b>{it.from.replace(/<.*>/, "").trim() || it.replyTo}</b><span>{it.subject}</span><em>{it.status === "drafted" ? "jawab tayar" : it.status === "new" ? "nayi" : it.status}</em>
              </button>
              {open === it.id && (
                <div className="sb-mailbody">
                  <pre>{it.text}</pre>
                  <label htmlFor={"dr-" + it.id}>Jawab ({it.replyTo})</label>
                  <textarea id={"dr-" + it.id} rows={7} value={drafts[it.id] ?? it.draft ?? ""} onChange={(e) => setDrafts({ ...drafts, [it.id]: e.target.value })} placeholder="Jarvis se tayar karwayein ya khud likhein" />
                  <div className="sb-actions left">
                    <button onClick={() => act("dr" + it.id, { action: "mail_draft", id: it.id }, "Naya jawab tayar").then(() => setDrafts({ ...drafts, [it.id]: undefined }))} disabled={!!busy}>Jarvis se likhwao</button>
                    <button className="sb-send" onClick={() => send(it)} disabled={!!busy || !String(drafts[it.id] ?? it.draft ?? "").trim()}>Bhejo</button>
                    <button className="sb-ghostbtn" onClick={() => act("sk" + it.id, { action: "mail_skip", id: it.id }, "Chhor di")}>Jawab nahi chahiye</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
