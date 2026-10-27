"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

  const load = useCallback(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => { setProviders(d.providers || []); setAgents(d.agents || []); }).catch(() => {});
  }, []);
  useEffect(() => {
    setPrefs(loadPrefs()); load();
    const s = window.speechSynthesis;
    if (s) { const f = () => setVoices(s.getVoices()); f(); s.onvoiceschanged = f; }
  }, [load]);

  const set = (k, v) => { const p = { ...prefs, [k]: v }; setPrefs(p); savePrefs(p); setSaved("Save ✓"); setTimeout(() => setSaved(""), 1200); };

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
        <Link href="/" className="icon-btn" title="Wapas chat">←</Link>
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> Options</div>
        <div className="top-actions"><span className="ok-text">{saved}</span><ThemeBalls /></div>
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
