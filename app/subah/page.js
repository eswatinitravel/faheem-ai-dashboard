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
  const [acc, setAcc] = useState({ email: "", pass: "", clientId: "", imapHost: "", smtpHost: "", label: "" });
  const [prov, setProv] = useState("gmail");
  const [ms, setMs] = useState(null); // { id, userCode, url }
  const [guide, setGuide] = useState({});
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
  async function detect(email) {
    if (!/@[^@\s]+\.[a-z]{2,}$/i.test(email)) return;
    const r = await post({ action: "detect", email }); if (r.ok) setProv(r.provider);
  }
  async function msStart(id) {
    const r = await act("ms" + id, { action: "ms_start", id });
    if (!r.ok) return;
    setMs({ id, userCode: r.userCode, url: r.url });
    const until = Date.now() + (r.expiresIn || 900) * 1000;
    const tick = async () => {
      if (Date.now() > until) { setMs(null); return say("Code ka waqt khatam, dobara jodein."); }
      const p = await post({ action: "ms_poll", id });
      if (p.done || !p.ok) { setMs(null); say(p.ok ? "Hotmail jur gaya" : p.error || "Masla"); load(); return; }
      setTimeout(tick, 5000);
    };
    setTimeout(tick, 5000);
  }
  async function addAcc(e) {
    e.preventDefault();
    const r = await act("add", { action: "account_add", account: { email: acc.email, pass: acc.pass, clientId: acc.clientId, provider: prov, imapHost: acc.imapHost, smtpHost: acc.smtpHost, label: acc.label } }, "Account jur gaya");
    if (r.account) { setAcc({ email: "", pass: "", clientId: "", imapHost: "", smtpHost: "", label: "" }); if (r.next === "ms_login") msStart(r.account.id); }
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
          <span>MAIL {mail?.setUp ? `${mail.accounts.length} acc · ${mail.counts.drafted} zaroori` : "band"}</span>
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
              <option value="">Roz: band</option><option value="daily@07:00">Roz 7 baje</option><option value="daily@08:00">Roz 8 baje</option><option value="daily@09:00">Roz 9 baje</option><option value="daily@10:00">Roz 10 baje</option>
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
          <div className="sb-panel" data-mail-accounts>
            <h2>Email accounts</h2>
            {(mail?.accounts || []).map((a) => (
              <div key={a.id} className={"sb-acc" + (a.enabled ? "" : " off")}>
                <div><b>{a.email}</b><span className="sb-muted"> {a.providerName}</span></div>
                <div className="sb-muted">{a.lastError ? <span className="sb-err">{a.lastError}</span> : a.connected ? (a.lastCheck ? "theek · " + time(a.lastCheck) : "jura hua") : "sign-in baqi"}</div>
                <div className="sb-actions left">
                  {a.auth === "oauth_ms" && !a.connected && <button onClick={() => msStart(a.id)}>Microsoft se jodo</button>}
                  <button className="sb-ghostbtn" onClick={() => act("t" + a.id, { action: "account_test", id: a.id }, "Theek jur raha hai")}>Test</button>
                  <button className="sb-ghostbtn" onClick={() => act("g" + a.id, { action: "account_toggle", id: a.id }, a.enabled ? "Band" : "Chalu")}>{a.enabled ? "Band karo" : "Chalu karo"}</button>
                  <button className="sb-ghostbtn" onClick={() => confirm(`${a.email} hata dun?`) && act("r" + a.id, { action: "account_remove", id: a.id }, "Hata diya")}>Hatao</button>
                </div>
              </div>
            ))}
            {ms && (
              <div className="sb-ms" role="status">
                <p>Microsoft par jayein: <a href={ms.url} target="_blank" rel="noreferrer">{ms.url}</a> aur yeh code daalein:</p>
                <div className="sb-code">{ms.userCode}</div>
                <p className="sb-muted">Allow karne ke baad yeh khud jur jayega.</p>
              </div>
            )}
            {mail?.accounts?.length > 0 && <button onClick={() => act("mail", { action: "mail_refresh" }, "Sab emails parh li, jawab tayar")} disabled={!!busy}>{busy === "mail" ? "Parh raha…" : "Abhi sab parho"}</button>}
            <form className="sb-addacc" onSubmit={addAcc}>
              <h3>+ Account jodo</h3>
              <label htmlFor="sb-e">Email</label>
              <input id="sb-e" value={acc.email} onChange={(e) => { setAcc({ ...acc, email: e.target.value }); detect(e.target.value); }} placeholder="naam@gmail.com / hotmail.com / yahoo.com" autoComplete="off" required />
              <label htmlFor="sb-pv">Kis ka</label>
              <select id="sb-pv" value={prov} onChange={(e) => setProv(e.target.value)}>{Object.entries(mail?.presets || {}).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
              <p className="sb-muted">{mail?.presets?.[prov]?.help}</p>
              {prov === "outlook" ? (<>
                <label htmlFor="sb-ci">Microsoft Client ID</label>
                <input id="sb-ci" value={acc.clientId} onChange={(e) => setAcc({ ...acc, clientId: e.target.value })} placeholder="1234abcd-...." autoComplete="off" />
                <details className="sb-muted"><summary>Client ID kaise banayein (ek dafa)</summary>
                  <ol><li>entra.microsoft.com → App registrations → New registration.</li><li>Naam "Jarvis"; account types: "Personal Microsoft accounts only".</li><li>Authentication → "Allow public client flows" = Yes.</li><li>API permissions → Add → APIs my organization uses → "Office 365 Exchange Online" → Delegated: IMAP.AccessAsUser.All, SMTP.Send.</li><li>Overview se "Application (client) ID" yahan daalein.</li></ol></details>
              </>) : (<>
                <label htmlFor="sb-pw">App Password</label>
                <input id="sb-pw" type="password" value={acc.pass} onChange={(e) => setAcc({ ...acc, pass: e.target.value })} autoComplete="new-password" placeholder="abcd efgh ijkl mnop" />
              </>)}
              {prov === "other" && (<>
                <label htmlFor="sb-ih">IMAP server</label><input id="sb-ih" value={acc.imapHost} onChange={(e) => setAcc({ ...acc, imapHost: e.target.value })} placeholder="mail.example.com" />
                <label htmlFor="sb-sh">SMTP server</label><input id="sb-sh" value={acc.smtpHost} onChange={(e) => setAcc({ ...acc, smtpHost: e.target.value })} placeholder="mail.example.com" />
              </>)}
              <label htmlFor="sb-lb">Naam (marzi)</label>
              <input id="sb-lb" value={acc.label} onChange={(e) => setAcc({ ...acc, label: e.target.value })} placeholder="Shop, Zaati, Kaam" />
              <button type="submit" disabled={!!busy}>{busy === "add" ? "Jor raha…" : "Jodo"}</button>
            </form>
          </div>
        </aside>
      </section>

      {mail?.setUp && (
        <section className="sb-panel sb-mail" aria-label="Emails">
          <h2>Emails · sab accounts · Jarvis ke tayar jawab <span className="sb-muted">(bhejna sirf aap ke kehne par)</span></h2>
          {(mail.errors || []).map((e) => <p key={e} className="sb-err">{e}</p>)}
          {!items.length && <p className="sb-muted">Koi email nahi. "Abhi parho" dabayein.</p>}
          {items.map((it) => (
            <article key={it.id} className={"sb-mailrow " + it.status}>
              <button className="sb-mailhead" onClick={() => setOpen(open === it.id ? null : it.id)} aria-expanded={open === it.id}>
                <b>{it.n ? `${it.n}. ` : ""}{it.from.replace(/<.*>/, "").trim() || it.replyTo}</b><span>{it.subject} <small className="sb-muted">· {it.accountLabel || it.account}</small></span><em className={"u-" + it.urgency}>{it.status === "drafted" ? (it.urgency === "high" ? "bohat zaroori" : "jawab tayar") : it.status === "new" ? "nayi" : it.status === "info" ? "sirf khabar" : it.status}</em>
              </button>
              {open === it.id && (
                <div className="sb-mailbody">
                  {it.summary && <p className="sb-sum">{it.summary}</p>}
                  <pre>{it.text}</pre>
                  <label htmlFor={"dr-" + it.id}>Jawab ({it.replyTo})</label>
                  <textarea id={"dr-" + it.id} rows={7} value={drafts[it.id] ?? it.draft ?? ""} onChange={(e) => setDrafts({ ...drafts, [it.id]: e.target.value })} placeholder="Jarvis se tayar karwayein ya khud likhein" />
                  <div className="sb-actions left">
                    <label htmlFor={"gd-" + it.id} className="sr">Jarvis ko hidayat</label>
                    <input id={"gd-" + it.id} className="sb-guide" value={guide[it.id] || ""} onChange={(e) => setGuide({ ...guide, [it.id]: e.target.value })} placeholder="Jarvis ko batayein: jaise kal tak bhej denge" />
                    <button onClick={() => act("dr" + it.id, { action: "mail_draft", id: it.id, guidance: guide[it.id] || "" }, "Naya jawab tayar").then(() => setDrafts({ ...drafts, [it.id]: undefined }))} disabled={!!busy}>Jarvis se likhwao</button>
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
