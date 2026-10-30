"use client";
import { useEffect, useRef, useState } from "react";

// v3.11 Auto Setup: har free brain ek pipeline mein. Key page kholein -> "Create key" -> copy ->
// wapas aayein: clipboard se key khud uthti hai, brain khud pehchana jata hai, live test hota hai aur save.
export default function Settings({ onClose }) {
  const [brains, setBrains] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState({});
  const [paste, setPaste] = useState("");
  const [pick, setPick] = useState("");
  const [cfAcc, setCfAcc] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [tests, setTests] = useState({});
  const waiting = useRef(null);

  const load = () => {
    fetch("/api/keys").then((r) => r.json()).then((d) => setBrains(d.brains || []));
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      setCfg(d);
      setForm({ OLLAMA_MODEL: d.OLLAMA_MODEL, OLLAMA_ENABLED: d.OLLAMA_ENABLED || "true", FREE_ENABLED: d.FREE_ENABLED || "true" });
      setCfAcc(d.CLOUDFLARE_ACCOUNT_ID || "");
    });
  };
  useEffect(load, []);

  async function auto(key, id) {
    const k = String(key || "").trim();
    if (!k) return;
    setBusy("auto"); setMsg("Key pehchaan raha hoon aur test kar raha hoon…");
    const r = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "auto", key: k, id: id || pick || undefined, needs: cfAcc ? { CLOUDFLARE_ACCOUNT_ID: cfAcc } : undefined }) }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }));
    setBusy("");
    if (r.ok) { setMsg(`✓ ${r.name} jur gaya (${r.preview}), model: ${r.model}. Pipeline mein shamil.`); setPaste(""); load(); }
    else setMsg("✕ " + (r.error || "nahi chala"));
  }

  // Key page se wapas aane par clipboard khud parhein (sirf jab aap ne "Key banayein" dabaya ho).
  useEffect(() => {
    const onFocus = async () => {
      if (!waiting.current) return;
      const id = waiting.current;
      try {
        const t = (await navigator.clipboard.readText()).trim();
        if (t && t.length >= 20 && !/\s/.test(t)) { waiting.current = null; setPaste(t); auto(t, id); }
      } catch { /* clipboard ki ijazat nahi: user khud paste kare */ }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  });

  const openKey = (b) => { waiting.current = b.id; setPick(b.id); setMsg(`${b.name} ka page khul gaya. Wahan key banayein aur Copy karein, phir is window par wapas aayein — baqi main khud kar loon ga.`); window.open(b.keyUrl, "_blank", "noopener"); };

  async function nextMissing() {
    const b = (brains || []).find((x) => !x.set && !x.keyless);
    if (b) openKey(b); else setMsg("Sab key wale brains jur chuke hain ✓");
  }

  async function test(id) {
    setTests((t) => ({ ...t, [id]: "…" }));
    const r = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", id }) }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }));
    setTests((t) => ({ ...t, [id]: r.ok ? `✓ ${(r.ms / 1000).toFixed(1)}s` : `✕ ${String(r.error).slice(0, 90)}` }));
  }
  async function testAll() { for (const b of brains.filter((x) => x.active)) await test(b.id); }

  async function remove(id) {
    await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", id }) });
    load();
  }

  async function save() {
    const body = { ...form, CLOUDFLARE_ACCOUNT_ID: cfAcc };
    // Tool key: sirf tab bhejein jab kuch likha ho (khali = purani key rehti hai; "Hatayein" alag).
    if (!String(body.TWENTYFIRST_API_KEY || "").trim()) delete body.TWENTYFIRST_API_KEY;
    for (const b of brains || []) if (form[`${b.id.toUpperCase()}_MODEL`] !== undefined) body[`${b.id.toUpperCase()}_MODEL`] = form[`${b.id.toUpperCase()}_MODEL`];
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMsg("Save ho gaya ✓");
    setTimeout(onClose, 700);
  }

  const done = (brains || []).filter((b) => b.set).length;
  const keyedCount = (brains || []).filter((b) => !b.keyless).length;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Brains & Keys</h2>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <p className="muted">Ek pipeline, {brains ? brains.length + 1 : "…"} free brains. Jo brain limit par ho, agla khud jawab deta hai. Keys sirf isi laptop par save hoti hain.</p>

        <div className="field">
          <div className="field-head"><b>⚡ Auto Setup</b><small className="muted">{done}/{keyedCount} keys lagi hain</small></div>
          <small className="muted">Koi bhi key paste karein: brain khud pehchana jayega, test hoga aur save. Ya "Agla key page" dabayein, key copy karke wapas aayein.</small>
          <input type="password" autoComplete="new-password" data-lpignore="true" placeholder="Kisi bhi brain ki key yahan paste karein" value={paste} onChange={(e) => setPaste(e.target.value)} onPaste={(e) => { const t = e.clipboardData.getData("text"); setTimeout(() => auto(t), 50); }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Brain: khud pehchano</option>
              {(brains || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button disabled={!!busy} onClick={() => auto(paste)}>{busy ? "Test ho raha…" : "Jorein"}</button>
            <button onClick={nextMissing}>Agla key page ↗</button>
            <button onClick={testAll}>Sab test karein</button>
          </div>
          {msg && <small style={{ color: msg.startsWith("✕") ? "#f87171" : undefined }}>{msg}</small>}
        </div>

        {!brains && <p className="muted">Loading…</p>}
        {brains && brains.map((b) => (
          <div key={b.id} className="field">
            <div className="field-head">
              <b>{b.active ? "🟢" : b.keyless ? "⚪" : "⚫"} {b.name}</b>
              <a href={b.keyUrl} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); openKey(b); }}>{b.keyless ? "Key (optional) ↗" : "Key banayein ↗"}</a>
            </div>
            <small className="muted">{b.note}{b.signup ? ` Signup: ${b.signup}.` : ""} {b.set ? `Lagi hui: ${b.preview}` : b.keyless ? "Bina key chal raha." : "Abhi key nahi."} {b.cooling ? "⏳ limit par, thori der baad." : ""}</small>
            {b.needs && <input placeholder="Cloudflare Account ID (dashboard ke right side par)" value={cfAcc} onChange={(e) => setCfAcc(e.target.value)} />}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input style={{ flex: 1, minWidth: 160 }} placeholder={`Model: ${b.model}`} value={form[`${b.id.toUpperCase()}_MODEL`] ?? ""} onChange={(e) => setForm({ ...form, [`${b.id.toUpperCase()}_MODEL`]: e.target.value })} />
              {b.active && <button onClick={() => test(b.id)}>Test</button>}
              {b.set && <button onClick={() => remove(b.id)}>Hatayein</button>}
              {tests[b.id] && <small>{tests[b.id]}</small>}
            </div>
          </div>
        ))}

        {cfg && (
          <div className="field">
            <div className="field-head"><b>Bina key wale brains</b></div>
            <small className="muted">Kilo, OVH, LLM7: koi key nahi chahiye (Pollinations ab free key mangta hai), aakhir mein khud jawab dete hain. Dyad: Base URL http://localhost:3000/api/v1 , key: free , model: faheem-free</small>
            <select value={form.FREE_ENABLED || "true"} onChange={(e) => setForm({ ...form, FREE_ENABLED: e.target.value })}>
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </div>
        )}
        {cfg && (
          <div className="field">
            <div className="field-head"><b>Ollama (laptop, bina limit)</b><a href="https://ollama.com/download" target="_blank" rel="noreferrer">Download ↗</a></div>
            <select value={form.OLLAMA_ENABLED || "true"} onChange={(e) => setForm({ ...form, OLLAMA_ENABLED: e.target.value })}>
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
            <input placeholder="Model (default: llama3.2:3b)" value={form.OLLAMA_MODEL || ""} onChange={(e) => setForm({ ...form, OLLAMA_MODEL: e.target.value })} />
          </div>
        )}
        {cfg && (
          <div className="field" data-tool-keys>
            <div className="field-head"><b>Tool keys (brain nahi)</b><a href="https://21st.dev/mcp" target="_blank" rel="noreferrer">21st key ↗</a></div>
            <small className="muted">21st MCP (UI components): optional. {cfg.TWENTYFIRST_API_KEY?.set ? `Lagi hui: ${cfg.TWENTYFIRST_API_KEY.preview}` : "Abhi key nahi."} Test: Skills → 21st MCP.</small>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label htmlFor="k21" className="sr">21st API key</label>
              <input id="k21" style={{ flex: 1, minWidth: 160 }} type="password" autoComplete="new-password" data-lpignore="true" placeholder="TWENTYFIRST_API_KEY" value={form.TWENTYFIRST_API_KEY || ""} onChange={(e) => setForm({ ...form, TWENTYFIRST_API_KEY: e.target.value })} />
              {cfg.TWENTYFIRST_API_KEY?.set && <button onClick={async () => { await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ TWENTYFIRST_API_KEY: "" }) }); load(); }}>Hatayein</button>}
            </div>
          </div>
        )}
        <div className="modal-foot">
          {cfg?._file && <small className="muted">Keys yahan mehfooz: {cfg._file}</small>}
          <button onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
