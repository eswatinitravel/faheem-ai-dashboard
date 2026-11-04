// Hey Puppy - Electron main process.
// Puppy window: transparent, frameless, always-on-top, screen ke neeche kinare par ghoomta hai, drag ho sakta hai,
// khamoshi mein baith / so jata hai. Chat window: baat-cheet, awaz, Allow/Deny cards, action log, settings.
// Chrome extension ke liye 127.0.0.1:7341 par chhota local server (token ke sath).
const { app, BrowserWindow, ipcMain, screen, globalShortcut, shell, Tray, Menu, nativeImage, Notification, powerMonitor } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");
const brain = require("./src/brain");
const { createStore } = require("./src/memory");
const tools = require("./src/tools");
const voice = require("./src/voice");

// .env (INSTALL.bat .env.example se banata hai) - keys sirf isi laptop par.
function loadEnv() {
  const f = path.join(__dirname, ".env");
  try { for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
}
loadEnv();

let store, persona, puppyWin, chatWin, tray, server;
const PORT = Number(process.env.PUPPY_PORT || 7341);
const pending = new Map(); // Allow/Deny ke intezar wale kaam
const pageActions = []; // Chrome extension ke liye fill/click (wahan dobara Allow)
let lastPage = null;
const history = [];

function cfg() {
  const s = store.settings();
  return {
    GROQ_API_KEY: s.GROQ_API_KEY || process.env.GROQ_API_KEY || "",
    GROQ_MODEL: s.GROQ_MODEL || process.env.GROQ_MODEL || "",
    OLLAMA_MODEL: s.OLLAMA_MODEL || process.env.OLLAMA_MODEL || "qwen2.5:3b",
    avatar: s.avatar || "puppy", roam: s.roam !== false, wake: s.wake === true, lang: s.lang || "auto",
    token: s.token,
  };
}
const toPuppy = (ch, v) => { try { puppyWin && !puppyWin.isDestroyed() && puppyWin.webContents.send(ch, v); } catch {} };
const toChat = (ch, v) => { try { chatWin && !chatWin.isDestroyed() && chatWin.webContents.send(ch, v); } catch {} };
const setMood = (m) => { toPuppy("mood", m); toChat("mood", m); lastActivity = Date.now(); };

// ---------- Windows ----------
const PW = 220, PH = 220;
function createPuppy() {
  const wa = screen.getPrimaryDisplay().workArea;
  puppyWin = new BrowserWindow({
    width: PW, height: PH, x: wa.x + wa.width - PW - 40, y: wa.y + wa.height - PH,
    transparent: true, frame: false, alwaysOnTop: true, resizable: false, skipTaskbar: true, hasShadow: false, focusable: true,
    backgroundColor: "#00000000", webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  puppyWin.setAlwaysOnTop(true, "screen-saver");
  puppyWin.setVisibleOnAllWorkspaces(true);
  puppyWin.loadFile(path.join(__dirname, "src", "puppy.html"));
}
function createChat(show = false) {
  chatWin = new BrowserWindow({
    width: 400, height: 620, show, title: `${persona.assistantName} - chat`, backgroundColor: "#0b0b0f", autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  chatWin.loadFile(path.join(__dirname, "src", "chat.html"));
  chatWin.on("close", (e) => { if (!app.isQuitting) { e.preventDefault(); chatWin.hide(); } });
}
const showChat = () => { if (!chatWin || chatWin.isDestroyed()) createChat(true); chatWin.show(); chatWin.focus(); };

// ---------- Roam: neeche kinare par chalna, rukna, baithna, sona ----------
let roam = { mode: "walk", dir: -1, until: Date.now() + 8000, pausedUntil: 0 };
let lastActivity = Date.now();
function roamTick() {
  if (!puppyWin || puppyWin.isDestroyed()) return;
  const c = cfg(); const now = Date.now();
  const idle = (powerMonitor.getSystemIdleTime ? powerMonitor.getSystemIdleTime() : 0) * 1000;
  if (idle > 180000 || now - lastActivity > 240000) { if (roam.mode !== "sleep") { roam.mode = "sleep"; toPuppy("state", { mode: "sleep" }); } return; }
  if (!c.roam || now < roam.pausedUntil) return;
  if (now > roam.until) {
    roam.mode = roam.mode === "walk" ? "sit" : "walk";
    if (roam.mode === "walk" && Math.random() < 0.5) roam.dir *= -1;
    roam.until = now + (roam.mode === "walk" ? 6000 + Math.random() * 9000 : 8000 + Math.random() * 12000);
    toPuppy("state", { mode: roam.mode, dir: roam.dir });
  }
  if (roam.mode !== "walk") return;
  const wa = screen.getPrimaryDisplay().workArea;
  const [x] = puppyWin.getPosition();
  let nx = x + roam.dir * 3;
  if (nx < wa.x) { nx = wa.x; roam.dir = 1; toPuppy("state", { mode: "walk", dir: 1 }); }
  if (nx > wa.x + wa.width - PW) { nx = wa.x + wa.width - PW; roam.dir = -1; toPuppy("state", { mode: "walk", dir: -1 }); }
  puppyWin.setPosition(Math.round(nx), wa.y + wa.height - PH);
}

// ---------- Baat-cheet ----------
async function ask(userText, { fromVoice = false, source = "chat" } = {}) {
  const c = cfg();
  const lang = c.lang === "auto" ? brain.detectLang(userText) : c.lang;
  setMood("thinking");
  history.push({ role: "user", content: String(userText).slice(0, 4000) });
  const sys = brain.systemPrompt({ persona, memory: store.memory(), lessons: store.lessons(), skills: store.skills(), tools: tools.TOOLS, lang, page: lastPage });
  let out;
  try { out = await brain.think([{ role: "system", content: sys }, ...history.slice(-12)], c); }
  catch (e) { setMood("sad"); store.addLesson(`Brain nahi chala: ${e.message.slice(0, 120)}`, "fix"); return { text: e.message, mood: "sad", lang, error: true }; }
  const r = brain.parseReply(out.text);
  history.push({ role: "assistant", content: r.text });
  const toolResults = [];
  for (const t of r.tools.slice(0, 3)) toolResults.push(await requestTool(t.name, t.args, source));
  // Tool ka natija dekh kar ek chhota aakhri jawab (free limit bachane ke liye sirf ek round).
  let final = r;
  const ran = toolResults.filter((x) => x.ran);
  if (ran.length) {
    try {
      const o2 = await brain.think([{ role: "system", content: sys }, ...history.slice(-12), { role: "user", content: `TOOL RESULTS:\n${ran.map((x) => `${x.name}: ${x.ok ? "OK" : "FAIL"} ${String(x.result).slice(0, 1500)}`).join("\n")}\nNow tell ${persona.ownerName} the result briefly.` }], c);
      final = brain.parseReply(o2.text); history.push({ role: "assistant", content: final.text });
    } catch {}
  }
  store.learnFromTask({ userText, toolResults: ran });
  setMood(final.mood);
  return { text: final.text || r.text, mood: final.mood, lang, brain: out.brain, actions: toolResults.map((x) => ({ name: x.name, status: x.status })) };
}

// Allow/Deny: chat window mein card; read-only tool seedha chalta hai. Har cheez action-log mein.
function requestTool(name, args, source) {
  const exec = async () => {
    try { const result = await tools.runTool(name, args, toolCtx); store.log({ tool: name, args, ok: true, result: String(result).slice(0, 300) }); return { name, ok: true, ran: true, status: "done", result }; }
    catch (e) { store.log({ tool: name, args, ok: false, result: e.message }); return { name, ok: false, ran: true, status: "failed", result: e.message }; }
  };
  if (!tools.TOOLS.some((t) => t.name === name)) return Promise.resolve({ name, ok: false, ran: false, status: "unknown" });
  if (!tools.needsAllow(name)) return exec();
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => { pending.delete(id); store.log({ tool: name, args, ok: false, result: "Jawab nahi aaya (2 min) - nahi kiya" }); resolve({ name, ok: false, ran: false, status: "timeout" }); }, 120000);
    pending.set(id, async (allowed) => {
      clearTimeout(timer); pending.delete(id);
      if (!allowed) { store.log({ tool: name, args, ok: false, result: "Faheem ne Deny kiya" }); toChat("action-update", { id, status: "denied" }); return resolve({ name, ok: false, ran: false, status: "denied" }); }
      const r = await exec(); toChat("action-update", { id, status: r.status, result: String(r.result).slice(0, 300) }); resolve(r);
    });
    showChat();
    toChat("allow-request", { id, name, args, text: tools.describe(name, args || {}), source });
    setMood("curious");
  });
}
const toolCtx = {
  get store() { return store; },
  openExternal: (u) => shell.openExternal(u),
  spawnApp: (exe) => { const p = spawn(process.platform === "win32" ? "cmd" : exe, process.platform === "win32" ? ["/c", "start", "", exe] : [], { detached: true, stdio: "ignore", windowsHide: true }); p.unref(); },
  queuePageAction: (a) => { pageActions.push({ id: crypto.randomUUID(), ...a, at: Date.now() }); },
};

// ---------- Reminders ----------
function reminderTick() {
  const r = store.reminders(); let changed = false;
  for (const x of r) if (!x.done && new Date(x.at).getTime() <= Date.now()) {
    x.done = true; changed = true;
    try { new Notification({ title: `${persona.assistantName}: yaad-dihani`, body: x.text }).show(); } catch {}
    setMood("excited"); toChat("reminder", x); speakOut(`Yaad-dihani: ${x.text}`, "roman-ur");
  }
  if (changed) store.saveReminders(r);
}

async function speakOut(text, lang) {
  const v = lang === "en" ? persona.voiceEn : persona.voiceUr;
  try { const buf = await voice.speak(text, v); if (buf) { toChat("play-audio", buf.toString("base64")); return true; } } catch {}
  toChat("speak-fallback", { text, lang }); return false;
}

// ---------- Chrome extension server (sirf 127.0.0.1 + token) ----------
function startServer() {
  server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || "";
    const okOrigin = !origin || origin.startsWith("chrome-extension://");
    res.setHeader("Access-Control-Allow-Origin", okOrigin && origin ? origin : "null");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Puppy-Token");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(okOrigin ? 204 : 403); return res.end(); }
    const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
    if (!okOrigin) return send(403, { error: "origin" });
    if (req.url === "/health") return send(200, { ok: true, name: persona.assistantName });
    if (req.headers["x-puppy-token"] !== cfg().token) return send(401, { error: "Token ghalat - chat Settings se token copy karein." });
    let body = ""; for await (const ch of req) { body += ch; if (body.length > 2e6) break; }
    let j = {}; try { j = JSON.parse(body || "{}"); } catch {}
    if (req.method === "POST" && req.url === "/page") { lastPage = { url: String(j.url || ""), title: String(j.title || ""), text: String(j.text || "").slice(0, 60000), at: Date.now() }; setMood("curious"); toChat("page", { title: lastPage.title, url: lastPage.url }); return send(200, { ok: true }); }
    if (req.method === "POST" && req.url === "/ask") { const r = await ask(String(j.q || "Is page ka khulasa batao."), { source: "extension" }); toChat("assistant", r); speakOut(r.text, r.lang); return send(200, r); }
    if (req.method === "GET" && req.url === "/actions") return send(200, { actions: pageActions.slice(-10) });
    if (req.method === "POST" && req.url === "/actions/done") { const i = pageActions.findIndex((a) => a.id === j.id); if (i >= 0) { const [a] = pageActions.splice(i, 1); store.log({ tool: "page_action", args: a, ok: !!j.ok, result: j.allowed ? (j.result || "done") : "Faheem ne extension mein Deny kiya" }); } return send(200, { ok: true }); }
    send(404, { error: "nahi mila" });
  });
  server.on("error", () => {});
  server.listen(PORT, "127.0.0.1");
}

