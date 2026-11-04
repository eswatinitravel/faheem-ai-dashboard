// Hey Puppy chat window: likh kar ya bol kar (Urdu / English), Allow/Deny cards, kaam ka log, yaad, settings.
// Awaz: mic -> khamoshi par ruk -> Groq Whisper (main process) -> jawab -> Edge awaz (ya Windows ki apni awaz).
// Interrupt: bolna shuru karein ya mic dabayein to Puppy chup ho jata hai.
const api = window.api;
const $ = (s) => document.querySelector(s);
const msgs = $("#msgs"), input = $("#input"), cards = $("#cards"), status = $("#status"), micBtn = $("#mic");
let audio = null, rec = null, wakeLoop = false, settings = {};

const isUrduScript = (t) => /[\u0600-\u06FF]/.test(t || "");
function add(role, text, meta = "", err = false) {
  const d = document.createElement("div");
  d.className = `m ${role}${err ? " err" : ""}`;
  if (isUrduScript(text)) d.dir = "rtl";
  d.textContent = text;
  if (meta) { const s = document.createElement("small"); s.textContent = meta; d.appendChild(s); }
  msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
}

// ---------- Bolna (interrupt ke sath) ----------
function stopSpeaking() { if (audio) { audio.pause(); audio = null; } try { speechSynthesis.cancel(); } catch {} }
api.on("play-audio", (b64) => { stopSpeaking(); audio = new Audio("data:audio/mpeg;base64," + b64); audio.play().catch(() => {}); });
api.on("speak-fallback", ({ text, lang }) => {
  stopSpeaking();
  try {
    const u = new SpeechSynthesisUtterance(text);
    const want = lang === "en" ? "en" : "ur";
    const v = speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith(want)) || speechSynthesis.getVoices().find((x) => x.lang.startsWith("hi"));
    if (v) { u.voice = v; u.lang = v.lang; }
    speechSynthesis.speak(u);
  } catch {}
});

async function send(text) {
  text = String(text || "").trim(); if (!text) return;
  stopSpeaking(); add("user", text); input.value = ""; status.textContent = "Puppy soch raha hai...";
  try {
    const r = await api.ask(text);
    add("bot", r.text, [r.brain, r.mood, ...(r.actions || []).map((a) => `${a.name}: ${a.status}`)].filter(Boolean).join(" · "), !!r.error);
  } catch (e) { add("bot", "Ghalti: " + e.message, "", true); }
  status.textContent = "";
}
$("#composer").addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });

// ---------- Mic: record -> khamoshi -> transcribe ----------
async function record({ maxMs = 20000, silenceMs = 1400, startTimeout = 7000 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext(); const src = ctx.createMediaStreamSource(stream); const an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
  const buf = new Uint8Array(an.fftSize); const r = new MediaRecorder(stream); const chunks = [];
  r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  let heard = false, lastLoud = performance.now(); const t0 = performance.now();
  return new Promise((resolve) => {
    const stop = () => { if (r.state === "recording") r.stop(); };
    rec = { stop };
    r.onstop = async () => { stream.getTracks().forEach((t) => t.stop()); ctx.close(); rec = null; resolve(heard && chunks.length ? new Blob(chunks, { type: r.mimeType || "audio/webm" }) : null); };
    r.start(250);
    const watch = () => {
      if (r.state !== "recording") return;
      an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) { const x = (v - 128) / 128; s += x * x; }
      const rms = Math.sqrt(s / buf.length), now = performance.now();
      if (rms > 0.035) { if (!heard && audio) stopSpeaking(); heard = true; lastLoud = now; } // interrupt: user bola to Puppy chup
      if ((heard && now - lastLoud > silenceMs) || now - t0 > maxMs || (!heard && now - t0 > startTimeout)) return stop();
      requestAnimationFrame(watch);
    };
    watch();
  });
}
async function listenOnce() {
  stopSpeaking(); micBtn.classList.add("on"); api.mood("listening"); status.textContent = "Sun raha hoon... (Urdu ya English)";
  try {
    const blob = await record();
    micBtn.classList.remove("on");
    if (!blob) { status.textContent = "Kuch suna nahi."; api.mood("happy"); return; }
    status.textContent = "Samajh raha hoon...";
    const { text } = await api.transcribe(new Uint8Array(await blob.arrayBuffer()), blob.type);
    status.textContent = "";
    if (text) await send(text); else api.mood("curious");
  } catch (e) { micBtn.classList.remove("on"); status.textContent = e.message; api.mood("sad"); }
}
micBtn.addEventListener("click", () => { if (rec) rec.stop(); else listenOnce(); });
api.on("ptt", () => { if (rec) rec.stop(); else listenOnce(); });

