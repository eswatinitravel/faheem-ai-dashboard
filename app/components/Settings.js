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
      setForm({ GROQ_MODEL: d.GROQ_MODEL, GEMINI_MODEL: d.GEMINI_MODEL, OPENROUTER_MODEL: d.OPENROUTER_MODEL, OLLAMA_MODEL: d.OLLAMA_MODEL, OLLAMA_ENABLED: d.OLLAMA_ENABLED || "true", FREE_ENABLED: d.FREE_ENABLED || "true" });
    });
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const [err, setErr] = useState("");
  const PREFIX = { GROQ_API_KEY: "gsk_", GEMINI_API_KEY: "AIza", OPENROUTER_API_KEY: "sk-or-" };
  async function save() {
    // Browser kabhi kabhi apna saved password key ke khane mein bhar deta hai; ghalat shakal wali key save na karein.
    for (const [k, pre] of Object.entries(PREFIX)) {
      const v = (form[k] || "").trim();
      if (v && !v.startsWith(pre)) { setErr(`${k.split("_")[0]} key "${pre}…" se shuru honi chahiye — yeh key save nahi ki.`); return; }
    }
    setErr("");
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
        <p className="muted">Ab chat bina kisi key ke bhi chalti hai (free pipeline). Keys optional hain: lagayein to tez aur zyada limit. Keys sirf isi laptop par save hoti hain.</p>
        {!cfg && <p className="muted">Loading…</p>}
        {cfg && PROVIDERS.map((p) => (
          <div key={p.key} className="field">
            <div className="field-head">
              <b>{p.name}</b>
              <a href={p.url} target="_blank" rel="noreferrer">Free key banayein ↗</a>
            </div>
            <small className="muted">{p.note} {cfg[p.key]?.set ? `Abhi lagi hui: ${cfg[p.key].preview}` : "Abhi koi key nahi."}</small>
            <input type="password" name={`fa-${p.key}`} autoComplete="new-password" data-lpignore="true" placeholder={cfg[p.key]?.set ? "Nayi key (khali = purani rahe)" : "Key yahan paste karein"} onChange={set(p.key)} />
            <input placeholder={`Model (default: ${p.def})`} value={form[p.model] || ""} onChange={set(p.model)} />
          </div>
        ))}
        {cfg && (
          <div className="field">
            <div className="field-head"><b>Free pipeline (bina key) ✓</b></div>
            <small className="muted">Pollinations + LLM7: koi key nahi chahiye. Key wale brains busy hon ya na hon to yeh khud jawab dete hain. Dyad ke liye custom provider: Base URL http://localhost:3000/api/v1 , key: free , model: faheem-free</small>
            <select value={form.FREE_ENABLED || "true"} onChange={set("FREE_ENABLED")}>
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </div>
        )}
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
          <span className="ok-text">{saved}</span>{err && <span style={{ color: "#f87171" }}>{err}</span>}
          {cfg?._file && <small className="muted">Keys yahan mehfooz: {cfg._file}</small>}
          <button onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