// ---------- IPC ----------
function wireIpc() {
  ipcMain.handle("ask", async (_e, text) => { const r = await ask(text); speakOut(r.text, r.lang); return r; });
  ipcMain.handle("transcribe", async (_e, { data, mime }) => voice.transcribe(Buffer.from(data), mime, cfg()));
  ipcMain.handle("is-wake", (_e, text) => voice.isWake(text));
  ipcMain.handle("allow", (_e, { id, allowed }) => { const f = pending.get(id); if (f) f(!!allowed); return !!f; });
  ipcMain.handle("settings", () => { const s = store.settings(); return { ...s, GROQ_API_KEY: s.GROQ_API_KEY ? "****" + s.GROQ_API_KEY.slice(-4) : "", hasEnvKey: !!process.env.GROQ_API_KEY, persona, port: PORT }; });
  ipcMain.handle("save-settings", (_e, s) => { const clean = { ...s }; if (!clean.GROQ_API_KEY || clean.GROQ_API_KEY.startsWith("****")) delete clean.GROQ_API_KEY; store.saveSettings(clean); toPuppy("avatar", cfg().avatar); return true; });
  ipcMain.handle("memory", () => ({ memory: store.memory(), lessons: store.lessons(), skills: store.skills().map((s) => s.name), log: store.readLog(30) }));
  ipcMain.handle("forget", (_e, i) => store.forget(i));
  ipcMain.on("mood", (_e, m) => setMood(m));
  ipcMain.on("show-chat", () => showChat());
  ipcMain.on("puppy-drag", (_e, { dx, dy }) => { if (!puppyWin) return; const [x, y] = puppyWin.getPosition(); puppyWin.setPosition(Math.round(x + dx), Math.round(y + dy)); roam.pausedUntil = Date.now() + 20000; lastActivity = Date.now(); });
  ipcMain.on("poke", () => { lastActivity = Date.now(); if (roam.mode === "sleep") { roam.mode = "sit"; toPuppy("state", { mode: "sit" }); } });
  ipcMain.handle("get-avatar", () => cfg().avatar);
}

