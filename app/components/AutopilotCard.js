"use client";
import { useEffect, useState } from "react";

// v3.20 Model Autopilot (Linger se idea): laptop dekh kar sahi local model, ek click install + use.
export default function AutopilotCard() {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    try { const r = await fetch("/api/autopilot", { cache: "no-store" }).then((x) => x.json()); if (r.ok) setD(r); else setMsg(r.error); } catch (e) { setMsg(e.message); }
  }
  useEffect(() => { if (open && !d) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(action, model) {
    setBusy(action + model); setMsg(action === "pull" ? `${model} download ho raha hai (kuch minute lag sakte hain)...` : "");
    try {
      const r = await fetch("/api/autopilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, model }) }).then((x) => x.json());
      setMsg(r.ok ? (action === "pull" ? `${model} install ho gaya.` : `Ab Ollama brain ${model} chalaye ga.`) : r.error);
      await load();
    } catch (e) { setMsg(e.message); }
    setBusy("");
  }

  const row = (m, has) => m && (
    <div className="gh-row" key={m}>
      <div className="gh-main"><b>{m}</b><small className="muted">{has ? "Laptop par laga hai" : "Abhi nahi laga"}{d?.current === m ? " · abhi yehi chal raha" : ""}</small></div>
      {!has && <button type="button" className="ghost" disabled={!!busy || !d?.ollama.running} onClick={() => post("pull", m)}>{busy === "pull" + m ? "Download..." : "Install"}</button>}
      {has && d?.current !== m && <button type="button" className="ghost" disabled={!!busy} onClick={() => post("use", m)}>Use karo</button>}
    </div>
  );

  return (
    <section className="card panel autopilot" data-autopilot>
      <div className="btnrow">
        <b>Model Autopilot</b>
        <small className="muted">laptop ke hisaab se behtareen local model</small>
        <button type="button" className="ghost" onClick={() => (open ? load() : setOpen(true))}>{open ? "Dobara check" : "Check karo"}</button>
      </div>
      {open && !d && !msg && <p className="muted">Laptop check ho raha hai...</p>}
      {d && <>
        <p className="muted">
          RAM {d.hw.ramGb} GB{d.hw.gpu ? ` · GPU ${d.hw.gpu.name} (${d.hw.gpu.vramGb} GB)` : d.hw.apple ? " · Apple chip" : " · GPU nahi mila"} · {d.hw.cores} cores.
          {" "}Mashwara: <b>{d.rec.model}</b> ({d.rec.why}, {d.rec.speed}).
        </p>
        {!d.ollama.running && <p className="muted">Ollama chalu nahi. <a href="https://ollama.com/download" target="_blank" rel="noreferrer">ollama.com/download</a> se install karke kholein, phir "Dobara check".</p>}
        {row(d.rec.model, d.installed.model)}
        {row(d.rec.coder, d.installed.coder)}
        {d.ollama.models.length > 0 && <small className="muted">Laptop par: {d.ollama.models.map((m) => `${m.name} (${m.gb} GB)`).join(", ")}</small>}
      </>}
      {msg && <p className="muted">{msg}</p>}
    </section>
  );
}