// "Hey Puppy" wake word: chhote tukde sun kar pehchaan (Settings mein on ho to).
async function wakeWordLoop() {
  if (wakeLoop) return; wakeLoop = true;
  while (settings.wake && wakeLoop) {
    if (rec) { await new Promise((r) => setTimeout(r, 500)); continue; }
    try {
      const blob = await record({ maxMs: 3500, silenceMs: 700, startTimeout: 15000 });
      if (!blob || !settings.wake) continue;
      const { text } = await api.transcribe(new Uint8Array(await blob.arrayBuffer()), blob.type);
      if (await api.isWake(text)) { api.mood("listening"); await listenOnce(); }
    } catch { await new Promise((r) => setTimeout(r, 5000)); }
  }
  wakeLoop = false;
}

// ---------- Allow / Deny cards ----------
api.on("allow-request", (q) => {
  const c = document.createElement("div"); c.className = "card"; c.id = "a-" + q.id;
  c.innerHTML = `<div><b>Ijazat?</b> <span class="what"></span></div><div class="acts"><button class="yes">Allow</button><button class="deny">Deny</button></div>`;
  c.querySelector(".what").textContent = q.text + (q.source !== "chat" ? ` (${q.source})` : "");
  c.querySelector(".yes").onclick = () => { api.allow(q.id, true); c.querySelector(".acts").textContent = "Chal raha hai..."; };
  c.querySelector(".deny").onclick = () => { api.allow(q.id, false); };
  cards.appendChild(c);
});
api.on("action-update", (u) => { const c = document.getElementById("a-" + u.id); if (!c) return; c.classList.add(u.status); c.querySelector(".acts").textContent = u.status === "denied" ? "Nahi kiya (Deny)" : u.status === "done" ? "Ho gaya: " + (u.result || "") : "Nahi hua: " + (u.result || ""); setTimeout(() => c.remove(), 15000); });
api.on("assistant", (r) => add("bot", r.text, "browser se"));
api.on("page", (p) => add("bot", `Page mil gaya: ${p.title}`, "Chrome extension"));
api.on("reminder", (x) => add("bot", `Yaad-dihani: ${x.text}`, "reminder"));
api.on("mood", (m) => { $("#moodchip").textContent = m; });

// ---------- Tabs: log, yaad, settings ----------
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", async () => {
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("on", p.id === b.dataset.tab));
  if (b.dataset.tab === "log" || b.dataset.tab === "memory") {
    const m = await api.memory();
    $("#loglist").innerHTML = ""; for (const l of m.log.reverse()) { const d = document.createElement("div"); d.className = "logrow"; d.innerHTML = `<b class="${l.ok ? "ok" : "no"}">${l.ok ? "OK" : "X"}</b> `; d.append(`${new Date(l.at).toLocaleString()} - ${l.tool}: ${l.result || ""}`); $("#loglist").appendChild(d); }
    if (!m.log.length) $("#loglist").textContent = "Abhi koi kaam nahi hua.";
    const ml = $("#memlist"); ml.innerHTML = "<h3>Aap ki pasand</h3>";
    m.memory.forEach((f, i) => { const d = document.createElement("div"); d.className = "logrow"; d.append(f + " "); const x = document.createElement("button"); x.className = "tab"; x.textContent = "Bhool jao"; x.onclick = async () => { await api.forget(i); b.click(); }; d.appendChild(x); ml.appendChild(d); });
    const h = document.createElement("h3"); h.textContent = "Seekha hua"; ml.appendChild(h);
    for (const l of m.lessons) { const d = document.createElement("div"); d.className = "logrow"; d.textContent = l; ml.appendChild(d); }
    const s = document.createElement("h3"); s.textContent = "Skills: " + (m.skills.join(", ") || "abhi koi nahi"); ml.appendChild(s);
  }
}));

async function loadSettings() {
  settings = await api.settings();
  const f = $("#setform");
  f.GROQ_API_KEY.value = settings.GROQ_API_KEY || ""; f.GROQ_API_KEY.placeholder = settings.hasEnvKey ? ".env mein key hai" : "gsk_...";
  f.GROQ_MODEL.value = settings.GROQ_MODEL || ""; f.OLLAMA_MODEL.value = settings.OLLAMA_MODEL || "";
  f.avatar.value = settings.avatar || "puppy"; f.lang.value = settings.lang || "auto"; f.roam.checked = settings.roam !== false; f.wake.checked = settings.wake === true;
  $("#token").textContent = settings.token || ""; $("#port").textContent = settings.port; $("#title").textContent = settings.persona?.assistantName || "Puppy";
  if (settings.wake) wakeWordLoop();
}
$("#setform").addEventListener("submit", async (e) => {
  e.preventDefault(); const f = e.target;
  await api.saveSettings({ GROQ_API_KEY: f.GROQ_API_KEY.value.trim(), GROQ_MODEL: f.GROQ_MODEL.value.trim(), OLLAMA_MODEL: f.OLLAMA_MODEL.value.trim(), avatar: f.avatar.value, lang: f.lang.value, roam: f.roam.checked, wake: f.wake.checked });
  $("#saved").textContent = "Save ho gaya"; await loadSettings();
});
loadSettings().then(() => add("bot", settings.persona?.greetingUr || "Assalam o Alaikum!", "Puppy"));
