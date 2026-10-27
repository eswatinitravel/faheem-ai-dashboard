"use client";
import { useEffect, useState } from "react";

// Chhota version option, neeche left corner mein.
export default function VersionBadge() {
  const [u, setU] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/update").then((r) => r.json()).then(setU).catch(() => {}); }, []);
  if (!u) return null;
  return (
    <div className="verbadge">
      <span>v{u.current}</span>
      {u.available ? (
        <button disabled={busy} onClick={async () => { setBusy(true); await fetch("/api/update", { method: "POST" }); }}
          title={`Naya version ${u.latest}`}>
          <i /> {busy ? "Update ho raha…" : `Update ${u.latest}`}
        </button>
      ) : <small>latest ✓</small>}
    </div>
  );
}
