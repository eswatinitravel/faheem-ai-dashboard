"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Settings from "./components/Settings";
import Message from "./components/Message";

const Scene3D = dynamic(() => import("./components/Scene3D"), { ssr: false });

const STORE = "faheem-ai-chats-v2";

// Clean text before reading it aloud.
function speakable(text) {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[*_#>`|]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("idle"); // idle | listening | thinking | speaking
  const [providers, setProviders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [agent, setAgent] = useState("auto");
  const [update, setUpdate] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [provider, setProvider] = useState("auto");
  const [last, setLast] = useState(null);
  const [voiceOn, setVoiceOn] = useState(false); // hands-free conversation
  const [speakReplies, setSpeakReplies] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [notice, setNotice] = useState("");

  const endRef = useRef(null);
  const levelRef = useRef(0);
  const recRef = useRef(null);
  const voiceOnRef = useRef(false);
  const messagesRef = useRef([]);
  voiceOnRef.current = voiceOn;
  messagesRef.current = messages;

  const loadProviders = useCallback(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => { setProviders(d.providers || []); setAgents(d.agents || []); }).catch(() => {});
  }, []);

  useEffect(() => {
    try { setMessages(JSON.parse(localStorage.getItem(STORE) || "[]")); } catch {}
    loadProviders();
    window.speechSynthesis?.getVoices();
    fetch("/api/update").then((r) => r.json()).then(setUpdate).catch(() => {});
  }, [loadProviders]);

  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify(messages.slice(-100)));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- Text to speech (Windows voices, free) ----------
  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) return resolve();
      synth.cancel();
      const u = new SpeechSynthesisUtterance(speakable(text));
      const voices = synth.getVoices();
      const urdu = /[\u0600-\u06FF]/.test(text);
      const pick =
        (urdu && voices.find((v) => v.lang.startsWith("ur"))) ||
        voices.find((v) => /Natural/i.test(v.name) && v.lang.startsWith("en")) ||
        voices.find((v) => /Microsoft/i.test(v.name) && v.lang.startsWith("en")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (pick) u.voice = pick;
      u.rate = 1.02;
      u.onend = resolve;
      u.onerror = resolve;
      setMode("speaking");
      synth.speak(u);
    });
  }, []);

  // ---------- Send a message ----------
  const send = useCallback(
    async (textArg, opts = {}) => {
      const text = (textArg ?? "").trim();
      if (!text) return;
      const next = [...messagesRef.current, { role: "user", content: text, voice: !!opts.voice }];
      setMessages(next);
      setInput("");
      setMode("thinking");
      let reply = "";
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next, provider, agent, voice: !!opts.voice }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error([data.error, ...(data.details || [])].join("\n"));
        reply = data.reply;
        setLast({ provider: data.provider, model: data.model, skipped: data.skipped, agent: data.agent });
        setMessages([...next, { role: "assistant", content: reply, meta: `${data.agent?.icon || ""} ${data.agent?.name || ""} · ${data.provider}` }]);
        loadProviders();
      } catch (err) {
        setMessages([...next, { role: "assistant", content: "⚠️ " + err.message, meta: "error" }]);
        setMode("idle");
        return;
      }
      if (reply && opts.voice && speakReplies) {
        await speak(reply);
      }
      setMode("idle");
      if (opts.voice && voiceOnRef.current) setTimeout(() => startListening(), 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provider, agent, speakReplies, speak, loadProviders]
  );

  // ---------- Voice input: record, detect silence, transcribe with Whisper ----------
  const stopListening = useCallback(() => {
    const r = recRef.current;
    if (r && r.recorder.state === "recording") r.recorder.stop();
  }, []);

  const startListening = useCallback(async () => {
    if (recRef.current) return;
    window.speechSynthesis?.cancel();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setNotice("Mic ki ijazat nahi mili. Browser mein mic Allow karein.");
      setVoiceOn(false);
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    let heard = false;
    let lastLoud = performance.now();
    const startedAt = performance.now();
    let raf;
    const watch = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      levelRef.current = Math.min(1, rms * 6);
      const now = performance.now();
      if (rms > 0.035) { heard = true; lastLoud = now; }
      const silentFor = now - lastLoud;
      if ((heard && silentFor > 1500) || now - startedAt > 30000 || (!heard && now - startedAt > 9000)) {
        stopListening();
        return;
      }
      raf = requestAnimationFrame(watch);
    };

    recorder.onstop = async () => {
      cancelAnimationFrame(raf);
      levelRef.current = 0;
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      recRef.current = null;
      if (!heard || chunks.length === 0) {
        setMode("idle");
        if (voiceOnRef.current) setNotice("Kuch suna nahi. Mic dabayein aur dobara bolein.");
        setVoiceOn(false);
        return;
      }
      setMode("thinking");
      try {
        const fd = new FormData();
        fd.append("audio", new Blob(chunks, { type: recorder.mimeType || "audio/webm" }), "speech.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!data.text) { setMode("idle"); setNotice("Awaaz samajh nahi aayi, dobara bolein."); return; }
        await send(data.text, { voice: true });
      } catch (err) {
        setNotice(err.message);
        setMode("idle");
        setVoiceOn(false);
      }
    };

    recRef.current = { recorder };
    recorder.start();
    setNotice("");
    setMode("listening");
    watch();
  }, [send, stopListening]);

  function toggleVoice() {
    if (voiceOn || mode === "listening" || mode === "speaking") {
      setVoiceOn(false);
      window.speechSynthesis?.cancel();
      stopListening();
      if (mode === "speaking") setMode("idle");
      return;
    }
    setVoiceOn(true);
    voiceOnRef.current = true;
    startListening();
  }

  const status = { idle: voiceOn ? "Ready" : "Online", listening: "Sun raha hoon…", thinking: "Soch raha hoon…", speaking: "Bol raha hoon…" }[mode];

  return (
    <main className="shell">
      <div className="aurora" aria-hidden="true" />
      <Scene3D mode={mode} levelRef={levelRef} />

      <aside className="panel side">
        <div className="brand"><span className="dot" /> Faheem AI</div>
        <div className={"status " + mode}><span className="pulse" />{status}</div>

        {update?.available && (
          <div className="update">
            <b>Naya version {update.latest}</b>
            <small>Aap ke paas {update.current}</small>
            <button disabled={updating} onClick={async () => { setUpdating(true); await fetch("/api/update", { method: "POST" }); setNotice("Update chal raha hai. Ek window khulegi; khatam hone par app khud dobara khulegi."); }}>
              {updating ? "Update ho raha hai…" : "⬆ Abhi update karein"}
            </button>
          </div>
        )}

        <label className="label">Master Agent</label>
        <select value={agent} onChange={(e) => setAgent(e.target.value)}>
          <option value="auto">🧠 Auto: Master khud chune</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
        </select>
        <div className="agents">
          {agents.filter((a) => a.id !== "general").map((a) => (
            <span key={a.id} className={"agent-chip " + (last?.agent?.id === a.id ? "active" : "")} title={a.name}>{a.icon} {a.name.replace(" Master", "")}</span>
          ))}
        </div>

        <label className="label">Brain</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="auto">Auto (best available)</option>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="plist">
          {providers.map((p) => (
            <div key={p.id} className="pitem">
              <span className={"led " + (p.cooling ? "warn" : "ok")} />
              <div><b>{p.name}</b><small>{p.model}</small></div>
            </div>
          ))}
        </div>

        <label className="toggle">
          <input type="checkbox" checked={speakReplies} onChange={(e) => setSpeakReplies(e.target.checked)} />
          <span>Voice mode mein jawab bol kar sunao</span>
        </label>

        {last && (
          <div className="last">
            Last reply: <b>{last.agent?.icon} {last.agent?.name}</b> via <b>{last.provider}</b>
            {last.skipped?.length > 0 && <small>Skipped: {last.skipped.join(" · ")}</small>}
          </div>
        )}

        <div className="side-actions">
          <button className="ghost" onClick={() => { setMessages([]); setLast(null); }}>＋ New chat</button>
          <button className="ghost" onClick={() => setShowSettings(true)}>⚙ Settings / Keys</button>
          <button className="ghost hark" onClick={() => { const q = [...messages].reverse().find((m) => m.role === "user")?.content; if (q) navigator.clipboard.writeText(q).catch(() => {}); window.open("https://hark.com", "_blank"); }}>
            ✦ Bada kaam? Hark se karwao
          </button>
          <small className="ver">v{update?.current || ""}</small>
        </div>
      </aside>

      <section className="panel chat">
        <div className="msgs">
          {messages.length === 0 && (
            <div className="hello">
              <h1>Assalam o Alaikum, Faheem</h1>
              <p>Likh kar poochein, ya 🎙 dabayein aur bol kar baat karein.</p>
              <button className="talk" onClick={toggleVoice}>🎙 Bol kar baat karein</button>
              <div className="chips">
                {["Vestire ke liye 5 product descriptions likho", "Eswatini se Lahore ka sasta rasta batao", "Mera aaj ka kaam plan karo"].map((c) => (
                  <button key={c} className="chip" onClick={() => send(c)}>{c}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => <Message key={i} m={m} />)}
          {mode === "thinking" && <div className="msg assistant"><div className="bubble typing"><i /><i /><i /></div></div>}
          <div ref={endRef} />
        </div>

        {notice && <div className="notice" onClick={() => setNotice("")}>{notice}</div>}

        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <button
            type="button"
            className={"mic " + (voiceOn || mode === "listening" ? "on" : "")}
            onClick={toggleVoice}
            title={voiceOn ? "Voice band karein" : "Bol kar baat karein"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" /></svg>
            <span>{mode === "speaking" ? "Stop" : voiceOn || mode === "listening" ? "Sun raha" : "Voice"}</span>
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Yahan likhein… (Enter = send)"
            rows={1}
          />
          <button type="submit" disabled={mode === "thinking" || !input.trim()}>Send ➤</button>
        </form>
      </section>

      {showSettings && <Settings onClose={() => { setShowSettings(false); loadProviders(); }} />}
    </main>
  );
}
