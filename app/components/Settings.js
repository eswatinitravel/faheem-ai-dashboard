"use client";
import { useEffect, useState } from "react";

const PROVIDERS = [
  { key: "GROQ_API_KEY", model: "GROQ_MODEL", def: "openai/gpt-oss-120b", name: "Groq", note: "Chat + voice. Free, bina card.", url: "https://console.groq.com/keys" },
  { key: "GEMINI_API_KEY", model: "GEMINI_MODEL", def: "gemini-flash-latest", name: "Google Gemini", note: "Extra free limit.", url: "https://aistudio.google.com/apikey" },
  { key: "OPENROUTER_API_KEY", model: "OPENROUTER_MODEL", def: "google/gemma-4-26b-a4b-it:free", name: "OpenRouter", note: "Sirf :free models.", url: "https://openrouter.ai/keys" },
];

export default function Settings({ onClose }) {
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      setCfg(d);
      setForm({ GROQ_MODEL: d.GROQ_MODEL, GEMINI_MODEL: d.GEMINI_MODEL, OPENROUTER_MODEL: d.OPENROUTER_MODEL, OLLAMA_MODEL: d.OLLAMA_MODEL, OLLAMA_ENABLED: d.OLLAMA_ENABLED || "true" });
    });
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaved("Save ho gaya ✓");
    setTimeout(onClose, 700);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <p className="muted">Keys sirf isi laptop par save hoti hain. Jitni zyada keys, utni zyada free limit.</p>
        {!cfg && <p className="muted">Loading…</p>}
        {cfg && PROVIDERS.map((p) => (
          <div key={p.key} className="field">
            <div className="field-head">
              <b>{p.name}</b>
              <a href={p.url} target="_blank" rel="noreferrer">Free key banayein ↗</a>
            </div>
            <small className="muted">{p.note} {cfg[p.key]?.set ? `Abhi lagi hui: ${cfg[p.key].preview}` : "Abhi koi key nahi."}</small>
            <input type="password" placeholder={cfg[p.key]?.set ? "Nayi key (khali = purani rahe)" : "Key yahan paste karein"} onChange={set(p.key)} autoComplete="off" />
            <input placeholder={`Model (default: ${p.def})`} value={form[p.model] || ""} onChange={set(p.model)} />
          </div>
        ))}
        {cfg && (
          <div className="field">
            <div className="field-head"><b>Ollama (laptop, bina limit)</b><a href="https://ollama.com/download" target="_blank" rel="noreferrer">Download ↗</a></div>
            <select value={form.OLLAMA_ENABLED || "true"} onChange={set("OLLAMA_ENABLED")}>
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
            <input placeholder="Model (default: llama3.2:3b)" value={form.OLLAMA_MODEL || ""} onChange={set("OLLAMA_MODEL")} />
          </div>
        )}
        <div className="modal-foot">
          <span className="ok-text">{saved}</span>
          <button onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
