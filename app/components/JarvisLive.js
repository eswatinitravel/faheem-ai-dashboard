"use client";
// v3.42 Jarvis Live: Gemini Live se asli waqt ki baat (beech mein tok sakte hain), screen/camera share,
// "Hey Jarvis" se jagana, aur floating orb (har window ke upar, Document Picture-in-Picture).
// Laptop kaam sirf /api/jarvis/live (tool) se, wahi purani allowlist aur "haan" hifazat.
// Idea: MYRA ULTRA (codeninjavik/myra-ultra, MIT): Gemini Live awaz, screen share, floating orb. Code apna.
import { useCallback, useEffect, useRef, useState } from "react";

const WORKLET = `class P extends AudioWorkletProcessor{constructor(){super();this.r=sampleRate/16000;this.acc=0;this.buf=[]}
process(inp){const ch=inp[0]&&inp[0][0];if(!ch)return true;for(let i=0;i<ch.length;i++){this.acc+=1;if(this.acc>=this.r){this.acc-=this.r;const s=Math.max(-1,Math.min(1,ch[i]));this.buf.push(s<0?s*32768:s*32767)}}
if(this.buf.length>=1600){const a=new Int16Array(this.buf.splice(0,1600));let m=0;for(let i=0;i<a.length;i++)m+=Math.abs(a[i]);this.port.postMessage({pcm:a.buffer,level:m/a.length/32768},[a.buffer])}return true}}
registerProcessor("jarvis-pcm",P);`;

const b64 = (buf) => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
const WAKE = /\b(hey|hay|hi|ok|o)?\s*(jarvis|jarwis|jarvish|jervis|jarviz)\b|जार्विस|جارویس|جاروس/i;

