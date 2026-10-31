"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Settings from "../components/Settings";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";
import VersionBadge from "../components/VersionBadge";
import { loadPrefs, savePrefs } from "../../lib/prefs";

// Doosra page: saare options yahan, front page sirf chat ke liye saaf.
export default function Options() {
  const [prefs, setPrefs] = useState(null);
  const [providers, setProviders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [voices, setVoices] = useState([]);
  const [showKeys, setShowKeys] = useState(false);
  const [saved, setSaved] = useState("");
  const [mem, setMem] = useState(null); // v3.13 Memory settings (server, ~/.faheem-ai/memory)

  const load = useCallback(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => { setProviders(d.providers || []); setAgents(d.agents || []); }).catch(() => {});
  }, []);
  useEffect(() => {
    setPrefs(loadPrefs()); load();
    fetch("/api/memory").then((r) => r.json()).then((d) => setMem(d.settings ? { ...d.settings, total: d.stats?.total || 0 } : null)).catch(() => {});
    const s = window.speechSynthesis;
    if (s) { const f = () => setVoices(s.getVoices()); f(); s.onvoiceschanged = f; }
  }, [load]);

  const set = (k, v) => { const p = { ...prefs, [k]: v }; setPrefs(p); savePrefs(p); setSaved("Save ✓"); setTimeout(() => setSaved(""), 1200); };

  async function setMemory(enabled) {
    const d = await fetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "settings", settings: { enabled } }) }).then((r) => r.json()).catch(() => ({}));
    if (d.ok) { setMem((m) => ({ ...m, ...d.settings })); setSaved("Save ✓"); setTimeout(() => setSaved(""), 1200); }
  }

  function testVoice() {
    const s = window.speechSynthesis; if (!s) return;
    const en = prefs.voiceChoice === "english";
    const u = new SpeechSynthesisUtterance(en ? "Hello Faheem, this is your dashboard voice." : "السلام علیکم فہیم، میں آپ کا اے آئی ڈیش بورڈ ہوں۔");
    const v = s.getVoices();
    const ur = v.filter((x) => x.lang.toLowerCase().startsWith("ur"));
    const pick = en ? v.find((x) => x.lang.startsWith("en")) : prefs.voiceChoice === "urdu-male" ? ur.find((x) => /Asad|male/i.test(x.name) && !/female/i.test(x.name)) || ur[0] : ur.find((x) => /Uzma|female/i.test(x.name)) || ur[0];
    if (pick) { u.voice = pick; u.lang = pick.lang; }
    s.cancel(); s.speak(u);
  }

  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> Options</div>
        <div className="top-actions"><span className="ok-text">{saved}</span><Link href="/brains" className="icon-btn" title="Brains Rooms (status lights)" aria-label="Brains"><Icon name="users" /></Link><Link href="/skills" className="icon-btn" title="Skills" aria-label="Skills"><Icon name="grid" /></Link><Link href="/memory" className="icon-btn" title="Yaad-dasht (Memory)" aria-label="Memory"><Icon name="brain" /></Link><Link href="/gallery" className="icon-btn" title="Gallery" aria-label="Gallery"><Icon name="image" /></Link><Link href="/flights" className="icon-btn" title="Flights" aria-label="Flights"><Icon name="globe" /></Link><ThemeBalls /></div>
      </header>

      {prefs && (
        <div className="optgrid">
          <section className="card panel">
            <h3>🧠 Master Agent</h3>
            <select value={prefs.agent} onChange={(e) => set("agent", e.target.value)}>
              <option value="auto">Auto: Master khud chune</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
            <div className="agents">{agents.filter((a) => a.id !== "general").map((a) => <span key={a.id} className="agent-chip">{a.icon} {a.name.replace(" Master", "")}</span>)}</div>
          </section>

          <section className="card panel">
            <h3>⚡ Brain (AI)</h3>
            <select value={prefs.provider} onChange={(e) => set("provider", e.target.value)}>
              <option value="auto">Auto (best available)</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="plist">
              {providers.map((p) => (
                <div key={p.id} className="pitem"><span className={"led " + (p.cooling ? "warn" : "ok")} /><div><b>{p.name}</b><small>{p.model}{p.keyless ? " · bina key" : ""}</small></div></div>
              ))}
            </div>
            <button className="ghost" onClick={() => setShowKeys(true)}>⚙ Keys / Free pipeline settings</button>
          </section>

          <section className="card panel" data-opt="team">
            <h3>👥 Agent Team (Team mode)</h3>
            <label className="toggle"><input type="checkbox" checked={!!prefs.teamMode} onChange={(e) => set("teamMode", e.target.checked)} data-team-option /><span>Agent Mode mein bare kaam team se: Designer → Coder → Tester → Reviewer</span></label>
            <small className="muted">Default band. Sirf website/store/kai files wale kaam. Har role apna free brain; max 3 rounds, ~60k token aur 10 calls ki had (free limit bachat). Brains limit par hon to khud purana single Agent Mode chalta hai. Board: project folder mein team.json.</small>
          </section>

          <section className="card panel" data-opt="memory">
            <h3>🧠 Yaad-dasht (Memory)</h3>
            {mem ? <label className="toggle"><input type="checkbox" checked={mem.enabled !== false} onChange={(e) => setMemory(e.target.checked)} data-memory-option /><span>{mem.enabled !== false ? `On · ${mem.total} yaadein · max ${mem.maxTokens} tokens prompt mein` : "Band"}</span></label> : <small className="muted">Load ho raha hai…</small>}
            <small className="muted">Pasand (Roman Urdu, design), project khulase aur ghalti → hal seekh. Sirf isi laptop par (~/.faheem-ai/memory), update se nahi mitti.</small>
            <Link className="ghost linkbtn" href="/memory">Memory kholein — dekhein, badlein, export/import</Link>
          </section>

          <section className="card panel">
            <h3>🖥 Display: 4K / 8K / 3D</h3>
            <label className="muted">Render quality</label>
            <select value={prefs.quality} onChange={(e) => set("quality", e.target.value)}>
              <option value="auto">Auto (screen ke mutabiq)</option>
              <option value="hd">HD (sab se halka, purane laptop ke liye)</option>
              <option value="4k">4K Ultra (3840px saaf render)</option>
              <option value="8k">8K Extreme (7680px, sirf taqatwar GPU)</option>
            </select>
            <label className="muted">3D orb (Three.js)</label>
            <select value={prefs.fx3d} onChange={(e) => set("fx3d", e.target.value)}>
              <option value="off">Band</option>
              <option value="normal">3D On</option>
              <option value="ultra">3D Ultra (zyada detail + dust)</option>
            </select>
            <label className="muted">UI size (bari 4K/8K screen ke liye)</label>
            <select value={prefs.uiScale} onChange={(e) => set("uiScale", e.target.value)}>
              {["90", "100", "125", "150", "175", "200"].map((z) => <option key={z} value={z}>{z}%</option>)}
            </select>
            {(prefs.quality === "8k" || prefs.fx3d === "ultra") && <p className="warnline">8GB laptop par 8K / 3D Ultra garam aur dheema ho sakta hai. Masla ho to HD ya Auto chunein.</p>}
          </section>

          <section className="card panel">
            <h3>🎙 Awaz</h3>
            <label className="toggle"><input type="checkbox" checked={prefs.speakReplies} onChange={(e) => set("speakReplies", e.target.checked)} /><span>Voice mode mein jawab bol kar sunao</span></label>
            <select value={prefs.voiceChoice} onChange={(e) => set("voiceChoice", e.target.value)}>
              <option value="urdu-female">🇵🇰 Urdu — Uzma (aurat)</option>
              <option value="urdu-male">🇵🇰 Urdu — Asad (mard)</option>
              <option value="english">English awaz</option>
            </select>
            {prefs.voiceChoice !== "english" && voices.length > 0 && !voices.some((v) => v.lang.toLowerCase().startsWith("ur")) && <small className="warnline">Urdu awaz nahi mili — app ko Microsoft Edge mein kholein.</small>}
            <button className="ghost" onClick={testVoice}>▶ Awaz test karein</button>
            <small className="muted">Voice (bol kar likhwana) ke liye Groq key chahiye.</small>
          </section>

          <section className="card panel">
            <h3>🌐 Meri websites</h3>
            <Link className="sitecard" href="/?live=vestire">
              <img src="/sites/vestire/img/panel-men.jpg" alt="" />
              <div><b>Vestire Collection</b><span>Live workspace mein kholein</span></div>
            </Link>
            <a className="ghost linkbtn" href="/sites/vestire/index.html" target="_blank" rel="noreferrer">↗ Naye tab mein</a>
          </section>

          <section className="card panel">
            <h3>🚀 Startup & taskbar</h3>
            <p className="muted">Laptop on hote hi Faheem AI khud start hota hai aur neeche taskbar (ghari ke paas) mein iska icon hamesha rehta hai. Icon par double-click = app khule; right-click = Restart / Band.</p>
            <small className="muted">Band karna ho to: Windows + R → <code>shell:startup</code> → "Faheem AI" shortcut delete karein.</small>
          </section>

          <section className="card panel">
            <h3>✦ Bada kaam?</h3>
            <p className="muted">Mushkil ya lamba kaam Hark se karwayein.</p>
            <a className="ghost linkbtn" href="https://hark.com" target="_blank" rel="noreferrer">Hark kholein ↗</a>
            <button className="ghost" onClick={() => { if (confirm("Saari chats mita dein?")) { localStorage.removeItem("faheem-ai-chats-v2"); localStorage.removeItem("faheem-ai-archive"); setSaved("Chats saaf ✓"); } }}>🗑 Saari chats mitayein</button>
          </section>
        </div>
      )}
      <VersionBadge />
      {showKeys && <Settings onClose={() => { setShowKeys(false); load(); }} />}
    </main>
  );
}
