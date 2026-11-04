"use client";
import { useState } from "react";
import Icon from "./Icon";

// v3.15 Project research card: milte-julte products, extra features, stack. User tick kare, phir Build — ya Skip.
export default function ResearchCard({ r, onBuild, onSkip, onClose }) {
  const d = r.data;
  const [feat, setFeat] = useState({});
  const [stack, setStack] = useState("");
  const picked = Object.keys(feat).filter((k) => feat[k]);
  const build = () => onBuild([picked.length ? `Yeh extra features bhi daalein: ${picked.join(", ")}.` : "", stack ? `Stack: ${stack}.` : ""].filter(Boolean).join("\n"), picked);
  return (
    <div className="msg assistant research" data-research-card>
      <div className="bubble">
        <div className="rc-head"><Icon name="lightbulb" size={16} /> <b>{r.assistant ? "Private assistant: is hafte ki research" : "Banane se pehle chhoti research"}</b><button type="button" className="icon-btn rc-x" aria-label="Band karein" onClick={onClose}><Icon name="x" size={14} /></button></div>
        {r.loading && <p className="muted">Milte-julte products aur behtar features dhoond raha hoon…</p>}
        {!r.loading && !d && <p className="muted">Research nahi ho saki — seedha bana sakte hain.</p>}
        {d && <>
          <p className="muted">{d.kind}{d.summary ? ` — ${d.summary}` : ""}</p>
          {r.assistant && d.trending?.length > 0 && <div className="rc-col" data-research-trending><b>GitHub trending (is hafta)</b><ul>{d.trending.map((x) => <li key={x.repo}>{x.repo}{x.desc ? ` - ${x.desc.slice(0, 80)}` : ""}</li>)}</ul></div>}
          <div className="rc-col"><b>{r.assistant ? "Top personal assistants" : "Milte-julte products"}</b><ul>{d.similar.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="rc-col"><b>{r.assistant ? "Sab se zyada maange gaye features (tick karein)" : "Extra features (tick karein)"}</b>
            {d.features.map((f) => <label key={f} className="toggle"><input type="checkbox" data-research-feature checked={!!feat[f]} onChange={(e) => setFeat({ ...feat, [f]: e.target.checked })} /> {f}</label>)}
          </div>
          <div className="rc-col"><b>Programming stack</b>
            {d.stack.map((x) => <label key={x} className="toggle"><input type="radio" name="rc-stack" data-research-stack checked={stack === x} onChange={() => setStack(x)} /> {x}</label>)}
          </div>
          <small className="muted">Sources: {d.sources.join(", ")}</small>
        </>}
        <div className="rc-actions">
          <button type="button" data-research-build disabled={r.loading} onClick={build}><Icon name="play" size={14} /> Build {picked.length ? `(${picked.length} extra)` : ""}</button>
          <button type="button" className="ghost" data-research-skip onClick={onSkip}>Skip — seedha banao</button>
        </div>
      </div>
    </div>
  );
}
