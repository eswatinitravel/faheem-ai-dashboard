"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";

export const fmtSize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(0.1, n / 1024).toFixed(1)} KB`);

// v3.16 Project Builder ZIP: chat mein download card (naam, size, files, sachcha test result).
export default function ZipCard({ card, onDelete }) {
  if (!card) return null;
  const ok = card.tests?.ok === true;
  return (
    <div className={"zipcard " + (ok ? "ok" : "fail")} data-zip-card data-zip-ok={ok ? "1" : "0"}>
      <div className="zc-head"><Icon name="box" size={16} /> <b data-zip-name>{card.name}.zip</b></div>
      <div className="zc-meta muted"><span data-zip-size>{fmtSize(card.size)}</span> · <span data-zip-files>{card.files} files</span> · <span>{card.stack}</span></div>
      <div className={"zc-status " + (ok ? "ok" : "fail")} data-zip-status><Icon name={ok ? "check" : "alert"} size={14} /> {card.label}</div>
      {!ok && card.tests?.issues?.length > 0 && <ul className="zc-issues">{card.tests.issues.slice(0, 4).map((i) => <li key={i}>{i}</li>)}</ul>}
      {card.secretsRemoved > 0 && <small className="muted">{card.secretsRemoved} key code se hata di gayi (ZIP mein asli key nahi).</small>}
      <div className="zc-actions">
        <a className="btn" href={card.download} download={`${card.name}.zip`} data-zip-download><Icon name="download" size={14} /> ZIP download</a>
        <a className="btn ghost" href="/agent" title="Agent Mode mein project kholo" onClick={() => { try { localStorage.setItem("faheem-agent-project", card.project); } catch {} }}><Icon name="bot" size={14} /> Agent Mode</a>
        {onDelete && <button type="button" className="ghost" data-zip-delete onClick={() => onDelete(card.id)}><Icon name="trash" size={14} /> Hatao</button>}
      </div>
    </div>
  );
}

// ZIP history: dobara download ya hatao.
export function ZipHistory() {
  const [zips, setZips] = useState([]);
  const load = useCallback(() => fetch("/api/agent/zip").then((r) => r.json()).then((d) => setZips(d.zips || [])).catch(() => setZips([])), []);
  useEffect(() => { load(); const h = () => load(); window.addEventListener("faheem-zip-changed", h); return () => window.removeEventListener("faheem-zip-changed", h); }, [load]);
  const del = async (id) => { if (!confirm("Yeh ZIP hata dein?")) return; await fetch(`/api/agent/zip?id=${encodeURIComponent(id)}`, { method: "DELETE" }); load(); };
  return (
    <div className="ziphistory" data-zip-history>
      <div className="side-title"><Icon name="box" size={14} /> ZIP history</div>
      {zips.length === 0 && <small className="muted">Abhi koi ZIP nahi. Chat mein likhein: "todo website bana kar zip do".</small>}
      {zips.slice(0, 30).map((z) => (
        <div key={z.id} className="zh-row" data-zip-row>
          <span className={"zh-dot " + (z.tests?.ok ? "ok" : "fail")} title={z.label} />
          <span className="zh-name" title={new Date(z.at).toLocaleString()}>{z.name} <small className="muted">{fmtSize(z.size)}</small></span>
          <a className="icon-btn" href={z.download} download={`${z.name}.zip`} title="Dobara download" aria-label="Dobara download"><Icon name="download" size={13} /></a>
          <button type="button" className="icon-btn" title="Hatao" aria-label="ZIP hatao" onClick={() => del(z.id)}><Icon name="trash" size={13} /></button>
        </div>
      ))}
    </div>
  );
}
