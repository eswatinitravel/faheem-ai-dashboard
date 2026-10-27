"use client";
import { useEffect, useRef, useState } from "react";

// Live screen: shows your websites live inside the dashboard (desktop / tablet / mobile).
const PAGES = [
  { label: "Vestire · Home", url: "/sites/vestire/index.html" },
  { label: "Vestire · Men", url: "/sites/vestire/men.html" },
  { label: "Vestire · Women", url: "/sites/vestire/women.html" },
  { label: "Vestire · Juniors", url: "/sites/vestire/kids.html" },
];
const DEVICES = [
  { id: "desktop", label: "🖥", w: "100%" },
  { id: "tablet", label: "▭", w: "768px" },
  { id: "mobile", label: "📱", w: "390px" },
];

export default function LiveScreen({ onClose }) {
  const [page, setPage] = useState(PAGES[0].url);
  const [device, setDevice] = useState("desktop");
  const [key, setKey] = useState(0);
  const [clock, setClock] = useState("");
  const frame = useRef(null);

  useEffect(() => {
    const tickClock = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tickClock();
    const id = setInterval(tickClock, 1000);
    return () => clearInterval(id);
  }, []);

  const w = DEVICES.find((d) => d.id === device)?.w || "100%";

  return (
    <section className="panel live">
      <div className="live-head">
        <span className="live-badge"><i /> LIVE</span>
        <select value={page} onChange={(e) => setPage(e.target.value)}>
          {PAGES.map((p) => <option key={p.url} value={p.url}>{p.label}</option>)}
        </select>
        <div className="seg">
          {DEVICES.map((d) => (
            <button key={d.id} className={device === d.id ? "on" : ""} onClick={() => setDevice(d.id)} title={d.id}>{d.label}</button>
          ))}
        </div>
        <button className="icon-btn" title="Reload" onClick={() => setKey((k) => k + 1)}>⟳</button>
        <a className="icon-btn" title="Naye tab mein kholein" href={page} target="_blank" rel="noreferrer">↗</a>
        <button className="icon-btn" title="Band karein" onClick={onClose}>✕</button>
      </div>
      <div className="live-stage">
        <div className="live-device" style={{ width: w }}>
          <iframe key={key + page} ref={frame} src={page} title="Live screen" />
        </div>
      </div>
      <div className="live-foot"><span>{page}</span><span>{clock}</span></div>
    </section>
  );
}
