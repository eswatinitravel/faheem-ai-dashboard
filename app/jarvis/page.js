"use client";
// v3.24 Jarvis: live awaz se baat (mic hamesha sunta, beech mein bolo to ruk jaye), mard/aurat ki alag awazen aur lehje,
// jazbaat ke hisaab se andaz, laptop control, aur upar daayen Self-Improve button.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";

const FEMALE = /(zira|hazel|susan|heera|uzma|jenny|aria|sonia|libby|neerja|natasha|clara|emma|ava|michelle|samantha|karen|moira|tessa|fiona|veena|catherine|linda|eva|kalpana|swara|female|woman|salma|sara|zira|ana\b|maisie|mia|elena|joanna|amy|kimberly|ivy|kendra|salli|raveena|aditi|kajal|aurat)/i;
const MALE = /(david|mark|george|ravi|asad|guy|ryan|thomas|prabhat|william|christopher|eric|brian|daniel|alex|fred|rishi|richard|james|sean|roger|steffan|andrew|liam|madhur|male|man\b|matthew|joey|justin|kevin|russell|arthur|oliver)/i;
const genderOf = (v) => (FEMALE.test(v.name) ? "female" : MALE.test(v.name) ? "male" : "any");
const clean = (t) => String(t || "").replace(/```[\s\S]*?```/g, " ").replace(/[*_#>`|]/g, "").replace(/\s+/g, " ").trim();
const EMO_LABEL = { neutral: "Normal", happy: "Khush", sad: "Udaas", angry: "Gussa", stressed: "Pareshan", lonely: "Akela", scared: "Dara hua", crisis: "Madad" };
const EMO_COLOR = { neutral: "#4fd1ff", happy: "#5dffa8", sad: "#7aa2ff", angry: "#ff7a6b", stressed: "#ffc95c", lonely: "#b58cff", scared: "#ffd36b", crisis: "#ff5470" };

export default function Jarvis() {
  const [on, setOn] = useState(false);
  const [mode, setMode] = useState("idle"); // idle | listening | thinking | speaking
  const [gender, setGender] = useState("male");
  const [lang, setLang] = useState("roman");
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState("");
  const [turns, setTurns] = useState([]);
  const [emotion, setEmotion] = useState("neutral");
  const [status, setStatus] = useState(null);
  const [notice, setNotice] = useState("");
  const [typed, setTyped] = useState("");
  const [imp, setImp] = useState(null); // Self-Improve panel
  const [engine, setEngine] = useState("auto"); // auto (Whisper) | browser
  const [level, setLevel] = useState(0);
  const [role, setRole] = useState("assistant");
  const [tone, setToneSel] = useState("friendly");
  const [aname, setAname] = useState("");
  const [saved, setSaved] = useState(false);
  const mouthRef = useRef(null);
  const [sys, setSys] = useState(null);
  const [typedN, setTypedN] = useState(0);
  // v3.25 Agent Inbox (TUIOS se, MIT): /api/ops ke kaam; ruka/ijazat wala oopar; badle to desktop notification.
  const [ops, setOps] = useState(null);
  const seenRef = useRef(null);
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [copied, setCopied] = useState(false);
  useEffect(() => { try { setOrigin(window.location.origin); } catch {} }, []);
  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const r = await fetch("/api/ops", { cache: "no-store" }).then((x) => x.json()); if (dead || !r?.ok) return;
        const now = Object.fromEntries((r.jobs || []).map((j) => [j.id, j.status]));
        if (seenRef.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
          for (const j of r.jobs || []) { const was = seenRef.current[j.id]; const t = { completed: "Kaam ho gaya", dead_letter: "Kaam ruk gaya", waiting_for_approval: "Ijazat chahiye" }[j.status]; if (was && was !== j.status && t) { try { new Notification(`Jarvis: ${t}`, { body: j.title }); } catch {} } }
        }
        seenRef.current = now; setOps(r);
      } catch {}
    };
    load(); const id = setInterval(load, 6000); return () => { dead = true; clearInterval(id); };
  }, []);
  useEffect(() => {
    let alive = true;
    const poll = async () => { try { const r = await fetch("/api/jarvis/sys", { cache: "no-store" }); if (r.ok && alive) setSys(await r.json()); } catch {} };
    poll(); const id = setInterval(poll, 2500);
    return () => { alive = false; clearInterval(id); };
  }, []);
  const talkRef = useRef({ speaking: false, words: [], started: 0, lastBoundary: 0, m: 0 });

  const onRef = useRef(false); onRef.current = on;
  const modeRef = useRef("idle"); modeRef.current = mode;
  const turnsRef = useRef([]); turnsRef.current = turns;
  const pendingRef = useRef(null);
  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const recRef = useRef(null);
  const bargeRef = useRef(0);
  const engineRef = useRef("auto"); engineRef.current = engine;
  const settingsRef = useRef({}); settingsRef.current = { gender, lang, voiceName, role, tone, aname };
  const endRef = useRef(null);

  // Pasand yaad rakhein.
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem("faheem-jarvis") || "{}"); if (s.gender) setGender(s.gender); if (s.lang) setLang(s.lang); if (s.voiceName) setVoiceName(s.voiceName); if (s.engine) setEngine(s.engine); if (s.role) setRole(s.role); if (s.tone) setToneSel(s.tone); if (s.aname) setAname(s.aname); setTurns(JSON.parse(localStorage.getItem("faheem-jarvis-chat") || "[]")); } catch {}
    fetch("/api/jarvis").then((r) => r.json()).then(setStatus).catch(() => {});
    const load = () => setVoices(window.speechSynthesis?.getVoices() || []);
    load(); if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { localStorage.setItem("faheem-jarvis", JSON.stringify({ gender, lang, voiceName, engine, role, tone, aname })); } catch {} }, [gender, lang, voiceName, engine, role, tone, aname]);

  // Lip-sync: har lafz (speech boundary) par honth syllables ke hisaab se khulte band hote hain; boundary na aaye to narm flap.
  useEffect(() => {
    let raf;
    const tick = () => {
      const T = talkRef.current; const now = performance.now(); let target = 0;
      if (T.speaking) {
        const w = T.words.find((x) => now >= x.start && now <= x.end);
        if (w) target = Math.abs(Math.sin(Math.PI * w.syl * (now - w.start) / (w.end - w.start))) * 0.95;
        else if (now - T.lastBoundary > 450) target = 0.35 + 0.35 * Math.abs(Math.sin(now / 95)) * (0.6 + 0.4 * Math.sin(now / 37));
      }
      T.m += (target - T.m) * 0.45;
      if (mouthRef.current) mouthRef.current.style.opacity = T.m.toFixed(3);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => { try { localStorage.setItem("faheem-jarvis-chat", JSON.stringify(turns.slice(-60))); } catch {} endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  // Is gender aur zubaan ki awazen (lehje).
  const voiceList = voices.filter((v) => (lang === "ur-script" ? /^ur|^hi/i.test(v.lang) : /^en|^ur|^hi/i.test(v.lang))).filter((v) => genderOf(v) === gender || genderOf(v) === "any");
  const pickVoice = useCallback(() => {
    const { gender: g, lang: l, voiceName: vn } = settingsRef.current;
    const all = window.speechSynthesis?.getVoices() || [];
    const chosen = all.find((v) => v.name === vn);
    if (chosen) return chosen;
    const same = all.filter((v) => genderOf(v) === g);
    const pref = l === "ur-script" ? [/^ur-PK/i, /^ur/i, /^hi/i] : l === "en" ? [/^en-GB/i, /^en-US/i, /^en/i] : [/^en-IN/i, /^en-GB/i, /^en/i];
    for (const re of pref) { const v = same.find((x) => re.test(x.lang) && /natural|online/i.test(x.name)) || same.find((x) => re.test(x.lang)); if (v) return v; }
    for (const re of pref) { const v = all.find((x) => re.test(x.lang)); if (v) return v; }
    return all[0] || null;
  }, []);

  // ---------- Mic (ek dafa khulta hai, poori guftagu mein chalta rehta hai) ----------
  async function ensureMic() {
    if (streamRef.current) return true;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(s).connect(an);
      streamRef.current = s; ctxRef.current = ctx; analyserRef.current = an;
      return true;
    } catch { setNotice("Mic ki ijazat nahi mili. Browser mein mic Allow karein."); return false; }
  }
  const rms = () => {
    const an = analyserRef.current; if (!an) return 0;
    const buf = new Uint8Array(an.fftSize); an.getByteTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
    return Math.sqrt(s / buf.length);
  };
  function stopAll() {
    try { window.speechSynthesis?.cancel(); } catch {}
    try { recRef.current?.stop?.(); } catch {}
    try { recRef.current?.abort?.(); } catch {}
    recRef.current = null;
    cancelAnimationFrame(bargeRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    try { ctxRef.current?.close(); } catch {} ctxRef.current = null; analyserRef.current = null;
  }

  // ---------- Bolna (jazbaat ke hisaab se), beech mein user bole to ruk jaye ----------
  const speak = useCallback((text, tone = {}) => new Promise((resolve) => {
    const synth = window.speechSynthesis; if (!synth || !text) return resolve(false);
    synth.cancel();
    const spoken = clean(text);
    const u = new SpeechSynthesisUtterance(spoken);
    const T = talkRef.current;
    const v = pickVoice(); const g = settingsRef.current.gender;
    if (v) { u.voice = v; u.lang = v.lang; }
    const mismatch = v && genderOf(v) !== "any" && genderOf(v) !== g;
    u.rate = (tone.rate || 1) * 1.0;
    u.pitch = (tone.pitch || 1) * (mismatch ? (g === "male" ? 0.75 : 1.3) : 1);
    let interrupted = false, loud = 0;
    const watch = () => {
      const r = rms(); setLevel(Math.min(1, r * 6));
      if (r > 0.09) loud++; else loud = Math.max(0, loud - 1);
      if (loud > 8) { interrupted = true; synth.cancel(); return; } // ~250ms awaz = user bol raha hai
      bargeRef.current = requestAnimationFrame(watch);
    };
    u.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      const rest = spoken.slice(e.charIndex); const word = (rest.match(/^\S+/) || [""])[0];
      const syl = Math.max(1, (word.match(/[aeiouyاآوی]+/gi) || []).length);
      const now = performance.now(); const dur = Math.max(160, word.length * 62) / (u.rate || 1);
      T.lastBoundary = now; T.words = [...T.words.filter((x) => x.end > now - 50), { start: now, end: now + dur, syl }];
    };
    u.onstart = () => { T.speaking = true; T.words = []; T.lastBoundary = 0; setMode("speaking"); if (analyserRef.current) bargeRef.current = requestAnimationFrame(watch); };
    u.onend = u.onerror = () => { T.speaking = false; T.words = []; cancelAnimationFrame(bargeRef.current); setLevel(0); resolve(interrupted); };
    synth.speak(u);
  }), [pickVoice]);

  // ---------- Sunna: 1) Whisper (laptop/Groq) 2) browser ki apni speech recognition ----------
  const listenWhisper = () => new Promise((resolve) => {
    const s = streamRef.current; if (!s) return resolve("");
    const rec = new MediaRecorder(s); const chunks = []; recRef.current = rec;
    let heard = false, lastLoud = performance.now(); const t0 = performance.now(); let raf;
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const tick = () => {
      const r = rms(); setLevel(Math.min(1, r * 6)); const now = performance.now();
      if (r > 0.035) { heard = true; lastLoud = now; }
      if ((heard && now - lastLoud > 1300) || now - t0 > 30000 || (!heard && now - t0 > 12000) || !onRef.current) { try { rec.stop(); } catch {} return; }
      raf = requestAnimationFrame(tick);
    };
    rec.onstop = async () => {
      cancelAnimationFrame(raf); setLevel(0); recRef.current = null;
      if (!heard || !chunks.length || !onRef.current) return resolve("");
      setMode("thinking");
      try {
        const fd = new FormData(); fd.append("audio", new Blob(chunks, { type: rec.mimeType || "audio/webm" }), "speech.webm"); fd.append("lang", settingsRef.current.lang === "en" ? "en" : "ur");
        const r = await fetch("/api/jarvis/stt", { method: "POST", body: fd }); const d = await r.json();
        if (!r.ok) { if (d.code === "browser") { setEngine("browser"); setNotice("Laptop par Whisper nahi mila, ab browser khud sunega. Offline ke liye: pip install faster-whisper"); return resolve("__retry__"); } throw new Error(d.error); }
        resolve(d.text || "");
      } catch (e) { setNotice("Sunne mein ghalti: " + e.message); resolve(""); }
    };
    rec.start(); setMode("listening"); tick();
  });
  const listenBrowser = () => new Promise((resolve) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setNotice("Is browser mein speech recognition nahi. Chrome/Edge istemal karein ya pip install faster-whisper."); return resolve(""); }
    const r = new SR(); recRef.current = r;
    r.lang = settingsRef.current.lang === "en" ? "en-US" : "ur-PK"; r.interimResults = false; r.maxAlternatives = 1;
    let got = "";
    r.onresult = (e) => { got = e.results[0]?.[0]?.transcript || ""; };
    r.onerror = () => {};
    r.onend = () => { recRef.current = null; resolve(got); };
    try { r.start(); setMode("listening"); } catch { resolve(""); }
  });

  // ---------- Jarvis se jawab ----------
  const ask = useCallback(async (text) => {
    const u = { role: "user", content: text, at: Date.now() };
    setTurns((t) => [...t, u]); setMode("thinking");
    try {
      const r = await fetch("/api/jarvis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, history: turnsRef.current.slice(-10), gender: settingsRef.current.gender, lang: settingsRef.current.lang, pending: pendingRef.current, role: settingsRef.current.role, tone: settingsRef.current.tone, name: settingsRef.current.aname }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || r.status);
      pendingRef.current = d.pending || null;
      setEmotion(d.emotion || "neutral");
      setTurns((t) => [...t, { role: "assistant", content: d.reply, at: Date.now(), brain: d.brain, action: d.action?.name, emotion: d.emotion }]);
      return d;
    } catch (e) { setNotice("Ghalti: " + e.message); return null; }
  }, []);

  // ---------- Guftagu ka loop ----------
  const loop = useCallback(async () => {
    while (onRef.current) {
      let text = engineRef.current === "browser" ? await listenBrowser() : await listenWhisper();
      if (text === "__retry__") continue;
      if (!onRef.current) break;
      text = String(text || "").trim();
      if (!text) { setMode("listening"); continue; }
      if (/^(bas|stop|ruk\s*jao|band\s*karo|goodbye|allah\s*hafiz|khuda\s*hafiz)\b/i.test(text)) { await speak(settingsRef.current.gender === "female" ? "Theek hai Boss, jab zaroorat ho bula lijiye." : "Ji Sir, jab zaroorat ho bula lijiye."); setOn(false); break; }
      const d = await ask(text);
      if (d?.reply && onRef.current) await speak(d.reply, d.tone);
    }
    setMode("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask, speak]);

  async function toggle() {
    if (on) { setOn(false); onRef.current = false; stopAll(); setMode("idle"); return; }
    setNotice("");
    if (!(await ensureMic())) return;
    setOn(true); onRef.current = true;
    const hi = gender === "female" ? (lang === "en" ? "Friday online. What do you need, Boss?" : "Friday haazir hai Boss. Kya karna hai?") : (lang === "en" ? "Jarvis online. How can I help, Sir?" : "Jarvis haazir hai Sir. Farmaiye?");
    setTurns((t) => [...t, { role: "assistant", content: hi, at: Date.now() }]);
    await speak(hi);
    loop();
  }
  async function sendTyped(e) {
    e.preventDefault(); const t = typed.trim(); if (!t) return; setTyped("");
    const d = await ask(t); if (d?.reply) { await ensureMic(); await speak(d.reply, d.tone); } setMode(on ? "listening" : "idle");
  }

  // ---------- Self-Improve ----------
  async function improve() {
    setImp({ loading: true });
    try { const d = await fetch("/api/jarvis/improve", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json()); setImp(d); fetch("/api/jarvis").then((r) => r.json()).then(setStatus).catch(() => {}); }
    catch (e) { setImp({ msg: "Ghalti: " + e.message }); }
  }
  async function delNote(id) { const d = await fetch("/api/jarvis/improve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteId: id }) }).then((r) => r.json()); setImp((x) => ({ ...x, notes: d.notes })); }

  const col = EMO_COLOR[emotion] || EMO_COLOR.neutral;
  const P = gender === "female" ? "friday" : "jarvis";
  const name = aname.trim() || (gender === "female" ? "Friday" : "Jarvis");
  const lastReply = [...turns].reverse().find((t) => t.role === "assistant")?.content || (gender === "female" ? "Salam! Main Friday hoon. Aaj kya karna hai, Boss?" : "Salam! Main Jarvis hoon. Farmaiye Sir, kya karna hai?");
  useEffect(() => {
    setTypedN(0); let n = 0;
    const id = setInterval(() => { n += 1; setTypedN(n); if (n >= lastReply.length) clearInterval(id); }, 38);
    return () => clearInterval(id);
  }, [lastReply]);
  const Gauge = ({ label, v, sub, icon }) => {
    const pct = v == null ? 0 : Math.max(0, Math.min(100, v)); const C = 2 * Math.PI * 34;
    const hue = pct > 85 ? "#ff6b7a" : pct > 60 ? "#ffcf6b" : "#7fe7ff";
    return (
      <div className="jv-gauge" role="meter" aria-label={label} aria-valuenow={v ?? undefined} aria-valuemin={0} aria-valuemax={100}>
        <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" className="g-bg" /><circle cx="40" cy="40" r="34" className="g-fg" style={{ stroke: hue, strokeDasharray: C, strokeDashoffset: C * (1 - pct / 100) }} /></svg>
        <div className="g-in"><Icon name={icon} size={13} /><b>{v == null ? "–" : v + "%"}</b></div>
        <span>{label}</span>{sub && <small>{sub}</small>}
      </div>
    );
  };
  const mouthBox = gender === "female" ? "ellipse 11.4% 7.6% at 50% 51.4%" : "ellipse 12.4% 8.1% at 50% 57.1%";
  const stateText = on ? ({ listening: "Sun raha hoon", thinking: "Soch raha hoon", speaking: "Bol raha hoon" }[mode] || "Tayyar") : "Shuru";
  const sendCmd = async (t) => { const d = await ask(t); if (d?.reply) { await ensureMic(); await speak(d.reply, d.tone); } };
  const PERSONA = [["assistant", "Personal Assistant", "Kaam, yaad-dehani, jawab", "check"], ["coder", "Coder", "Code aur projects", "box"], ["teacher", "Teacher", "Aasaan samjhana", "book"], ["business", "Business Advisor", "Marketing, hisaab", "graph"], ["friend", "Dost", "Baat cheet, hausla", "users"]];
  const TONE_L = [["professional", "Professional", "Saaf aur chhota", "chat"], ["friendly", "Friendly", "Garam aur madadgar", "sparkle"], ["formal", "Formal", "Adab wala andaz", "edit"]];
  const INBOX_ST = { waiting_for_approval: ["ijazat chahiye", "warn"], dead_letter: ["ruk gaya", "bad"], retrying: ["dobara koshish", "warn"], running: ["chal raha", "run"], queued: ["line mein", "run"], completed: ["ho gaya", "ok"], cancelled: ["cancel", "off"] };
  const IRANK = { waiting_for_approval: 0, dead_letter: 1, retrying: 2, running: 3, queued: 4, completed: 5, cancelled: 6 };
  const inbox = [...(ops?.jobs || [])].sort((a, b) => (IRANK[a.status] ?? 9) - (IRANK[b.status] ?? 9) || String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6);
  const attn = (ops?.jobs || []).filter((j) => ["waiting_for_approval", "dead_letter"].includes(j.status)).length;
  const wbBase = `${origin}/api/v1`;
  const copyBase = async () => { try { await navigator.clipboard.writeText(wbBase); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setNotice("Copy nahi hua, khud select kar lein."); } };
  const CAPS = [["Chrome kholo", "globe"], ["YouTube par naat chalao", "play"], ["Downloads folder kholo", "folder"], ["Screenshot lo", "image"], ["Awaz kam karo", "mic"], ["Kitne baje hain", "clock"], ["TUIOS kholo", "grid"], ["WebBrain kholo", "brain"]];
  const EXAMPLES = ["Aaj ka plan banane mein madad karo", "Ek professional email ka jawab likhne ka tareeqa batao", "Mujhe thori tension hai, baat karo", "Python seekhna shuru kaise karoon"];

  return (
    <main className="jv" style={{ "--jc": col }}>
      <style>{CSS}</style>
      <header className="jv-top">
        <div>
          <h1>Aap ka AI Assistant, <em>aap ki marzi.</em></h1>
          <p>Persona, lehja aur andaz chunein. Awaz se baat karein, {name} laptop bhi chalata hai.</p>
        </div>
        <div className="jv-actions">
          <span className={"jv-dot " + mode} title={mode} />
          <button className="jv-improve" onClick={improve} title="Self-Improve: Jarvis apni baat cheet parh kar khud behtar hota hai" data-jarvis-improve><Icon name="sparkle" size={16} /> Self-Improve</button>
        </div>
      </header>

      <div className="jv-grid">
        {/* Baayen: Persona, Tone, Capabilities */}
        <aside className="jv-col">
          <div className="jv-card">
            <h3>Persona</h3>
            {PERSONA.map(([id, t, d, ic]) => (
              <button key={id} className={"jv-opt" + (role === id ? " on" : "")} onClick={() => setRole(id)}>
                <Icon name={ic} size={16} /><span><b>{t}</b><small>{d}</small></span>{role === id && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
          <div className="jv-card">
            <h3>Andaz (tone)</h3>
            {TONE_L.map(([id, t, d, ic]) => (
              <button key={id} className={"jv-opt" + (tone === id ? " on" : "")} onClick={() => setToneSel(id)}>
                <Icon name={ic} size={16} /><span><b>{t}</b><small>{d}</small></span>{tone === id && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
          <div className="jv-card">
            <h3>Laptop par kaam</h3>
            {CAPS.map(([t, ic]) => <button key={t} className="jv-cap" onClick={() => sendCmd(t)}><Icon name={ic} size={15} /> {t}</button>)}
          </div>
        </aside>

        {/* Beech: hologram avatar (lip-sync) */}
        <section className="jv-stage">
          <div className="jv-holo">
            <div className="jv-badge"><Icon name="sparkle" size={15} /> {name.toUpperCase()}</div>
            <div className="jv-avatar">
              <img src={`/jarvis/${P}-closed.jpg`} alt={`${name} avatar`} className="jv-face" />
              <img ref={mouthRef} src={`/jarvis/${P}-open.jpg`} alt="" aria-hidden="true" className="jv-face jv-mouth" style={{ WebkitMaskImage: `radial-gradient(${mouthBox}, #000 55%, transparent 100%)`, maskImage: `radial-gradient(${mouthBox}, #000 55%, transparent 100%)`, opacity: 0 }} />
              <div className="jv-scan" />
            </div>
            <div className="jv-bubble" aria-live="polite">
              <div className="jv-bname">{name}</div>
              {mode === "thinking" ? <span className="jv-typing"><i /><i /><i /></span> : <>{lastReply.slice(0, typedN)}{typedN < lastReply.length && <span className="jv-caret" />}</>}
            </div>
            <div className="jv-tags">
              <span><Icon name="brain" size={14} /> {mode === "thinking" ? "Soch raha" : "Smart"}</span>
              <span><Icon name="loop" size={14} /> Mood: {EMO_LABEL[emotion]}</span>
              <span><Icon name="check" size={14} /> Laptop par</span>
            </div>
          </div>
          <div className="jv-pad">
            <div className="jv-ring r1" /><div className="jv-ring r2" />
            <button className={"jv-core " + mode} style={{ transform: `scale(${1 + (mode === "listening" ? level * 0.3 : 0)})` }} onClick={toggle} aria-label={on ? "Band karein" : "Baat shuru karein"} data-jarvis-mic>
              <Icon name={on ? "mic" : "play"} size={26} /><span>{stateText}</span>
            </button>
          </div>
          <div className="jv-meters" aria-label="Laptop ka load">
            <Gauge label="CPU" icon="monitor" v={sys?.cpu} sub={sys ? `${sys.cores} cores` : ""} />
            <Gauge label="RAM" icon="box" v={sys?.ram} sub={sys ? `${sys.ramGB[0]}/${sys.ramGB[1]} GB` : ""} />
            <Gauge label="Disk" icon="folder" v={sys?.disk} sub={sys?.diskGB ? `${sys.diskGB[0]}/${sys.diskGB[1]} GB` : ""} />
            <Gauge label={sys?.charging ? "Battery ⚡" : "Battery"} icon="zap" v={sys?.battery} sub={sys ? `On ${sys.uptimeH}h` : ""} />
          </div>
          {status && (
            <div className="jv-status">
              <span className={status.ollama?.running ? "ok" : "bad"}>Ollama: {status.ollama?.running ? (status.ollama.models?.[0]?.name || "chal raha") : "band"}</span>
              <span className={status.localStt ? "ok" : "mid"}>Whisper: {status.localStt ? "laptop" : engine === "browser" ? "browser" : "Groq/browser"}</span>
              <span className={status.chromeDevtools ? "ok" : "mid"}>Chrome: {status.chromeDevtools ? "control" : "link"}</span>
              <span>Qawaid: {status.stats?.notes || 0}</span>
            </div>
          )}
          {notice && <div className="jv-notice" role="status">{notice}</div>}
        </section>

        {/* Daayen: chat side par */}
        <aside className="jv-col jv-chat">
          <div className="jv-card jv-chatbox">
            <div className="jv-chathead"><h3>Baat cheet</h3><button className="jv-mini" onClick={() => setTurns([])} title="Saaf karein"><Icon name="trash" size={14} /></button></div>
            <div className="jv-log">
              {turns.length === 0 && <p className="jv-hint">Shuru dabayein aur boliye, ya neeche likhein. Beech mein bolein to {name} ruk jata hai. &quot;Bas&quot; kahein to band.</p>}
              {turns.map((t, i) => (
                <div key={i} className={"jv-msg " + t.role}>
                  <b>{t.role === "user" ? "Aap" : name}</b> {t.content}
                  {t.role === "assistant" && (t.brain || t.action) && <small>{[t.action && "kaam: " + t.action, t.brain].filter(Boolean).join(" · ")}</small>}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className="jv-type" onSubmit={sendTyped}>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`${name} ko likhein...`} aria-label="Likh kar bhejein" />
              <button type="submit" aria-label="Bhejein"><Icon name="send" size={16} /></button>
            </form>
          </div>
          <div className="jv-card" data-jarvis-inbox>
            <div className="jv-chathead"><h3>Agent Inbox{attn ? <span className="jv-attn">{attn}</span> : null}</h3>
              <button className="jv-mini" onClick={() => { if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission().catch(() => {}); sendCmd("TUIOS kholo"); }} title="TUIOS (terminal + agent inbox) kholo"><Icon name="grid" size={14} /></button></div>
            {!ops ? <p className="jv-hint">Kaam dekh raha hoon…</p> : inbox.length === 0 ? <p className="jv-hint">Koi kaam nahi chal raha. Ruka hua ya ijazat wala kaam yahan oopar aayega.</p> :
              <ul className="jv-inbox">{inbox.map((j) => { const [l, c] = INBOX_ST[j.status] || [j.status, "off"]; return <li key={j.id}><i className={"jv-dot " + c} /><span title={j.title}>{j.title}</span><small>{l}</small></li>; })}</ul>}
            <Link href="/workflows" className="jv-link">Sab kaam aur ijazat</Link>
          </div>
          <div className="jv-card" data-jarvis-webbrain>
            <h3>WebBrain (browser agent)</h3>
            <p className="jv-hint">WebBrain lagayein, phir us ki settings mein &quot;Local OpenAI-compatible&quot; chun kar yeh dalein. Aap ke saare free brains wahan chalenge.</p>
            <div className="jv-wb"><code>{wbBase}</code><button className="jv-mini" onClick={copyBase} title="Base URL copy"><Icon name={copied ? "check" : "copy"} size={14} /></button></div>
            <p className="jv-hint">Model: <code>faheem-free</code> · Key: <code>free</code>. Click/type (Act) ke liye Ollama behtar: <code>http://localhost:11434/v1</code></p>
            <div className="jv-wbl">{[["Chrome", "chrome"], ["Edge", "edge"], ["Firefox", "firefox"]].map(([t, b]) => <button key={b} className="jv-mini wide" onClick={() => sendCmd(`WebBrain ${b} kholo`)}><Icon name="external" size={13} /> {t}</button>)}</div>
          </div>
          <div className="jv-card">
            <h3>Misaalen</h3>
            {EXAMPLES.map((x) => <button key={x} className="jv-ex" onClick={() => sendCmd(x)}>{x}</button>)}
          </div>
        </aside>
      </div>

      {/* Neeche: Personalize */}
      <section className="jv-card jv-personal">
        <h3>Apna assistant banayein</h3>
        <div className="jv-row">
          <label>Naam<input value={aname} onChange={(e) => setAname(e.target.value)} placeholder={gender === "female" ? "Friday" : "Jarvis"} maxLength={24} /></label>
          <label>Awaz
            <div className="jv-seg">
              <button className={gender === "male" ? "on" : ""} onClick={() => { setGender("male"); setVoiceName(""); }}>Mard</button>
              <button className={gender === "female" ? "on" : ""} onClick={() => { setGender("female"); setVoiceName(""); }}>Aurat</button>
            </div>
          </label>
          <label>Lehja
            <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)} data-jarvis-voice>
              <option value="">Khud chuno ({gender === "male" ? "mard" : "aurat"})</option>
              {voiceList.map((v) => <option key={v.name} value={v.name}>{v.name.replace(/Microsoft |Online \(Natural\) - /g, "")} · {v.lang}</option>)}
            </select>
          </label>
          <label>Zubaan
            <select value={lang} onChange={(e) => { setLang(e.target.value); setVoiceName(""); }}>
              <option value="roman">Roman Urdu</option><option value="ur-script">اردو</option><option value="en">English</option>
            </select>
          </label>
          <label>Sunna
            <select value={engine} onChange={(e) => setEngine(e.target.value)}>
              <option value="auto">Whisper</option><option value="browser">Browser</option>
            </select>
          </label>
          <button className="jv-save" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1500); speak(gender === "female" ? `Salam, main ${name} hoon.` : `Salam, main ${name} hoon.`, {}); }}>{saved ? "Save ho gaya" : "Save aur suno"}</button>
        </div>
      </section>

      <nav className="jv-nav" aria-label="Pages">
        <Link href="/"><Icon name="chat" size={16} /> Chat</Link>
        <Link href="/agent"><Icon name="bot" size={16} /> Agent</Link>
        <Link href="/jarvis" className="on"><Icon name="sparkle" size={16} /> Jarvis</Link>
        <Link href="/memory"><Icon name="book" size={16} /> Memory</Link>
        <Link href="/options"><Icon name="settings" size={16} /> Options</Link>
      </nav>

      {imp && (
        <div className="jv-imp" role="dialog" aria-label="Self-Improve">
          <div className="jv-imp-box">
            <div className="jv-imp-head"><b>Self-Improve</b><button onClick={() => setImp(null)} aria-label="Band"><Icon name="x" size={16} /></button></div>
            {imp.loading ? <p>{name} apni pichli baat cheet parh raha hai...</p> : <>
              {imp.msg && <p>{imp.msg}</p>}
              {imp.added?.length > 0 && <p className="ok">Naye qawaid seekhe ({imp.brain}): ye ab har jawab mein lagenge.</p>}
              <h4>Seekhe hue qawaid</h4>
              {(imp.notes || []).length === 0 ? <p className="muted">Abhi koi nahi.</p> : (imp.notes || []).map((n) => (
                <div className="jv-note" key={n.id}><span>{n.text}</span><button onClick={() => delNote(n.id)} title="Hatayein"><Icon name="trash" size={14} /></button></div>
              ))}
              {imp.ideas?.length > 0 && <>
                <h4>Code behtar karne ke mashware</h4>
                {imp.ideas.map((x, i) => <div className="jv-note" key={i}><span>{x}</span><button onClick={() => { navigator.clipboard?.writeText(`Jarvis page (app/jarvis, lib/jarvis) mein yeh behtari karo: ${x}`); setNotice("Copy ho gaya. Agent Mode mein paste karein, wahan aap ki ijazat se code badlega."); }} title="Agent Mode ke liye copy"><Icon name="copy" size={14} /></button></div>)}
                <Link href="/agent" className="jv-save">Agent Mode kholein</Link>
              </>}
              {imp.stats && <p className="muted">Baat cheet: {imp.stats.turns} · ghaltiyan/tasheeh: {imp.stats.fails} · ausat waqt: {Math.round((imp.stats.avgMs || 0) / 100) / 10}s</p>}
            </>}
          </div>
        </div>
      )}
    </main>
  );
}

const CSS = `
.jv{min-height:100vh;background:radial-gradient(ellipse at 50% 35%,#1a1550 0%,#0a0b24 45%,#04050f 100%);color:#e6e8ff;font-family:var(--font, system-ui, sans-serif);padding:18px 20px 80px;--card:rgba(20,22,58,.62);--line:rgba(140,130,255,.22);--vio:#8b7bff}
.jv-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
.jv-top h1{margin:0;font-size:28px;line-height:1.15;font-weight:700}.jv-top h1 em{font-style:normal;color:var(--vio)}
.jv-top p{margin:6px 0 0;color:#a9aed6;font-size:14px;max-width:520px}
.jv-actions{display:flex;gap:10px;align-items:center}
.jv-dot{width:10px;height:10px;border-radius:50%;background:#4a4f77}.jv-dot.listening{background:#5dffa8;box-shadow:0 0 10px #5dffa8}.jv-dot.thinking{background:#ffc95c}.jv-dot.speaking{background:var(--vio);box-shadow:0 0 10px var(--vio)}
.jv-improve{display:inline-flex;gap:6px;align-items:center;background:linear-gradient(90deg,#5b47ff,#8b5cf6);border:0;color:#fff;border-radius:12px;padding:10px 14px;font-weight:600;cursor:pointer;min-height:40px;box-shadow:0 6px 24px rgba(110,90,255,.35)}
.jv-grid{display:grid;grid-template-columns:260px minmax(0,1fr) 340px;gap:16px;align-items:start}
.jv-col{display:flex;flex-direction:column;gap:14px}
.jv-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;backdrop-filter:blur(10px)}
.jv-card h3{margin:0 0 10px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#bfc3ee}
.jv-opt{width:100%;display:flex;align-items:center;gap:10px;text-align:left;background:transparent;border:1px solid transparent;color:#e6e8ff;border-radius:10px;padding:8px 10px;cursor:pointer;min-height:44px}
.jv-opt span{flex:1;display:flex;flex-direction:column}.jv-opt b{font-size:14px;font-weight:600}.jv-opt small{color:#959bc8;font-size:12px}
.jv-opt:hover{background:rgba(139,123,255,.08)}.jv-opt.on{background:rgba(110,90,255,.22);border-color:var(--vio)}
.jv-cap,.jv-ex{width:100%;display:flex;gap:8px;align-items:center;text-align:left;background:transparent;border:0;color:#d7daf7;padding:7px 4px;cursor:pointer;font-size:14px;min-height:36px;border-radius:8px}
.jv-cap:hover,.jv-ex:hover{background:rgba(139,123,255,.08)}
.jv-inbox{list-style:none;margin:4px 0 6px;padding:0;display:grid;gap:4px}
.jv-inbox li{display:flex;align-items:center;gap:8px;font-size:13px;color:#d7daf7;min-height:26px}
.jv-inbox li span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jv-inbox li small{color:#9aa0c8;font-size:11px}
.jv-dot{width:8px;height:8px;border-radius:50%;flex:none;background:#6b7090}
.jv-dot.ok{background:#3fd29a}.jv-dot.run{background:#7c8bff;box-shadow:0 0 8px #7c8bff}.jv-dot.warn{background:#ffb648}.jv-dot.bad{background:#ff5d6c}
.jv-attn{margin-left:6px;font-size:11px;background:#ff5d6c;color:#fff;border-radius:999px;padding:1px 7px;vertical-align:middle}
.jv-link{font-size:12px;color:#a9b1ff;text-decoration:none}.jv-link:hover{text-decoration:underline}
.jv-wb{display:flex;gap:6px;align-items:center;background:rgba(10,12,30,.55);border:1px solid rgba(139,123,255,.2);border-radius:8px;padding:6px 8px;margin:6px 0}
.jv-wb code{flex:1;font-size:12px;color:#cfd3ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jv-card code{font-size:12px;color:#cfd3ff}
.jv-wbl{display:flex;gap:6px;flex-wrap:wrap}
.jv-mini.wide{width:auto;border:1px solid rgba(139,123,255,.25);border-radius:8px;padding:0 10px;gap:5px;display:inline-flex;align-items:center;font-size:12px}
.jv-ex{border:1px solid var(--line);margin-bottom:8px;padding:9px 10px;line-height:1.35}
.jv-stage{display:flex;flex-direction:column;align-items:center;gap:0}
.jv-holo{position:relative;width:100%;max-width:560px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(180deg,rgba(60,50,160,.25),rgba(15,16,45,.5));padding:16px 16px 12px;overflow:hidden}
.jv-badge{position:absolute;top:14px;left:14px;z-index:3;display:inline-flex;gap:6px;align-items:center;background:rgba(10,12,35,.75);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-weight:600;letter-spacing:.12em;font-size:13px}
.jv-avatar{position:relative;width:min(100%,420px);aspect-ratio:1;margin:0 auto;border-radius:16px;overflow:hidden;-webkit-mask-image:radial-gradient(ellipse 70% 75% at 50% 45%,#000 60%,transparent 100%);mask-image:radial-gradient(ellipse 70% 75% at 50% 45%,#000 60%,transparent 100%)}
.jv-face{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.jv-mouth{will-change:opacity}
.jv-scan{position:absolute;inset:0;background:repeating-linear-gradient(180deg,rgba(140,160,255,.06) 0 2px,transparent 2px 5px);mix-blend-mode:screen;pointer-events:none;animation:jvscan 6s linear infinite}
.jv-bubble{position:absolute;top:70px;right:14px;z-index:3;max-width:min(44%,230px);background:rgba(12,14,40,.82);border:1px solid var(--line);border-radius:14px;padding:12px;font-size:14px;line-height:1.45;color:#e9ebff}
.jv-tags{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px}
.jv-tags span{display:inline-flex;gap:6px;align-items:center;background:rgba(10,12,35,.7);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:12px;letter-spacing:.06em}
.jv-pad{position:relative;width:100%;max-width:520px;height:120px;display:grid;place-items:center;margin-top:-6px}
.jv-ring{position:absolute;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%)}
.jv-ring.r1{width:440px;max-width:96%;height:90px;border:2px solid rgba(110,140,255,.55);box-shadow:0 0 40px rgba(90,120,255,.55),inset 0 0 30px rgba(90,120,255,.4);background:radial-gradient(ellipse,rgba(80,110,255,.35),transparent 70%)}
.jv-ring.r2{width:300px;max-width:70%;height:56px;border:1px dashed rgba(170,190,255,.6);animation:jvglow 2.4s ease-in-out infinite}
.jv-core{position:relative;z-index:2;width:96px;height:96px;border-radius:50%;border:2px solid var(--jc);background:radial-gradient(circle,rgba(110,90,255,.55),rgba(8,10,30,.95) 70%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;box-shadow:0 0 30px var(--jc);font-size:11px;transition:transform .08s linear}
.jv-core.thinking{animation:jvpulse 1.1s ease-in-out infinite}
.jv-core:focus-visible,.jv-improve:focus-visible,.jv-opt:focus-visible,.jv-save:focus-visible{outline:2px solid #fff;outline-offset:3px}
.jv-status{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;font-size:12px;margin-top:4px}
.jv-status span{padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.05)}
.jv-status .ok{color:#5dffa8}.jv-status .bad{color:#ff8a7a}.jv-status .mid{color:#ffcf6b}
.jv-notice{text-align:center;color:#ffd98a;font-size:13px;margin-top:6px}
.jv-chatbox{display:flex;flex-direction:column;height:min(62vh,560px)}
.jv-chathead{display:flex;justify-content:space-between;align-items:center}
.jv-mini{background:none;border:0;color:#a9aed6;cursor:pointer;min-width:32px;min-height:32px}
.jv-log{flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px}
.jv-hint{color:#959bc8;font-size:13px;line-height:1.6}
.jv-msg{padding:9px 11px;border-radius:12px;background:rgba(255,255,255,.05);line-height:1.5;font-size:14px}
.jv-msg.user{align-self:flex-end;background:rgba(110,90,255,.22);max-width:90%}
.jv-msg b{color:var(--vio);margin-right:6px;font-size:11px;letter-spacing:.08em}
.jv-msg small{display:block;color:#7f86b5;font-size:11px;margin-top:3px}
.jv-type{display:flex;gap:8px;margin-top:10px}
.jv-type input{flex:1;background:rgba(5,6,20,.7);border:1px solid var(--line);color:#fff;border-radius:12px;padding:11px;min-height:44px}
.jv-type button{width:46px;border-radius:12px;border:0;background:#5b47ff;color:#fff;cursor:pointer}
.jv-personal{margin-top:16px}
.jv-row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}
.jv-row label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#a9aed6}
.jv-row input,.jv-row select{background:rgba(5,6,20,.7);border:1px solid var(--line);color:#fff;border-radius:10px;padding:9px;min-height:40px;min-width:150px;max-width:260px}
.jv-seg{display:flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.jv-seg button{background:transparent;border:0;color:#d7daf7;padding:9px 16px;cursor:pointer;min-height:40px}.jv-seg button.on{background:#5b47ff;color:#fff}
.jv-save{background:linear-gradient(90deg,#5b47ff,#8b5cf6);border:0;color:#fff;border-radius:10px;padding:10px 16px;font-weight:600;cursor:pointer;min-height:40px;text-decoration:none;display:inline-flex;align-items:center}
.jv-nav{position:fixed;left:50%;transform:translateX(-50%);bottom:12px;display:flex;gap:6px;background:rgba(10,12,35,.85);border:1px solid var(--line);border-radius:16px;padding:6px;backdrop-filter:blur(10px);z-index:20}
.jv-nav a{display:inline-flex;gap:6px;align-items:center;color:#b9bde6;text-decoration:none;padding:8px 14px;border-radius:12px;font-size:14px;min-height:40px}
.jv-nav a.on{background:rgba(110,90,255,.3);color:#fff;border:1px solid var(--vio)}
.jv-imp{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:flex-end;z-index:50}
.jv-imp-box{width:min(440px,100vw);height:100%;overflow:auto;background:#0b0c26;border-left:1px solid var(--vio);padding:16px;display:flex;flex-direction:column;gap:8px}
.jv-imp-head{display:flex;justify-content:space-between;align-items:center}
.jv-imp-head button,.jv-note button{background:none;border:0;color:#a9aed6;cursor:pointer;min-width:32px;min-height:32px}
.jv-imp h4{margin:10px 0 2px;color:var(--vio);font-size:13px}
.jv-note{display:flex;gap:8px;justify-content:space-between;align-items:flex-start;background:rgba(255,255,255,.04);border-radius:8px;padding:8px;font-size:14px}
.jv-imp .ok{color:#5dffa8}.jv-imp .muted{color:#7f86b5;font-size:12px}
@keyframes jvscan{to{background-position:0 100px}}
@keyframes jvglow{50%{opacity:.4}}
@keyframes jvpulse{50%{box-shadow:0 0 60px var(--jc)}}
@media (max-width:1100px){.jv-grid{grid-template-columns:1fr 1fr}.jv-stage{grid-column:1/-1;order:-1}}
@media (max-width:700px){.jv-grid{grid-template-columns:1fr}.jv-bubble{position:static;max-width:none;margin-top:8px}.jv-top h1{font-size:22px}}
@media (prefers-reduced-motion: reduce){.jv-scan,.jv-ring,.jv-core{animation:none!important;transition:none!important}}
/* v3.24.2 glass: sab kuch shafaf, hologram background mein ghula hua */
.jv{background:radial-gradient(ellipse at 50% 30%,rgba(90,70,255,.35) 0%,transparent 55%),radial-gradient(ellipse at 15% 85%,rgba(0,190,255,.18) 0%,transparent 50%),radial-gradient(ellipse at 90% 10%,rgba(190,80,255,.2) 0%,transparent 45%),#03040d}
.jv-card,.jv-holo,.jv-badge,.jv-tags span,.jv-bubble,.jv-nav,.jv-gauge,.jv-imp-box{background:linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 8px 32px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%)}
.jv-holo{background:transparent;border-color:rgba(255,255,255,.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.jv-avatar{mix-blend-mode:screen;isolation:isolate;opacity:.95}
.jv-avatar::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(120,140,255,.10),rgba(80,60,255,.18));mix-blend-mode:color;pointer-events:none}
.jv-opt.on{background:rgba(255,255,255,.12);border-color:rgba(170,160,255,.7)}
.jv-row input,.jv-row select,.jv-type input{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.16)}
.jv-row select option{background:#11122b}
.jv-msg{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08)}
.jv-msg.user{background:rgba(120,100,255,.22)}
.jv-bubble{top:56px;right:10px;max-width:min(46%,260px);max-height:62%;overflow:auto;font-size:14.5px;border-radius:16px 16px 16px 4px}
.jv-bname{font-size:11px;letter-spacing:.12em;color:#b7a9ff;margin-bottom:4px;text-transform:uppercase}
.jv-caret{display:inline-block;width:2px;height:1em;background:#cfc6ff;margin-left:2px;vertical-align:-2px;animation:jvblink .8s steps(2) infinite}
.jv-typing{display:inline-flex;gap:4px}.jv-typing i{width:7px;height:7px;border-radius:50%;background:#cfc6ff;animation:jvdot 1s infinite}.jv-typing i:nth-child(2){animation-delay:.15s}.jv-typing i:nth-child(3){animation-delay:.3s}
.jv-meters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;width:100%;max-width:560px;margin:6px 0 4px}
.jv-gauge{position:relative;border-radius:16px;padding:10px 6px 8px;display:flex;flex-direction:column;align-items:center;gap:2px}
.jv-gauge svg{width:74px;height:74px;transform:rotate(-90deg)}
.jv-gauge .g-bg{fill:none;stroke:rgba(255,255,255,.1);stroke-width:7}
.jv-gauge .g-fg{fill:none;stroke-width:7;stroke-linecap:round;transition:stroke-dashoffset .8s ease,stroke .5s;filter:drop-shadow(0 0 6px currentColor)}
.jv-gauge .g-in{position:absolute;top:10px;left:0;right:0;height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:#e6e8ff}
.jv-gauge .g-in b{font-size:15px}
.jv-gauge span{font-size:12px;letter-spacing:.1em;color:#cfd3ff}.jv-gauge small{font-size:11px;color:#8d93c4}
@keyframes jvblink{50%{opacity:0}}
@keyframes jvdot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
@media (max-width:700px){.jv-meters{grid-template-columns:repeat(2,1fr)}}
/* v3.24.3 pro: chhote fonts, ziada glass, avatar ka sar poora nazar aaye */
.jv{font-size:13px;padding:14px 18px 72px}
.jv-top h1{font-size:20px;font-weight:600;letter-spacing:-.01em}.jv-top p{font-size:12px}
.jv-card{padding:12px;border-radius:14px}.jv-card h3{font-size:10px;margin-bottom:8px}
.jv-opt{min-height:38px;padding:6px 8px}.jv-opt b{font-size:12.5px}.jv-opt small{font-size:11px}
.jv-cap,.jv-ex{font-size:12px;min-height:30px}.jv-ex{padding:7px 9px}
.jv-msg{font-size:12.5px;padding:7px 9px}.jv-type input{font-size:12.5px;min-height:38px}
.jv-row label{font-size:11px}.jv-row input,.jv-row select{font-size:12px;min-height:34px;padding:7px}
.jv-seg button,.jv-save,.jv-improve{font-size:12px;min-height:34px;padding:7px 12px}
.jv-nav a{font-size:12px;min-height:34px;padding:6px 12px}
.jv-badge{font-size:10.5px;padding:5px 10px;top:10px;left:10px}
.jv-tags span{font-size:10.5px;padding:5px 10px}
.jv-bubble{font-size:12.5px;top:44px}
.jv-core{width:80px;height:80px;font-size:10px}
.jv-card,.jv-holo,.jv-badge,.jv-tags span,.jv-bubble,.jv-nav,.jv-gauge,.jv-imp-box{background:linear-gradient(140deg,rgba(255,255,255,.12),rgba(255,255,255,.02) 60%);border:1px solid rgba(255,255,255,.18);-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),inset 0 -1px 0 rgba(255,255,255,.04),0 10px 40px rgba(0,0,0,.4)}
.jv-holo{padding-top:44px}
.jv-avatar{width:min(100%,380px);aspect-ratio:1/1.05;-webkit-mask-image:radial-gradient(ellipse 72% 80% at 50% 50%,#000 62%,transparent 100%);mask-image:radial-gradient(ellipse 72% 80% at 50% 50%,#000 62%,transparent 100%)}
.jv-face{object-fit:contain;object-position:50% 100%;image-rendering:high-quality}
.jv-meters{gap:8px}
.jv-gauge{padding:8px 4px 6px;border-radius:14px}
.jv-gauge svg{width:62px;height:62px}.jv-gauge .g-in{top:8px;height:62px}
.jv-gauge .g-bg,.jv-gauge .g-fg{stroke-width:5}
.jv-gauge .g-in b{font-size:12.5px;font-variant-numeric:tabular-nums}
.jv-gauge span{font-size:10px}.jv-gauge small{font-size:9.5px;font-variant-numeric:tabular-nums}
.jv-status{font-size:10.5px}
`;
