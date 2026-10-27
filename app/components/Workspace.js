"use client";
import { useEffect, useRef, useState } from "react";

// Live workspace (left 25%): jo ban raha hai woh upar dikhta hai, neeche chhote harfon mein agents ki baat-cheet.
const SITES = [
  { label: "Vestire · Home", url: "/sites/vestire/index.html" },
  { label: "Vestire · Men", url: "/sites/vestire/men.html" },
  { label: "Vestire · Women", url: "/sites/vestire/women.html" },
  { label: "Vestire · Juniors", url: "/sites/vestire/kids.html" },
];

function extractHtml(text) {
  const m = text?.match(/```html\n?([\s\S]*?)```/i);
  return m ? m[1] : null;
}

function ImageCard({ url, i }) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <a className={"ws-img" + (ok ? " ok" : "")} href={url} target="_blank" rel="noreferrer">
      {!ok && !err && <div className="ws-shimmer"><span>Ban rahi hai… {i + 1}</span></div>}
      {err && <div className="ws-shimmer"><span>Server busy — ⟳ dobara</span></div>}
      <img src={url} alt="" onLoad={() => setOk(true)} onError={() => setErr(true)} />
    </a>
  );
}

function Storyboard({ urls }) {
  const [f, setF] = useState(0);
  const [loaded, setLoaded] = useState(0);
  useEffect(() => { const id = setInterval(() => setF((x) => (x + 1) % urls.length), 1600); return () => clearInterval(id); }, [urls]);
  return (
    <div className="ws-video">
      {urls.map((u, i) => <img key={u} src={u} alt="" className={i === f ? "on" : ""} onLoad={() => setLoaded((n) => n + 1)} />)}
      {loaded < urls.length && <div className="ws-shimmer"><span>Frames ban rahe hain… {loaded}/{urls.length}</span></div>}
      <div className="ws-frames">{urls.map((_, i) => <i key={i} className={i === f ? "on" : ""} />)}</div>
    </div>
  );
}

export default function Workspace({ job, log, onClose }) {
  const [site, setSite] = useState(null);
  const [typed, setTyped] = useState("");
  const logRef = useRef(null);
  useEffect(() => { logRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [log]);

  // Jawab ko "banta hua" dikhayein.
  useEffect(() => {
    setTyped("");
    if (!job?.reply) return;
    let i = 0;
    const src = job.reply;
    const id = setInterval(() => { i += Math.max(8, Math.round(src.length / 120)); setTyped(src.slice(0, i)); if (i >= src.length) clearInterval(id); }, 30);
    return () => clearInterval(id);
  }, [job?.reply]);

  const html = extractHtml(job?.reply);
  const view = site ? "site" : job?.video ? "video" : job?.images ? "image" : html ? "html" : job?.reply ? "text" : "wait";

  return (
    <section className="ws panel">
      <div className="ws-head">
        <span className="live-badge"><i /> LIVE</span>
        <b className="ws-title">{job?.agent ? `${job.agent.icon} ${job.agent.name}` : "Workspace"}</b>
        <select value={site || ""} onChange={(e) => setSite(e.target.value || null)} title="Website live dekhein">
          <option value="">Kaam</option>
          {SITES.map((s) => <option key={s.url} value={s.url}>{s.label}</option>)}
        </select>
        <button className="icon-btn" onClick={onClose} title="Band karein">✕</button>
      </div>

      <div className="ws-stage">
        {view === "wait" && <div className="ws-wait"><div className="ws-orb" /><span>Agents kaam shuru kar rahe hain…</span></div>}
        {view === "image" && <div className="ws-grid">{job.images.map((u, i) => <ImageCard key={u} url={u} i={i} />)}</div>}
        {view === "video" && <Storyboard urls={job.video} />}
        {view === "html" && <iframe className="ws-frame" title="Live preview" srcDoc={html} sandbox="allow-scripts" />}
        {view === "site" && <iframe className="ws-frame" title="Website" src={site} />}
        {view === "text" && <pre className="ws-typed">{typed}<span className="caret" /></pre>}
      </div>

      <div className="ws-log" ref={logRef}>
        {log.map((l, i) => (
          <div key={i} className="ws-line"><b>{l.who}</b> {l.text}</div>
        ))}
        {job?.busy && <div className="ws-line dim"><b>…</b> kaam jari hai</div>}
      </div>
    </section>
  );
}