export default function JarvisLive({ open = true, onClose, gender = "male", name = "" }) {
  const [state, setState] = useState("off"); // off | connecting | live | error
  const [note, setNote] = useState("");
  const [log, setLog] = useState([]);
  const [share, setShare] = useState(""); // "" | screen | camera
  const [wake, setWake] = useState(false);
  const ws = useRef(null), micCtx = useRef(null), micStream = useRef(null), outCtx = useRef(null), nextAt = useRef(0), sources = useRef(new Set());
  const pending = useRef(null), level = useRef(0), outLevel = useRef(0), vidStream = useRef(null), vidTimer = useRef(null), vidEl = useRef(null);
  const pip = useRef(null), orbEl = useRef(null), rec = useRef(null), wakeOn = useRef(false), stateRef = useRef("off"), line = useRef({ u: "", j: "" });
  const setS = (s) => { stateRef.current = s; setState(s); };
  const add = (who, text) => setLog((l) => [...l.slice(-40), { who, text, at: Date.now() }]);

  const send = (o) => { if (ws.current?.readyState === 1) ws.current.send(JSON.stringify(o)); };
  const stopPlayback = () => { for (const s of sources.current) { try { s.stop(); } catch {} } sources.current.clear(); nextAt.current = 0; };
  const play = (data) => {
    const ctx = outCtx.current; if (!ctx) return;
    const pcm = new Int16Array(unb64(data)); const f = new Float32Array(pcm.length); let m = 0;
    for (let i = 0; i < pcm.length; i++) { f[i] = pcm[i] / 32768; m += Math.abs(f[i]); }
    outLevel.current = Math.min(1, (m / pcm.length) * 6);
    const buf = ctx.createBuffer(1, f.length, 24000); buf.copyToChannel(f, 0);
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
    const at = Math.max(ctx.currentTime + 0.02, nextAt.current); src.start(at); nextAt.current = at + buf.duration;
    sources.current.add(src); src.onended = () => sources.current.delete(src);
  };

  const stopVideo = useCallback(() => { clearInterval(vidTimer.current); vidTimer.current = null; vidStream.current?.getTracks().forEach((t) => t.stop()); vidStream.current = null; setShare(""); }, []);
  const stop = useCallback((why = "") => {
    try { ws.current?.close(); } catch {} ws.current = null;
    micStream.current?.getTracks().forEach((t) => t.stop()); micStream.current = null;
    try { micCtx.current?.close(); } catch {} micCtx.current = null;
    stopPlayback(); try { outCtx.current?.close(); } catch {} outCtx.current = null;
    stopVideo(); pending.current = null; setS("off"); if (why) setNote(why);
  }, [stopVideo]);

  const onTool = async (call) => {
    const responses = [];
    for (const fc of call.functionCalls || []) {
      const hukum = String(fc.args?.hukum || "");
      add("tool", "⚙ " + hukum);
      let r;
      try { r = await fetch("/api/jarvis/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "tool", hukum, pending: pending.current, gender }) }).then((x) => x.json()); }
      catch (e) { r = { reply: "Laptop se jawab nahi aaya: " + e.message, pending: null }; }
      pending.current = r.pending || null;
      responses.push({ id: fc.id, name: fc.name, response: { result: r.reply || "" } });
    }
    send({ toolResponse: { functionResponses: responses } });
  };

  const onMsg = async (ev) => {
    let m; try { m = JSON.parse(typeof ev.data === "string" ? ev.data : await ev.data.text()); } catch { return; }
    if (m.setupComplete) { setS("live"); setNote("Bolein, main sun raha hoon. Beech mein tok bhi sakte hain."); return; }
    if (m.toolCall) { onTool(m.toolCall); return; }
    if (m.goAway) setNote("Session thori der mein khatam hoga; phir dobara Live dabayein.");
    const sc = m.serverContent; if (!sc) return;
    if (sc.interrupted) stopPlayback();
    for (const p of sc.modelTurn?.parts || []) if (p.inlineData?.data && /audio/.test(p.inlineData.mimeType || "audio")) play(p.inlineData.data);
    if (sc.inputTranscription?.text) line.current.u += sc.inputTranscription.text;
    if (sc.outputTranscription?.text) line.current.j += sc.outputTranscription.text;
    if (sc.turnComplete || sc.interrupted) {
      if (line.current.u.trim()) add("u", line.current.u.trim());
      if (line.current.j.trim()) add("j", line.current.j.trim() + (sc.interrupted ? " …" : ""));
      line.current = { u: "", j: "" };
    }
  };

  const start = useCallback(async () => {
    if (stateRef.current === "live" || stateRef.current === "connecting") return;
    setS("connecting"); setNote("Jor raha hoon...");
    let cfg;
    try { cfg = await fetch("/api/jarvis/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", gender, name }) }).then((r) => r.json()); }
    catch (e) { cfg = { ok: false, error: e.message }; }
    if (!cfg?.ok) { setS("error"); setNote(cfg?.error || "Live shuru nahi hua."); return; }
    try {
      micStream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      micCtx.current = new AudioContext({ sampleRate: 16000 });
      outCtx.current = new AudioContext({ sampleRate: 24000 });
      await micCtx.current.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" })));
      const node = new AudioWorkletNode(micCtx.current, "jarvis-pcm");
      node.port.onmessage = (e) => { level.current = Math.min(1, e.data.level * 8); send({ realtimeInput: { audio: { data: b64(e.data.pcm), mimeType: "audio/pcm;rate=16000" } } }); };
      micCtx.current.createMediaStreamSource(micStream.current).connect(node);
    } catch (e) { stop(); setS("error"); setNote("Mic nahi mila: " + e.message); return; }
    const sock = new WebSocket(`${cfg.ws}?access_token=${encodeURIComponent(cfg.token)}`);
    ws.current = sock;
    sock.onopen = () => sock.send(JSON.stringify(cfg.setup));
    sock.onmessage = onMsg;
    sock.onerror = () => setNote("Google Live se raabta toot gaya.");
    sock.onclose = (e) => { if (ws.current === sock) stop(e.reason ? "Live band: " + e.reason.slice(0, 160) : "Live band ho gaya."); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender, name, stop]);

  const shareVideo = async (kind) => {
    if (share === kind) { stopVideo(); return; }
    stopVideo();
    try {
      vidStream.current = kind === "screen" ? await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 2 }, audio: false }) : await navigator.mediaDevices.getUserMedia({ video: { width: 960 } });
    } catch (e) { setNote((kind === "screen" ? "Screen" : "Camera") + " share nahi hua: " + e.message); return; }
    const v = vidEl.current; v.srcObject = vidStream.current; await v.play().catch(() => {});
    vidStream.current.getVideoTracks()[0].onended = () => stopVideo();
    const c = document.createElement("canvas");
    vidTimer.current = setInterval(() => {
      if (!v.videoWidth || ws.current?.readyState !== 1) return;
      const s = Math.min(1, 1024 / v.videoWidth); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      send({ realtimeInput: { video: { data: c.toDataURL("image/jpeg", 0.6).split(",")[1], mimeType: "image/jpeg" } } });
    }, 1000); // Live API: zyada se zyada 1 tasveer/second
    setShare(kind); setNote(kind === "screen" ? "Jarvis ab aap ki screen dekh raha hai." : "Jarvis ab camera se dekh raha hai.");
  };

  // Floating orb: Chrome/Edge 116+ ka Document Picture-in-Picture (har app ke upar rehta hai).
  const orbOut = async () => {
    if (!("documentPictureInPicture" in window)) { setNote("Floating orb ke liye Chrome ya Edge (naya) chahiye."); return; }
    if (pip.current) { pip.current.close(); return; }
    const w = await window.documentPictureInPicture.requestWindow({ width: 200, height: 230 });
    w.document.body.innerHTML = `<style>body{margin:0;background:#05070f;display:grid;place-items:center;height:100vh;font:13px system-ui;color:#9cc4ff;gap:6px}
#o{width:110px;height:110px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#bfe6ff,#2f7cff 45%,#0a1a3a 75%);box-shadow:0 0 30px #2f7cff99;cursor:pointer;transition:transform .08s}
#o.off{filter:grayscale(.8) brightness(.7)}</style><div id="o" title="Dabayein: Live shuru/band"></div><div id="s"></div>`;
    w.document.getElementById("o").onclick = () => (stateRef.current === "live" ? stop("") : start());
    pip.current = w; w.addEventListener("pagehide", () => { pip.current = null; });
  };

  // "Hey Jarvis": page khula ho to browser sunta rehta hai; naam sunte hi Live shuru.
  const startWake = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setNote("Is browser mein 'Hey Jarvis' nahi chalta (Chrome/Edge chahiye)."); setWake(false); return; }
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = "en-IN";
    r.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (WAKE.test(e.results[i][0].transcript)) { try { r.stop(); } catch {} start(); return; } };
    r.onend = () => { if (wakeOn.current && stateRef.current !== "live" && stateRef.current !== "connecting") setTimeout(() => { try { r.start(); } catch {} }, 400); };
    r.onerror = (e) => { if (e.error === "not-allowed") { wakeOn.current = false; setWake(false); setNote("Mic ki ijazat nahi."); } };
    rec.current = r; try { r.start(); } catch {}
  }, [start]);
  useEffect(() => {
    wakeOn.current = wake; try { localStorage.setItem("jarvisWake", wake ? "1" : ""); } catch {}
    if (wake && state !== "live" && state !== "connecting") startWake();
    if (!wake || state === "live") { try { rec.current?.stop(); } catch {} }
  }, [wake, state, startWake]);
  useEffect(() => { try { if (localStorage.getItem("jarvisWake")) setWake(true); } catch {} }, []);

  // Orb ki dhadkan (awaz ke saath)
  useEffect(() => {
    let raf;
    const tick = () => {
      const l = Math.max(level.current, outLevel.current); level.current *= 0.85; outLevel.current *= 0.9;
      const sc = 1 + l * 0.35; const off = stateRef.current !== "live";
      if (orbEl.current) { orbEl.current.style.transform = `scale(${sc})`; orbEl.current.classList.toggle("off", off); }
      const po = pip.current?.document.getElementById("o"); if (po) { po.style.transform = `scale(${sc})`; po.classList.toggle("off", off); const s = pip.current.document.getElementById("s"); if (s) s.textContent = off ? "Dabayein" : "Sun raha hoon"; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => () => { stop(""); wakeOn.current = false; try { rec.current?.stop(); } catch {} try { pip.current?.close(); } catch {} }, [stop]);

  const live = state === "live";
  return (
    <div className="jl-back" role="dialog" aria-label="Jarvis Live" data-jarvis-live style={open ? undefined : { display: "none" }} onClick={onClose}>
      <div className="jl" onClick={(e) => e.stopPropagation()}>
        <div className="jl-head"><b>Jarvis Live</b><span className={"jl-st " + state}>{{ off: "Band", connecting: "Jor raha...", live: "Live", error: "Masla" }[state]}</span><button onClick={onClose} aria-label="Band">✕</button></div>
        <div className="jl-orbwrap"><div ref={orbEl} className="jl-orb off" onClick={() => (live ? stop("") : start())} title={live ? "Band karein" : "Live shuru"} /></div>
        <p className="jl-note">{note || "Orb dabayein ya 'Hey Jarvis' bolein. Jarvis foran jawab deta hai, aur aap beech mein tok sakte hain."}</p>
        <div className="jl-btns">
          <button className={live ? "on" : ""} onClick={() => (live ? stop("") : start())}>{live ? "■ Band" : "● Live shuru"}</button>
          <button className={share === "screen" ? "on" : ""} disabled={!live} onClick={() => shareVideo("screen")}>🖥 Screen dikhao</button>
          <button className={share === "camera" ? "on" : ""} disabled={!live} onClick={() => shareVideo("camera")}>📷 Camera</button>
          <button className={wake ? "on" : ""} onClick={() => setWake((w) => !w)} title="Page khula ho to 'Hey Jarvis' sun kar Live shuru">👂 Hey Jarvis{wake ? ": On" : ""}</button>
          <button onClick={orbOut} title="Chhota orb har window ke upar">◉ Floating orb</button>
        </div>
        <video ref={vidEl} muted playsInline className={"jl-vid" + (share ? "" : " hide")} />
        <div className="jl-log">{log.map((x, i) => <div key={i} className={"jl-m " + x.who}>{x.text}</div>)}</div>
        <p className="jl-small">Gemini Live (Google ki free key). Awaz Google tak jati hai; laptop ke kaam aur "haan" wali hifazat laptop par. Khatarnak kaam se pehle Jarvis poochhega.</p>
      </div>
      <style>{`.jl-back{position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center;z-index:70}
.jl{background:#070d18;border:1px solid #1e3550;border-radius:18px;padding:16px;width:min(94vw,520px);max-height:92vh;overflow:auto;color:#cfe8ff;display:grid;gap:10px}
.jl-head{display:flex;align-items:center;gap:10px}.jl-head b{font-size:17px}.jl-head button{margin-left:auto;background:none;border:0;color:#cfe8ff;font-size:18px;cursor:pointer}
.jl-st{font-size:12px;padding:2px 8px;border-radius:99px;background:#1a2638}.jl-st.live{background:#0f3d2a;color:#7ef0b5}.jl-st.error{background:#3d1520;color:#ffb3b3}
.jl-orbwrap{display:grid;place-items:center;padding:10px}.jl-orb{width:120px;height:120px;border-radius:50%;cursor:pointer;background:radial-gradient(circle at 35% 30%,#bfe6ff,#2f7cff 45%,#0a1a3a 75%);box-shadow:0 0 40px #2f7cff88,0 0 90px #2f7cff33;transition:transform .08s}
.jl-orb.off{filter:grayscale(.75) brightness(.75)}.jl-note{margin:0;text-align:center;color:#9cb7d3;font-size:14px}
.jl-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.jl-btns button{padding:9px 12px;border-radius:10px;border:1px solid #234;background:#0d1729;color:#cfe8ff;cursor:pointer;font-size:13px}
.jl-btns button.on{background:#2f7cff;border-color:#2f7cff;color:#fff}.jl-btns button:disabled{opacity:.45;cursor:default}
.jl-vid{width:100%;max-height:180px;border-radius:12px;background:#000;object-fit:contain}.jl-vid.hide{display:none}
.jl-log{display:grid;gap:6px;max-height:220px;overflow:auto}.jl-m{padding:8px 10px;border-radius:12px;font-size:14px;max-width:88%;white-space:pre-wrap}
.jl-m.u{margin-left:auto;background:#1b3a6b}.jl-m.j{background:#0f1c2e;border:1px solid #1e3550}.jl-m.tool{font-size:12px;color:#7d9bb8;background:none;padding:2px 4px}
.jl-small{margin:0;font-size:11px;color:#5f7d9a;text-align:center}`}</style>
    </div>
  );
}
