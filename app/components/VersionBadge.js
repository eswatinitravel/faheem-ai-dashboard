"use client";
import { useEffect, useState } from "react";

// Neeche left corner: version, aur naya version ho to us ke oopar "New update" — ek click mein update.
export default function VersionBadge() {
  const [u, setU] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const check = () => fetch("/api/update").then((r) => r.json()).then(setU).catch(() => {});
    check();
    const id = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  if (!u) return null;
  async function run() {
    setBusy(true);
    setMsg("Update ho raha hai… ek window khulegi, khatam hote hi app khud dobara khulegi.");
    const r = await fetch("/api/update", { method: "POST" }).then((x) => x.json()).catch(() => ({ error: "Update start nahi hua" }));
    if (r.error) { setMsg(r.error); setBusy(false); }
  }
  return (
    <div className="verbadge">
      {u.available && (
        <button className="newup" disabled={busy} onClick={run} title={`v${u.latest} install karein`}>
          <i /> {busy ? "Updating…" : `New update · v${u.latest}`}
        </button>
      )}
      <div className="vline"><span>v{u.current}</span>{!u.available && <small>latest ✓</small>}</div>
      {msg && <small>{msg}</small>}
    </div>
  );
}
