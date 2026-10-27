"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// Search: purani aur abhi ki chats mein dhoondein, ya web par.
export default function SearchOverlay({ messages, onClose, onAsk }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); const k = (e) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  const all = useMemo(() => {
    let archive = [];
    try { archive = JSON.parse(localStorage.getItem("faheem-ai-archive") || "[]"); } catch {}
    const cur = messages.map((m) => ({ ...m, where: "Abhi ki chat" }));
    const old = archive.flatMap((c) => (c.messages || []).map((m) => ({ ...m, where: c.date || "Purani chat" })));
    return [...cur, ...old];
  }, [messages]);
  const hits = q.trim().length < 2 ? [] : all.filter((m) => m.content.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  return (
    <div className="search-bg" onClick={onClose}>
      <div className="search panel" onClick={(e) => e.stopPropagation()}>
        <div className="search-row">
          <span>⌕</span>
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chats mein dhoondein…"
            onKeyDown={(e) => { if (e.key === "Enter" && q.trim() && hits.length === 0) { onAsk(q); onClose(); } }} />
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        {q.trim() && (
          <div className="search-actions">
            <button className="ghost" onClick={() => { onAsk(q); onClose(); }}>✦ AI se poochein</button>
            <a className="ghost linkbtn" href={`https://www.google.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">🌐 Web par dhoondein</a>
          </div>
        )}
        <div className="search-list">
          {hits.map((m, i) => {
            const at = m.content.toLowerCase().indexOf(q.toLowerCase());
            const snip = m.content.slice(Math.max(0, at - 50), at + 120);
            return (
              <div key={i} className="search-hit">
                <small>{m.role === "user" ? "Aap" : "Faheem AI"} · {m.where}</small>
                <p>{at > 50 ? "…" : ""}{snip}…</p>
              </div>
            );
          })}
          {q.trim().length >= 2 && hits.length === 0 && <p className="muted">Chats mein nahi mila. Enter dabayein to AI se poochein.</p>}
        </div>
      </div>
    </div>
  );
}
