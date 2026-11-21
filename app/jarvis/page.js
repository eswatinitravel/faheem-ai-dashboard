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
  const settingsRef = useRef({}); settingsRef.current = { gender, lang, voiceName };
  const endRef = useRef(null);

  // Pasand yaad rakhein.
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem("faheem-jarvis") || "{}"); if (s.gender) setGender(s.gender); if (s.lang) setLang(s.lang); if (s.voiceName) setVoiceName(s.voiceName); if (s.engine) setEngine(s.engine); setTurns(JSON.parse(localStorage.getItem("faheem-jarvis-chat") || "[]")); } catch {}
    fetch("/api/jarvis").then((r) => r.json()).then(setStatus).catch(() => {});
    const load = () => setVoices(window.speechSynthesis?.getVoices() || []);
    load(); if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { localStorage.setItem("faheem-jarvis", JSON.stringify({ gender, lang, voiceName, engine })); } catch {} }, [gender, lang, voiceName, engine]);
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
    const u = new SpeechSynthesisUtterance(clean(text));
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
    u.onstart = () => { setMode("speaking"); if (analyserRef.current) bargeRef.current = requestAnimationFrame(watch); };
    u.onend = u.onerror = () => { cancelAnimationFrame(bargeRef.current); setLevel(0); resolve(interrupted); };
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
      const r = await fetch("/api/jarvis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, history: turnsRef.current.slice(-10), gender: settingsRef.current.gender, lang: settingsRef.current.lang, pending: pendingRef.current }) });
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
  const name = gender === "female" ? "FRIDAY" : "J.A.R.V.I.S.";
  const scale = 1 + (mode === "listening" || mode === "speaking" ? level * 0.35 : 0);

  return (
    <main className="jv" style={{ "--jc": col }}>
      <style>{CSS}</style>
      <header className="jv-top">
        <Link href="/" className="jv-back" title="Chat par wapas"><Icon name="back" size={16} /> Chat</Link>
        <div className="jv-title">{name}<span className={"jv-dot " + mode} /></div>
        <div className="jv-actions">
          <button className={"jv-chip" + (gender === "male" ? " on" : "")} onClick={() => { setGender("male"); setVoiceName(""); }} title="Mard ki awaz (Jarvis)">Mard</button>
          <button className={"jv-chip" + (gender === "female" ? " on" : "")} onClick={() => { setGender("female"); setVoiceName(""); }} title="Aurat ki awaz (Friday)">Aurat</button>
          <button className="jv-improve" onClick={improve} title="Self-Improve: Jarvis apni baat cheet parh kar khud behtar hota hai" data-jarvis-improve><Icon name="sparkle" size={16} /> Self-Improve</button>
        </div>
      </header>

      <section className="jv-hud">
        <div className="jv-ring r1" /><div className="jv-ring r2" /><div className="jv-ring r3" />
        <button className={"jv-core " + mode} style={{ transform: `scale(${scale})` }} onClick={toggle} aria-label={on ? "Jarvis band karein" : "Jarvis se baat shuru karein"} data-jarvis-mic>
          <Icon name={on ? "mic" : "play"} size={34} />
          <span>{on ? ({ listening: "Sun raha hoon", thinking: "Soch raha hoon", speaking: "Bol raha hoon" }[mode] || "Tayyar") : "Shuru"}</span>
        </button>
        <div className="jv-emo" title="Aap ka mood (Jarvis is ke hisaab se andaz badalta hai)">Mood: {EMO_LABEL[emotion]}</div>
      </section>

      <section className="jv-bar">
        <label>Zubaan
          <select value={lang} onChange={(e) => { setLang(e.target.value); setVoiceName(""); }}>
            <option value="roman">Roman Urdu</option><option value="ur-script">اردو</option><option value="en">English</option>
          </select>
        </label>
        <label>Lehja (awaz)
          <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)} data-jarvis-voice>
            <option value="">Khud chuno ({gender === "male" ? "mard" : "aurat"})</option>
            {voiceList.map((v) => <option key={v.name} value={v.name}>{v.name.replace(/Microsoft |Online \(Natural\) - /g, "")} · {v.lang}</option>)}
          </select>
        </label>
        <label>Sunna
          <select value={engine} onChange={(e) => setEngine(e.target.value)}>
            <option value="auto">Whisper (laptop / Groq)</option><option value="browser">Browser (Chrome/Edge)</option>
          </select>
        </label>
        <button className="jv-chip" onClick={() => { const v = pickVoice(); speak(gender === "female" ? "Salam Boss, main Friday hoon." : "Salam Sir, main Jarvis hoon.", {}); setNotice(v ? `Awaz: ${v.name} (${v.lang})` : "Koi awaz nahi mili"); }}>Awaz suno</button>
      </section>

      {status && (
        <div className="jv-status">
          <span className={status.ollama?.running ? "ok" : "bad"}>Ollama: {status.ollama?.running ? (status.ollama.models?.[0]?.name || "chal raha") : "band"}</span>
          <span className={status.localStt ? "ok" : "mid"}>Whisper laptop: {status.localStt ? "haan" : "nahi"}</span>
          <span className={status.chromeDevtools ? "ok" : "mid"}>Chrome control: {status.chromeDevtools ? "haan" : "seedha link"}</span>
          <span>Seekhe qawaid: {status.stats?.notes || 0}</span>
        </div>
      )}
      {notice && <div className="jv-notice" role="status">{notice}</div>}

      <section className="jv-log" aria-live="polite">
        {turns.length === 0 && <p className="jv-hint">Shuru dabayein aur boliye: &quot;Chrome kholo&quot;, &quot;YouTube par naat chalao&quot;, &quot;Downloads folder kholo&quot;, &quot;screenshot lo&quot;, &quot;awaz kam karo&quot;, ya bas apni baat. Beech mein bolein to Jarvis ruk jata hai. &quot;Bas&quot; kahein to band.</p>}
        {turns.map((t, i) => (
          <div key={i} className={"jv-msg " + t.role}>
            <b>{t.role === "user" ? "Aap" : name}</b> {t.content}
            {t.role === "assistant" && (t.brain || t.action) && <small>{[t.action && "kaam: " + t.action, t.brain].filter(Boolean).join(" · ")}</small>}
          </div>
        ))}
        <div ref={endRef} />
      </section>

      <form className="jv-type" onSubmit={sendTyped}>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Ya yahan likhein..." aria-label="Jarvis ko likh kar bhejein" />
        <button type="submit" aria-label="Bhejein"><Icon name="send" size={16} /></button>
        <button type="button" className="jv-chip" onClick={() => { setTurns([]); }} title="Baat cheet saaf">Saaf</button>
      </form>

      {imp && (
        <div className="jv-imp" role="dialog" aria-label="Self-Improve">
          <div className="jv-imp-box">
            <div className="jv-imp-head"><b>Self-Improve</b><button onClick={() => setImp(null)} aria-label="Band"><Icon name="x" size={16} /></button></div>
            {imp.loading ? <p>Jarvis apni pichli baat cheet parh raha hai...</p> : <>
              {imp.msg && <p>{imp.msg}</p>}
              {imp.added?.length > 0 && <p className="ok">Naye qawaid seekhe ({imp.brain}): ye ab har jawab mein lagenge.</p>}
              <h4>Seekhe hue qawaid</h4>
              {(imp.notes || []).length === 0 ? <p className="muted">Abhi koi nahi.</p> : (imp.notes || []).map((n) => (
                <div className="jv-note" key={n.id}><span>{n.text}</span><button onClick={() => delNote(n.id)} title="Hatayein"><Icon name="trash" size={14} /></button></div>
              ))}
              {imp.ideas?.length > 0 && <>
                <h4>Code behtar karne ke mashware</h4>
                {imp.ideas.map((x, i) => <div className="jv-note" key={i}><span>{x}</span><button onClick={() => { navigator.clipboard?.writeText(`Jarvis page (app/jarvis, lib/jarvis) mein yeh behtari karo: ${x}`); setNotice("Copy ho gaya. Agent Mode mein paste karein, wahan aap ki ijazat se code badlega."); }} title="Agent Mode ke liye copy"><Icon name="copy" size={14} /></button></div>)}
                <Link href="/agent" className="jv-chip on">Agent Mode kholein</Link>
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
.jv{min-height:100vh;background:radial-gradient(ellipse at 50% 30%,#0b1d2e 0%,#05080f 60%,#020306 100%);color:#d9f3ff;font-family:var(--font, system-ui, sans-serif);padding:14px 18px 90px;display:flex;flex-direction:column;gap:12px}
.jv-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.jv-back{display:inline-flex;gap:6px;align-items:center;color:#9cc8dd;text-decoration:none;font-size:14px}
.jv-title{font-weight:700;letter-spacing:.25em;font-size:18px;color:var(--jc);text-shadow:0 0 12px var(--jc);display:flex;align-items:center;gap:10px}
.jv-dot{width:9px;height:9px;border-radius:50%;background:#456}.jv-dot.listening{background:#5dffa8;box-shadow:0 0 8px #5dffa8}.jv-dot.thinking{background:#ffc95c}.jv-dot.speaking{background:var(--jc);box-shadow:0 0 8px var(--jc)}
.jv-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.jv-chip{background:rgba(79,209,255,.08);border:1px solid rgba(79,209,255,.3);color:#cfefff;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer;text-decoration:none;min-height:34px;display:inline-flex;align-items:center}
.jv-chip.on{background:var(--jc);color:#03121c;border-color:var(--jc)}
.jv-improve{display:inline-flex;gap:6px;align-items:center;background:linear-gradient(90deg,rgba(93,255,168,.15),rgba(79,209,255,.15));border:1px solid var(--jc);color:#eafaff;border-radius:10px;padding:8px 12px;font-weight:600;cursor:pointer;min-height:36px}
.jv-improve:focus-visible,.jv-chip:focus-visible,.jv-core:focus-visible{outline:2px solid #fff;outline-offset:3px}
.jv-hud{position:relative;height:330px;display:grid;place-items:center}
.jv-ring{position:absolute;border-radius:50%;border:1px solid var(--jc);opacity:.35}
.jv-ring.r1{width:300px;height:300px;border-style:dashed;animation:jvspin 24s linear infinite}
.jv-ring.r2{width:240px;height:240px;border-width:3px;border-color:transparent var(--jc) transparent var(--jc);animation:jvspin 9s linear infinite reverse;opacity:.6}
.jv-ring.r3{width:190px;height:190px;opacity:.25}
.jv-core{width:150px;height:150px;border-radius:50%;border:2px solid var(--jc);background:radial-gradient(circle,rgba(79,209,255,.35),rgba(5,12,20,.9) 70%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;box-shadow:0 0 40px var(--jc),inset 0 0 30px var(--jc);transition:transform .08s linear,box-shadow .3s ease;font-size:13px}
.jv-core.thinking{animation:jvpulse 1.1s ease-in-out infinite}
.jv-emo{position:absolute;bottom:6px;font-size:13px;color:var(--jc)}
@keyframes jvspin{to{transform:rotate(360deg)}}
@keyframes jvpulse{50%{box-shadow:0 0 70px var(--jc),inset 0 0 40px var(--jc)}}
@media (prefers-reduced-motion: reduce){.jv-ring,.jv-core{animation:none!important;transition:none!important}}
.jv-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:center}
.jv-bar label{display:flex;flex-direction:column;font-size:12px;color:#8fb5c8;gap:4px}
.jv-bar select{background:#08131d;color:#e5f7ff;border:1px solid rgba(79,209,255,.3);border-radius:8px;padding:7px;min-height:36px;max-width:260px}
.jv-status{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;font-size:12px}
.jv-status span{padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.05)}
.jv-status .ok{color:#5dffa8}.jv-status .bad{color:#ff7a6b}.jv-status .mid{color:#ffc95c}
.jv-notice{text-align:center;color:#ffd98a;font-size:13px}
.jv-log{max-width:820px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:8px}
.jv-hint{color:#8fb5c8;text-align:center;font-size:14px;line-height:1.6}
.jv-msg{padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.04);line-height:1.5;font-size:15px}
.jv-msg.user{align-self:flex-end;background:rgba(79,209,255,.1)}
.jv-msg b{color:var(--jc);margin-right:6px;font-size:12px;letter-spacing:.08em}
.jv-msg small{display:block;color:#6f93a6;font-size:11px;margin-top:3px}
.jv-type{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;width:min(820px,94vw);display:flex;gap:8px}
.jv-type input{flex:1;background:#08131d;border:1px solid rgba(79,209,255,.3);color:#fff;border-radius:12px;padding:12px;min-height:44px}
.jv-type button[type=submit]{width:46px;border-radius:12px;border:1px solid var(--jc);background:rgba(79,209,255,.15);color:#fff;cursor:pointer}
.jv-imp{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:flex-end;z-index:50}
.jv-imp-box{width:min(440px,100vw);height:100%;overflow:auto;background:#07111a;border-left:1px solid var(--jc);padding:16px;display:flex;flex-direction:column;gap:8px}
.jv-imp-head{display:flex;justify-content:space-between;align-items:center}
.jv-imp-head button,.jv-note button{background:none;border:0;color:#9cc8dd;cursor:pointer;min-width:32px;min-height:32px}
.jv-imp h4{margin:10px 0 2px;color:var(--jc);font-size:13px}
.jv-note{display:flex;gap:8px;justify-content:space-between;align-items:flex-start;background:rgba(255,255,255,.04);border-radius:8px;padding:8px;font-size:14px}
.jv-imp .ok{color:#5dffa8}.jv-imp .muted{color:#7d9aab;font-size:12px}
`;
