"use client";
import { useEffect, useState } from "react";

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
      if (d && d.current !== from) { clearInterval(poll); setMsg(`v${d.current} install ho gaya ✓`); setTimeout(() => location.reload(), 1500); return; }
      const min = Math.round((Date.now() - started) / 60000);
      if (min >= 8) { clearInterval(poll); setBusy(false); setMsg("Update window nahi chali lagti. App band karein aur project folder mein UPDATE.bat double-click karein (keys mehfooz rahengi)."); }
      else if (d === null) setMsg(`Update chal raha hai (${min} min)… server dobara ban raha hai, 2–4 minute.`);
    }, 10000);
  }
  return (
    <>
    {u.available && !busy && (
      <div className="upbanner" onClick={run}>🎉 Naya version v{u.latest} aa gaya (aap v{u.current} par hain) — <b>abhi update karein</b></div>
    )}
    <div className="verbadge">
      {u.available && (
        <button className="newup" disabled={busy} onClick={run} title={`v${u.latest} install karein`}>
          <i /> {busy ? "Updating…" : `New update · v${u.latest}`}
        </button>
      )}
      <div className="vline"><span>v{u.current}</span>{u.error ? <small title={u.error} style={{ color: "#f87171" }}>update check fail</small> : !u.available && <small>latest ✓</small>}</div>
      {msg && <small>{msg}</small>}
    </div>
    </>
  );
}
