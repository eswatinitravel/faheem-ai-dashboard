"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";

// Neeche left corner: version, aur naya version ho to us ke oopar "New update" — ek click mein update.
export default function VersionBadge() {
  const [u, setU] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    // Har 3 minute, aur jab bhi window par wapas aayein, GitHub se naya version dekho.
    const check = () => fetch(`/api/update?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()).then(setU).catch(() => setU((o) => o || { current: "?", error: "server se rabta nahi" }));
    check();
    const id = setInterval(check, 3 * 60 * 1000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, []);
  if (!u) return null;
  async function run() {
    setBusy(true);
    setMsg("Update window khul rahi hai… yeh app band ho jayegi aur install ke baad khud dobara khulegi (2–4 minute).");
    const r = await fetch("/api/update", { method: "POST" }).then((x) => x.json()).catch(() => ({ error: "Update start nahi hua" }));
    if (r.error) { setMsg(r.error + " — project folder mein UPDATE.bat double-click karein."); setBusy(false); return; }
    // Server band ho kar naye version ke sath wapas aata hai: har 10 second dekhte rahein.
    const from = u.current, started = Date.now();
    const poll = setInterval(async () => {
      const d = await fetch("/api/update", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (d && d.current !== from) { clearInterval(poll); setMsg(`v${d.current} install ho gaya`); setTimeout(() => location.reload(), 1500); return; }
      const min = Math.round((Date.now() - started) / 60000);
      if (min >= 8) { clearInterval(poll); setBusy(false); setMsg("Update window nahi chali lagti. App band karein aur project folder mein UPDATE.bat double-click karein (keys mehfooz rahengi)."); }
      else if (d === null) setMsg(`Update chal raha hai (${min} min)… server dobara ban raha hai, 2–4 minute.`);
    }, 10000);
  }
  // v3.29: "Purane version par wapas" — aakhri update se pehle wala backup wapas (chats/keys mehfooz).
  async function rollback() {
    const b = u.backup;
    if (!b || busy) return;
    if (!window.confirm(`Purane version v${b.version} par wapas jayein? App band ho kar 2–4 minute mein dobara khulegi. Chats aur keys mehfooz rahengi.`)) return;
    setBusy(true);
    setMsg(`v${b.version} wapas lag raha hai… window khul rahi hai (2–4 minute).`);
    const r = await fetch("/api/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rollback" }) }).then((x) => x.json()).catch(() => ({ error: "Wapsi start nahi hui" }));
    if (r.error) { setMsg(r.error + " — project folder mein ROLLBACK.bat double-click karein."); setBusy(false); return; }
    const from = u.current, started = Date.now();
    const poll = setInterval(async () => {
      const d = await fetch("/api/update?local=1", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (d && d.current !== from) { clearInterval(poll); setMsg(`v${d.current} wapas lag gaya`); setTimeout(() => location.reload(), 1500); return; }
      if (Date.now() - started > 8 * 60000) { clearInterval(poll); setBusy(false); setMsg("Wapsi window nahi chali lagti. Project folder mein ROLLBACK.bat double-click karein."); }
    }, 10000);
  }
  return (
    <>
    {u.available && !busy && (
      <div className="upbanner" onClick={run}><Icon name="sparkle" size={14} /> Naya version v{u.latest} aa gaya (aap v{u.current} par hain) — <b>abhi update karein</b></div>
    )}
    <div className="verbadge">
      {u.available && (
        <button className="newup" disabled={busy} onClick={run} title={`v${u.latest} install karein`}>
          <i /> {busy ? "Updating…" : `New update · v${u.latest}`}
        </button>
      )}
      <div className="vline"><span>v{u.current}</span>{u.error ? <small title={u.error} style={{ color: "#f87171" }}>update check fail</small> : !u.available && <small>latest <Icon name="check" size={13} /></small>}</div>
      {u.backup && u.backup.version !== u.current && !busy && (
        <button type="button" className="rollback" data-rollback onClick={rollback} title={`Backup: ${u.backup.name}`}>Purane version (v{u.backup.version}) par wapas</button>
      )}
      {msg && <small>{msg}</small>}
    </div>
    </>
  );
}
