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

// Free image server kabhi "busy" hota hai: pictures baari baari, aur fail ho to khud dobara.
function ImageCard({ url, i, onOpen }) {
  const [ok, setOk] = useState(false);
  const [tries, setTries] = useState(0);
  const [src, setSrc] = useState(null);
  useEffect(() => { const t = setTimeout(() => setSrc(url), i * 4000); return () => clearTimeout(t); }, [url, i]);
  function retry() {
    if (tries >= 5) return;
    setTimeout(() => { setTries((n) => n + 1); setSrc(url + "&r=" + Date.now()); }, 11000);
  }
  return (
    <div className={"ws-img" + (ok ? " ok" : "")} onClick={() => ok && onOpen(src)} role="button">
      {!ok && <div className="ws-shimmer"><span>{tries ? `Server busy — dobara try ${tries}/5…` : `Ban rahi hai… ${i + 1}`}</span></div>}
      {src && <img src={src} alt="" onLoad={() => setOk(true)} onError={retry} />}
    </div>
  );
}

// Preview ke andar bhi tooti pictures khud dobara load hon.
const IMG_RETRY = `<script>(function(){function fix(img){var n=+(img.dataset.r||0);if(n>=5)return;img.dataset.r=n+1;setTimeout(function(){var u=img.src.split("&r=")[0];img.src=u+(u.indexOf("?")<0?"?":"&")+"r="+Date.now();},6000+n*5000);}document.addEventListener("error",function(e){if(e.target&&e.target.tagName==="IMG")fix(e.target);},true);var imgs=document.getElementsByTagName("img");for(var i=0;i<imgs.length;i++){(function(im,k){if(/pollinations/.test(im.getAttribute("src")||"")&&k>1){var s=im.getAttribute("src");im.removeAttribute("src");setTimeout(function(){im.src=s;},k*2500);}})(imgs[i],i);}})();<\/script>`;
function withRetry(html) {
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, IMG_RETRY + "</body>") : html + IMG_RETRY;
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
  const att = (job?.attached || []).filter((a) => (a.kind === "image" && a.dataUrl) || (a.kind === "video" && a.url));
  const [tab, setTab] = useState(null);
  const [big, setBig] = useState(null);
  useEffect(() => { setTab(null); }, [job?.task, job?.busy]);
  const auto = site ? "site" : html ? "html" : job?.video ? "video" : job?.images ? "image" : att.length && job?.busy ? "attached" : job?.reply ? "text" : "wait";
  const view = tab && ((tab === "html" && html) || (tab === "image" && job?.images)) ? tab : auto;

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

      {html && job?.images && !site && (
        <div className="ws-tabs">
          <button className={view === "html" ? "on" : ""} onClick={() => setTab("html")}>🌐 Website</button>
          <button className={view === "image" ? "on" : ""} onClick={() => setTab("image")}>🖼 Pictures</button>
        </div>
      )}
      {big && <div className="ws-big" onClick={() => setBig(null)}><img src={big} alt="" /><small>Band karne ke liye click · <a href={big} download target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Download</a></small></div>}
      <div className="ws-stage">
        {view === "wait" && <div className="ws-wait"><div className="ws-orb" /><span>Agents kaam shuru kar rahe hain…</span></div>}
        {view === "attached" && (
          <div className="ws-grid">
            {att.map((a, i) => a.kind === "image" ? <div key={i} className="ws-img ok scan"><img src={a.dataUrl} alt="" /></div> : <video key={i} className="ws-vid" src={a.url} controls autoPlay muted loop />)}
            <small className="muted">Agents aap ki file dekh rahe hain…</small>
          </div>
        )}
        {view === "image" && <div className="ws-grid">{job.images.map((u, i) => <ImageCard key={u} url={u} i={i} onOpen={setBig} />)}</div>}
        {view === "video" && <Storyboard urls={job.video} />}
        {view === "html" && <iframe className="ws-frame" title="Live preview" srcDoc={withRetry(html)} sandbox="allow-scripts allow-forms allow-modals" />}
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
