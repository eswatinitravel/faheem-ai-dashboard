"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";
import { pageRooms, PER_PAGE } from "../../lib/brain-status";
import { prepareFiles, forServer } from "../../lib/attach";
import { thinking } from "../../lib/thinking";
import { puterChat, puterSignIn, puterSignedIn } from "../../lib/puter-client";

// v3.14 Brains Rooms: har brain ka apna card + chat room. Ek screen par bilkul 4 (2x2), Page 1..N.
const LIGHT_TXT = { green: "Chal rahi hai", red: "Kaam nahi kar rahi", yellow: "Limit par", grey: "Key nahi" };

function lightOf(room) {
  if (room.id === "puter") return room.status || { light: "grey", label: "Sign-in nahi" };
  if (room.status) return room.status;
  if (room.keyless) return { light: "grey", label: "Check nahi hua" };
  return { light: "grey", label: "Key nahi lagi" };
}

function RoomCard({ room, onStatus }) {
  const [log, setLog] = useState([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [keyIn, setKeyIn] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [kmsg, setKmsg] = useState("");
  const box = useRef(null);
  const fileRef = useRef(null);
  const st = lightOf(room);

  useEffect(() => {
    fetch(`/api/rooms?id=${room.id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setLog(d.messages || [])).catch(() => {});
  }, [room.id]);
  useEffect(() => { box.current?.scrollTo(0, 1e6); }, [log, busy]);

  async function addFiles(list) {
    const prepared = await prepareFiles(list);
    setFiles((f) => [...f, ...prepared].slice(0, 6));
  }

  async function saveKey() {
    const k = keyIn.trim();
    if (!k) return;
    setKmsg("Save + check ho raha…");
    const r = await fetch("/api/brains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", id: room.id, keys: k, mode: addMode ? "add" : "replace" }) }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }));
    setKeyIn("");
    if (r.ok) { setKmsg(`Save ✓ (${r.keys.length} key) — ${r.status?.label || ""}`); onStatus(room.id, { status: r.status, keys: r.keys }); setAddMode(false); }
    else setKmsg("✕ " + (r.error || "save nahi hua"));
  }
  async function removeKey(i) {
    const r = await fetch("/api/brains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "removeKey", id: room.id, index: i }) }).then((x) => x.json()).catch(() => ({ ok: false }));
    if (r.ok) onStatus(room.id, { status: r.status, keys: r.keys });
  }
  async function check() {
    if (room.id === "puter") { const ok = await puterSignedIn(); onStatus(room.id, { status: ok ? { light: "green", label: "Sign-in ho gaya" } : { light: "grey", label: "Sign-in nahi" } }); return; }
    setKmsg("Check…");
    const r = await fetch("/api/brains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "check", id: room.id }) }).then((x) => x.json()).catch(() => ({}));
    setKmsg("");
    if (r.status) onStatus(room.id, { status: r.status });
  }

  async function send(e) {
    e?.preventDefault();
    const content = text.trim();
    if ((!content && !files.length) || busy) return;
    const atts = files;
    setText(""); setFiles([]); setBusy(true);
    setLog((l) => [...l, { role: "user", content: content || "(sirf file)", files: atts.map((a) => a.name) }]);
    if (room.id === "puter") {
      // Puter browser mein chalta hai: fetch nahi, is liye dots khud chalayein.
      const tid = thinking.start("room-puter");
      const t0 = Date.now();
      try {
        const img = atts.find((a) => a.kind === "image")?.dataUrl;
        const extra = atts.filter((a) => a.kind === "text").map((a) => `\n\n[File: ${a.name}]\n${(a.text || "").slice(0, 20000)}`).join("");
        const hist = log.filter((m) => (m.role === "user" || m.role === "assistant") && !m.err).slice(-12).map(({ role, content }) => ({ role, content }));
        const reply = await puterChat([...hist, { role: "user", content: content + extra }], img);
        const msgs = [{ role: "user", content: content || "(sirf file)", files: atts.map((a) => a.name) }, { role: "assistant", content: reply, ms: Date.now() - t0, model: "puter" }];
        setLog((l) => [...l, msgs[1]]);
        onStatus("puter", { status: { light: "green", label: "Sign-in ho gaya" } });
        fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "append", id: "puter", messages: msgs }) }).catch(() => {});
      } catch (err) {
        setLog((l) => [...l, { role: "assistant", content: "Puter: " + (err?.message || String(err)), err: true }]);
      } finally { thinking.stop(tid); setBusy(false); }
      return;
    }
    const r = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", id: room.id, message: content, attachments: atts.map(forServer) }) })
      .then((x) => x.json()).catch((err) => ({ ok: false, error: err.message }));
    const notes = (r.notes || []).map((n) => ({ role: "note", content: n }));
    if (r.ok) setLog((l) => [...l, ...notes, { role: "assistant", content: r.text, ms: r.ms, model: r.model }]);
    else setLog((l) => [...l, ...notes, { role: "assistant", content: r.error || "fail", err: true }]);
    setBusy(false);
  }

  async function clearHist() {
    await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear", id: room.id }) }).catch(() => {});
    setLog([]);
  }

  return (
    <section className={"card panel room" + (busy ? " thinking" : "") + (drag ? " drag" : "")} data-room={room.id} data-light={st.light}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}>
      <svg className="thinkborder" aria-hidden="true"><rect x="1.5" y="1.5" rx="17" style={{ width: "calc(100% - 3px)", height: "calc(100% - 3px)" }} /></svg>
      <header className="roomhead">
        <span className={"light " + st.light} title={st.label} data-light-dot={st.light} />
        <div className="rname"><b>{room.name}</b><small>{room.model}{room.vision ? " · tasveer dekh sakta" : ""}{room.slow ? " · bohat dheema" : ""}</small></div>
        <span className="rlabel" title={st.label}>{st.label || LIGHT_TXT[st.light]}</span>
        {room.keyUrl && <a className="keylink" href={room.keyUrl} target="_blank" rel="noreferrer">{room.noKey ? "Site ↗" : "Key lein ↗"}</a>}
        <button className="icon-btn" title="Key / status" aria-label="Key aur status" onClick={() => setShowKeys((v) => !v)}><Icon name="settings" size={14} /></button>
      </header>
      {st.help && <div className="keyhelp" data-expiry-help>{st.help.text} — <a href={st.help.url} target="_blank" rel="noreferrer">key page ↗</a></div>}
      {showKeys && (
        <div className="keybox" data-keybox>
          {room.id === "puter" ? (
            <div className="krow"><span className="muted" style={{ flex: 1 }}>{room.note}</span><button onClick={async () => { try { await puterSignIn(); } catch (err) { setKmsg("✕ " + err.message); } check(); }}>Puter sign-in</button></div>
          ) : room.noKey ? (
            <div className="krow"><span className="muted" style={{ flex: 1 }}>{room.note}</span><button onClick={check}>Check</button></div>
          ) : (
            <>
              {room.keys?.length > 0 && <div className="keychips">{room.keys.map((k, i) => <span key={i} className="keychip" data-masked-key>{k}{room.pool?.[i]?.disabled ? " ✕" : room.pool?.[i]?.resting ? ` ⏳${room.pool[i].restMin}m` : ""}<button aria-label="Key hatayein" title="Hatayein" onClick={() => removeKey(i)}>×</button></span>)}</div>}
              <div className="krow">
                <input type="password" autoComplete="off" spellCheck={false} placeholder={addMode ? "Aur key (pool) — comma se kai" : room.keys?.length ? "Nayi key (purani badal degi)" : "Key yahan paste karein"} value={keyIn} onChange={(e) => setKeyIn(e.target.value)} data-key-input />
                <button onClick={saveKey} disabled={!keyIn.trim()} data-key-save>Save</button>
                <button className="ghost" title="Key pool: 2-3 keys, limit par khud agli" onClick={() => setAddMode((v) => !v)} aria-pressed={addMode}>+</button>
                <button className="ghost" onClick={check}>Check</button>
              </div>
              <small className="muted">{room.note}</small>
            </>
          )}
          {kmsg && <small>{kmsg}</small>}
        </div>
      )}
      <div className="rlog" ref={box}>
        {!log.length && <span className="muted">Is room mein sirf {room.name} jawab dega. History isi laptop par save hoti hai.</span>}
        {log.map((m, i) => (
          <div key={i} className={"rmsg" + (m.role === "user" ? " me" : "") + (m.err ? " err" : "") + (m.role === "note" ? " note" : "")}>
            {m.content}
            {(m.files?.length || m.ms) ? <small>{m.files?.length ? "📎 " + m.files.join(", ") : ""}{m.ms ? ` ${(m.ms / 1000).toFixed(1)}s` : ""}{m.model && m.model !== room.model ? " · " + m.model : ""}</small> : null}
          </div>
        ))}
        {busy && <span className="muted">Soch raha hai…</span>}
      </div>
      {files.length > 0 && <div className="rfiles">{files.map((f, i) => <span key={i}>{f.kind === "image" ? "🖼" : f.kind === "video" ? "🎬" : "📄"} {f.name} <button className="ghost" style={{ padding: "0 4px" }} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label="Hatayein">×</button></span>)}{files.some((f) => f.kind === "image") && !room.vision && <span className="warnline" data-vision-note>Yeh brain tasveer nahi dekh sakta — tasveer nahi jayegi.</span>}</div>}
      <form className="rform" onSubmit={send}>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <button type="button" className="ghost" title="Tasveer / video / file lagayein" aria-label="Attach" onClick={() => fileRef.current?.click()}><Icon name="clip" size={15} /></button>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={`${room.name} se poochein…`}
          onPaste={(e) => { const fl = e.clipboardData?.files; if (fl?.length) { e.preventDefault(); addFiles(fl); } }} />
        <button type="submit" aria-label="Bhejein" disabled={busy}><Icon name="send" size={15} /></button>
        <button type="button" className="ghost" title="History mitayein" aria-label="History mitayein" onClick={clearHist}><Icon name="trash" size={14} /></button>
      </form>
    </section>
  );
}

export default function Brains() {
  const [rooms, setRooms] = useState(null);
  const [live, setLive] = useState(null);
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => fetch("/api/brains", { cache: "no-store" }).then((r) => r.json()).then((d) => { setRooms(d.rooms || []); setLive(d.live || null); }).catch(() => setRooms([])), []);
  useEffect(() => {
    load();
    try { const p = Number(sessionStorage.getItem("faheem-brains-page")); if (p > 0) setPage(p); } catch {}
    // Har 30 min sab brains ka sasta check (status lights taaza)
    const t = setInterval(async () => { await fetch("/api/brains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkAll" }) }).catch(() => {}); load(); }, 30 * 60 * 1000);
    // Pehli dafa: purane status background mein check hote hain — 20s baad dobara parhein
    const t2 = setTimeout(load, 20000);
    return () => { clearInterval(t); clearTimeout(t2); };
  }, [load]);

  const onStatus = (id, patch) => setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  async function checkAll() {
    setMsg("Sab brains check ho rahe hain (sasta /models ya 1-token)…");
    await fetch("/api/brains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkAll" }) }).catch(() => {});
    await load();
    setMsg("Check mukammal ✓");
  }
  const view = rooms ? pageRooms(rooms, page, PER_PAGE) : null;
  const go = (p) => { setPage(p); try { sessionStorage.setItem("faheem-brains-page", String(p)); } catch {} };
  const counts = rooms ? rooms.reduce((a, r) => { const l = lightOf(r).light; a[l] = (a[l] || 0) + 1; return a; }, {}) : {};

  return (
    <main className="optpage brainsmain">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><Icon name="brain" /> Brains Rooms · har brain ka apna kamra</div>
        <div className="top-actions">
          <Link href="/tools" className="icon-btn" title="Purana Tools board" aria-label="Tools"><Icon name="flask" /></Link>
          <Link href="/meta" className="icon-btn" title="Meta AI tasveer edit" aria-label="Meta"><Icon name="image" /></Link>
          <Link href="/options" className="icon-btn" title="Options" aria-label="Options"><Icon name="more" /></Link>
          <ThemeBalls />
        </div>
      </header>
      <div className="brainspage">
        <div className="brainsbar">
          <nav className="pagetabs" aria-label="Pages" data-pagetabs>
            {view && Array.from({ length: view.pages }, (_, i) => <button key={i} className={view.page === i + 1 ? "on" : ""} onClick={() => go(i + 1)} data-page-tab={i + 1}>Page {i + 1}</button>)}
          </nav>
          <button onClick={checkAll}><Icon name="check" size={14} /> Sab check karo</button>
          <span className="muted">{rooms ? <>{rooms.length} brains{["green", "yellow", "red", "grey"].map((l) => <span key={l} className="cnt"><span className={"light " + l} />{counts[l] || 0}</span>)}</> : ""} {msg}</span>
        </div>
        {live && <div className="livestrip" data-live-strip>Live free list (har ghanta): {!live.enabled ? "band (Options)" : live.brains.length ? live.brains.map((b) => b.name).join(" · ") : live.error ? `service nahi mili (${live.error}) — purane brains chal rahe` : "abhi khali"}</div>}
        {rooms === null && <p className="muted">Brains load ho rahe hain…</p>}
        {view && <div className="roomgrid" data-roomgrid data-page={view.page}>{view.items.map((r) => <RoomCard key={r.id} room={r} onStatus={onStatus} />)}</div>}
      </div>
    </main>
  );
}