app.whenReady().then(() => {
  store = createStore(path.join(app.getPath("userData"), "puppy-data"), path.join(__dirname, "skills"));
  try { persona = { ...JSON.parse(fs.readFileSync(path.join(__dirname, "persona.json"), "utf8")) }; } catch { persona = { assistantName: "Puppy", ownerName: "Faheem", personality: "", voiceUr: "ur-PK-UzmaNeural", voiceEn: "en-US-AnaNeural" }; }
  if (!store.settings().token) store.saveSettings({ token: crypto.randomBytes(12).toString("hex") });
  wireIpc(); createPuppy(); createChat(false); startServer();
  setInterval(roamTick, 50); setInterval(reminderTick, 15000);
  // Push-to-talk + chat kholna
  globalShortcut.register("Control+Shift+Space", () => { showChat(); toChat("ptt", true); setMood("listening"); });
  globalShortcut.register("Control+Shift+P", () => showChat());
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "src", "icon.png")).resize({ width: 16, height: 16 }));
    tray.setToolTip("Hey Puppy");
    tray.setContextMenu(Menu.buildFromTemplate([{ label: "Chat kholo", click: showChat }, { label: "Puppy chhupao / dikhao", click: () => (puppyWin.isVisible() ? puppyWin.hide() : puppyWin.show()) }, { type: "separator" }, { label: "Band karo", click: () => { app.isQuitting = true; app.quit(); } }]));
  } catch {}
  if (process.env.TELEGRAM_BOT_TOKEN) { try { require("./bridges/telegram").start({ ask: (t) => ask(t, { source: "telegram" }), token: process.env.TELEGRAM_BOT_TOKEN, allowed: process.env.TELEGRAM_ALLOWED_CHAT_ID }); } catch {} }
});
app.on("will-quit", () => { globalShortcut.unregisterAll(); try { server && server.close(); } catch {} });
app.on("window-all-closed", (e) => e.preventDefault());

module.exports = { ask, requestTool };
