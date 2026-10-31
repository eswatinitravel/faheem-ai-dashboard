"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./components/Icon";
import Link from "next/link";
import Message from "./components/Message";
import Background from "./components/Background";
import ThemeBalls from "./components/ThemeBalls";
import VersionBadge from "./components/VersionBadge";
import SearchOverlay from "./components/SearchOverlay";
import Workspace from "./components/Workspace";
import { loadPrefs } from "../lib/prefs";
import { prepareFiles, forServer, forStorage } from "../lib/attach";

const STORE = "faheem-ai-chats-v2";

function speakable(text) {
  return text.replace(/```[\s\S]*?```/g, " code block ").replace(/[*_#>`|]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/\s+/g, " ").trim();
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("idle");
  const [prefs, setPrefs] = useState({ agent: "auto", provider: "auto", speakReplies: true, voiceChoice: "urdu-female" });
  const [voiceOn, setVoiceOn] = useState(false);
  const [notice, setNotice] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [job, setJob] = useState(null);
  const [log, setLog] = useState([]);
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  const filesRef = useRef([]);
  filesRef.current = files;
  const { speakReplies, voiceChoice } = prefs;

  const endRef = useRef(null);
  const levelRef = useRef(0);
  const recRef = useRef(null);
  const voiceOnRef = useRef(false);
  const messagesRef = useRef([]);
  voiceOnRef.current = voiceOn;
  messagesRef.current = messages;

  useEffect(() => {
    try { setMessages(JSON.parse(localStorage.getItem(STORE) || "[]")); } catch {}
    setPrefs(loadPrefs());
    const p = new URLSearchParams(location.search);
    if (p.get("live")) { setWsOpen(true); }
    // v3.11: Gallery / skill page se "Chat mein bhejein" — file attach + sawal tayyar.
    try {
      const h = JSON.parse(sessionStorage.getItem("faheem-handoff") || "null");
      if (h?.url && h.url.startsWith("/api/gallery?file=")) {
        sessionStorage.removeItem("faheem-handoff");
        fetch(h.url).then((r) => (r.ok ? r.blob() : Promise.reject(new Error("file nahi mili")))).then((b) => prepareFiles([new File([b], h.name || "file", { type: b.type.split(";")[0] })]))
          .then((add) => { setFiles((f) => [...f, ...add].slice(0, 6)); if (h.prompt) setInput(h.prompt); setNotice("Gallery se file lag gayi — Send dabayein."); })
          .catch((e) => setNotice("Gallery file nahi lagi: " + e.message));
      }
    } catch {}
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setShowSearch(true); } };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  useEffect(() => {
    // Pictures sirf aakhri 10 messages mein save hoti hain taake storage na bhare.
    const keep = messages.slice(-100);
    const pack = (n) => keep.map((m, i) => (m.attachments ? { ...m, attachments: m.attachments.map((a) => forStorage(a, i >= keep.length - n)) } : m));
    try { localStorage.setItem(STORE, JSON.stringify(pack(10))); }
    catch { try { localStorage.setItem(STORE, JSON.stringify(pack(0))); } catch {} }
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
      const urduText = /[\u0600-\u06FF]/.test(text);
      const ur = voices.filter((v) => v.lang.toLowerCase().startsWith("ur"));
      const pk = ur.filter((v) => /PK/i.test(v.lang));
      const female = (list) => list.find((v) => /Uzma|female|aurat/i.test(v.name));
      const male = (list) => list.find((v) => /Asad|male/i.test(v.name) && !/female/i.test(v.name));
      let pick = null;
      if (voiceChoice !== "english" || urduText) {
        pick = voiceChoice === "urdu-male"
          ? male(pk) || male(ur) || pk[0] || ur[0]
          : female(pk) || female(ur) || pk[0] || ur[0];
      }
      if (!pick) pick =
        voices.find((v) => /Natural/i.test(v.name) && v.lang.startsWith("en")) ||
        voices.find((v) => /Microsoft/i.test(v.name) && v.lang.startsWith("en")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (pick) { u.voice = pick; u.lang = pick.lang; }
      u.rate = 1.0;
      u.onend = resolve;
      u.onerror = resolve;
      setMode("speaking");
      synth.speak(u);
    });
  }, [voiceChoice]);

  // ---------- Send: server streams agent steps live ----------
  const send = useCallback(
    async (textArg, opts = {}) => {
      const attached = opts.voice ? [] : filesRef.current;
      let text = (textArg ?? "").trim();
      if (!text && !attached.length) return;
      if (!text) text = attached.some((a) => a.kind === "image") ? "Is picture ke bare mein batao." : "Is file ko dekho.";
      const userMsg = { role: "user", content: text, voice: !!opts.voice };
      if (attached.length) userMsg.attachments = attached;
      const next = [...messagesRef.current, userMsg];
      setFiles([]);
      setMessages(next);
      setInput("");
      setMode("thinking");
      setWsOpen(true);
      setJob({ busy: true, attached });
      setLog([{ who: "Aap", text: text.length > 90 ? text.slice(0, 90) + "…" : text }]);
      let reply = "";
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next.map((m, i) => (m.attachments ? { ...m, attachments: m.attachments.map(forServer).map((a) => (i === next.length - 1 || a.kind !== "image" ? a : { ...a, dataUrl: undefined })) } : m)), provider: prefs.provider, agent: prefs.agent, voice: !!opts.voice, voiceLang: voiceChoice === "english" ? "en" : "ur" }),
        });
        if (!res.ok || !res.body) throw new Error("Server se jawab nahi aaya (" + res.status + ")");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "", done = null;
        for (;;) {
          const { value, done: end } = await reader.read();
          if (end) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line);
            if (ev.type === "step") setLog((l) => [...l, ev]);
            else if (ev.type === "task") setJob((j) => ({ ...j, agent: ev.agent, task: ev.task }));
            else if (ev.type === "image") setJob((j) => ({ ...j, images: ev.urls }));
            else if (ev.type === "video") setJob((j) => ({ ...j, video: ev.urls }));
            else if (ev.type === "done") done = ev;
            else if (ev.type === "error") throw new Error([ev.error, ...(ev.details || [])].join("\n"));
          }
        }
        if (!done) throw new Error("Jawab adhoora reh gaya, dobara bhejein.");
        reply = done.reply;
        setJob((j) => ({ ...j, busy: false, reply, agent: done.agent }));
        setMessages([...next, { role: "assistant", content: reply, meta: `${done.agent?.icon || ""} ${done.agent?.name || ""} · ${done.provider}` }]);
      } catch (err) {
        setJob((j) => ({ ...j, busy: false }));
        setLog((l) => [...l, { who: "Error", text: err.message.split("\n")[0] }]);
        setMessages([...next, { role: "assistant", content: "⚠️ " + err.message, meta: "error" }]);
        setMode("idle");
        return;
      }
      if (reply && opts.voice && speakReplies) await speak(reply);
      setMode("idle");
      if (opts.voice && voiceOnRef.current) setTimeout(() => startListening(), 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefs, speakReplies, speak, voiceChoice]
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

  function newChat() {
    if (messages.length) {
      try {
        const a = JSON.parse(localStorage.getItem("faheem-ai-archive") || "[]");
        a.unshift({ date: new Date().toLocaleString(), messages });
        localStorage.setItem("faheem-ai-archive", JSON.stringify(a.slice(0, 50)));
      } catch {}
    }
    setMessages([]); setJob(null); setLog([]);
  }

  return (
    <main className={"front" + (wsOpen ? " ws-on" : "")}>
      <Background />

      <header className="topbar">
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> Faheem AI <span className={"stat " + mode} /></div>
        <div className="top-actions">
          <button className="icon-btn" title="Search (Ctrl+K)" aria-label="Search" onClick={() => setShowSearch(true)}><Icon name="search" /></button>
          <button className="icon-btn" title="Naya chat" aria-label="Naya chat" onClick={newChat}><Icon name="plus" /></button>
          <button className="icon-btn" title="Live workspace" aria-label="Live workspace" onClick={() => setWsOpen(!wsOpen)}><Icon name="panel" /></button>
          <ThemeBalls />
          <Link className="icon-btn agentlink" href="/agent" title="Agent Mode (Cursor jaisa coding agent)"><Icon name="bot" size={16} /> Agent</Link>
          <Link className="icon-btn agentlink" href="/brains" title="Brains Rooms: har brain ka apna kamra + status light"><Icon name="brain" size={16} /> Brains</Link>
          <Link className="icon-btn agentlink" href="/tools" title="Har brain ka apna chat board"><Icon name="flask" size={16} /> Tools</Link>
          <Link className="icon-btn agentlink" href="/design" title="Design Studio (UI UX Pro Max)"><Icon name="palette" size={16} /> Design</Link>
          <Link className="icon-btn agentlink" href="/skills" title="Saari skills: Hallmark, UI UX Pro Max, Impeccable, Agentation, Hermes"><Icon name="grid" size={16} /> Skills</Link>
          <Link className="icon-btn" href="/meta" title="Meta AI tasveer edit" aria-label="Meta AI tasveer edit"><Icon name="sparkle" /></Link>
          <Link className="icon-btn" href="/skills/guide" title="Skills guide (aasaan Roman Urdu)" aria-label="Skills guide"><Icon name="check" /></Link>
          <Link className="icon-btn" href="/gallery" title="Gallery (pictures/files)" aria-label="Gallery"><Icon name="image" /></Link>
          <Link className="icon-btn" href="/options" title="Options" aria-label="Options"><Icon name="more" /></Link>
        </div>
      </header>

      {wsOpen && <Workspace job={job} log={log} onClose={() => setWsOpen(false)} />}

      <section className="chatboard">
        <div className="msgs">
          {messages.length === 0 && (
            <div className="hello">
              <h1>Assalam o Alaikum, Faheem</h1>
              <p>Kya banayein aaj? Likhein ya bol kar batayein.</p>
              <div className="chips">
                {["Vestire ke liye leather jacket ki picture banao", "Vestire ka hero section website bana do", "Mera aaj ka kaam plan karo"].map((c) => (
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

        {files.length > 0 && (
          <div className="pending">
            {files.map((a, i) => (
              <div key={i} className="pend">
                {a.kind === "image" ? <img src={a.dataUrl} alt="" /> : a.kind === "video" ? <video src={a.url} muted /> : <span className="pend-ico">{a.kind === "text" ? "📄" : "📎"}</span>}
                <small>{a.name}</small>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} title="Hatao">✕</button>
              </div>
            ))}
          </div>
        )}
        <form className={"composer" + (drag ? " drag" : "")} onSubmit={(e) => { e.preventDefault(); send(input); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={async (e) => { e.preventDefault(); setDrag(false); const add = await prepareFiles(e.dataTransfer.files); setFiles((f) => [...f, ...add].slice(0, 6)); }}>
          <input ref={fileRef} type="file" hidden multiple accept="image/*,video/*,.txt,.md,.csv,.json,.html,.css,.js,.jsx,.ts,.tsx,.py,.xml,.yml,.yaml,.log,.sql,.pdf,.doc,.docx,.xls,.xlsx,.zip"
            onChange={async (e) => { const add = await prepareFiles(e.target.files); setFiles((f) => [...f, ...add].slice(0, 6)); e.target.value = ""; }} />
          <button type="button" className="attach" onClick={() => fileRef.current?.click()} title="Gallery se picture, video ya file">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            onPaste={async (e) => { const fl = Array.from(e.clipboardData?.files || []); if (fl.length) { e.preventDefault(); const add = await prepareFiles(fl); setFiles((f) => [...f, ...add].slice(0, 6)); } }}
            placeholder="Faheem AI se kuch bhi kahein… (📎 se picture / video / file)"
            rows={1}
          />
          <button type="button" className={"mic " + (voiceOn || mode === "listening" ? "on" : "")} onClick={toggleVoice} title="Bol kar baat karein">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" /></svg>
          </button>
          <button type="submit" className="sendbtn" disabled={mode === "thinking" || (!input.trim() && !files.length)} title="Send">➤</button>
        </form>
      </section>

      <VersionBadge />
      {showSearch && <SearchOverlay messages={messages} onClose={() => setShowSearch(false)} onAsk={(q) => send(q)} />}
    </main>
  );
}
