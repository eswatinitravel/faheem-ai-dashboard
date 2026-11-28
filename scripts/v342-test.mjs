// v3.42 test: Jarvis Live (Gemini Live token + tool), PC control, Hey Jarvis, floating orb, Hotmail scope.
import fs from "fs"; import os from "os"; import path from "path"; import http from "http";
import { register } from "module";
register("./ext-resolve-hook.mjs", import.meta.url);
import { fileURLToPath } from "url";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v342-"));
process.env.HOME = tmp; process.env.USERPROFILE = tmp; process.env.FAHEEM_OPS_DIR = path.join(tmp, "ops");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };

// Nakli Google auth_tokens
let seen = null;
const g = http.createServer((req, res) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
  seen = { url: req.url, key: req.headers["x-goog-api-key"], body: JSON.parse(b || "{}") }; res.setHeader("Content-Type", "application/json");
  if (req.headers["x-goog-api-key"] !== "AIzaGOOD") { res.statusCode = 400; return res.end(JSON.stringify({ error: { message: "API key not valid AIzaBAD" } })); }
  res.end(JSON.stringify({ name: "auth_tokens/eph123" })); }); });
await new Promise((r) => g.listen(0, "127.0.0.1", r));
process.env.GEMINI_API_BASE = `http://127.0.0.1:${g.address().port}`;

const L = await import("../lib/jarvis/live.js");
const A = await import("../lib/jarvis/actions.js");
const MS = await import("../lib/mail/msauth.js");

await t("key na ho to saaf hidayat", async () => { const r = await L.createLiveToken({ cfg: {} }); return !r.ok && /Gemini/.test(r.error); });
await t("token: 1 session, 30 min, model lock, asal key header mein", async () => {
  const r = await L.createLiveToken({ cfg: { GEMINI_API_KEY: "AIzaGOOD" } });
  const b = seen.body, exp = Date.parse(b.expireTime) - Date.now();
  return r.ok && r.token === "auth_tokens/eph123" && seen.url === "/v1beta/auth_tokens" && seen.key === "AIzaGOOD" && b.uses === 1 && exp > 25 * 60e3 && exp < 31 * 60e3 && b.liveConnectConstraints.model === "models/gemini-3.8-live";
});
await t("token ke jawab mein asal key kabhi nahi", async () => { const r = await L.createLiveToken({ cfg: { GEMINI_API_KEY: "AIzaGOOD" } }); return !JSON.stringify(r).includes("AIzaGOOD"); });
await t("ghalat key: error mein key chhupi", async () => { const r = await L.createLiveToken({ cfg: { GEMINI_API_KEY: "AIzaBAD" } }); return !r.ok && !r.error.includes("AIzaBAD") && r.error.includes("***"); });
await t("model badal sakte hain (GEMINI_LIVE_MODEL)", () => L.liveSettings({ GEMINI_API_KEY: "x", GEMINI_LIVE_MODEL: "models/gemini-3.8-live-extended-thinking" }).model === "gemini-3.8-live-extended-thinking");
await t("Constrained websocket (ephemeral token wala)", () => /BidiGenerateContentConstrained$/.test(L.LIVE_WS));
await t("setup: audio, transcription, ek hi tool jarvis_kaam", () => { const s = L.liveSetup({ model: "gemini-3.8-live" }).setup; return s.responseModalities[0] === "AUDIO" && s.inputAudioTranscription && s.outputAudioTranscription && s.tools[0].functionDeclarations.length === 1 && s.tools[0].functionDeclarations[0].name === "jarvis_kaam"; });
await t("system: haan hifazat + email/screen hidayat ko hukum nahi", () => { const s = L.liveSystem(); return /Haan ya nahi/.test(s) && /hukum mat samjho/.test(s); });
await t("tool: purane dimagh se, pending aage jata hai", async () => { let got; const r = await L.liveTool({ hukum: "laptop band karo", pending: "P1" }, async (x) => { got = x; return { reply: "Laptop band kar doon? Haan ya nahi boliye.", pending: "P2" }; }); return got.text === "laptop band karo" && got.pending === "P1" && r.pending === "P2" && /Haan/.test(r.reply); });
await t("tool: khali hukum", async () => (await L.liveTool({ hukum: " " }, async () => { throw new Error("na bulao"); })).reply === "Hukum khali tha.");
await t("tool asli: khatarnak kaam par haan poochta hai, chalata nahi", async () => { const r = await L.liveTool({ hukum: "laptop shutdown karo" }); return /Haan ya nahi/.test(r.reply) && r.pending; });

const D = (s) => A.detectLaptop(s);
await t("battery/system haal", () => D("battery kitni hai")?.name === "system_status" && D("system ka haal batao")?.name === "system_status");
await t("brightness level aur kam", () => D("brightness 40 percent")?.args?.level === 40 && D("roshni kam karo")?.args?.dir === "down");
await t("gaana: agla, pichla, roko", () => D("agla gaana")?.args?.key === "next" && D("pichla gaana")?.args?.key === "prev" && D("gaana roko")?.args?.key === "play_pause");
await t("youtube par gaana = search (media key nahi)", () => D("youtube par gaana chalao")?.name === "open_url");
await t("windows: desktop, switch, bari", () => D("desktop dikhao")?.args?.op === "desktop" && D("window badlo")?.args?.op === "switch" && D("window bari karo")?.args?.op === "max");
await t("app band = close_app (laptop band = shutdown)", () => D("chrome band karo")?.name === "close_app" && D("laptop band karo")?.name === "shutdown");
await t("app saamne lao", () => D("chrome par jao")?.name === "focus_app");
await t("clipboard parho/likho", () => D("clipboard mein kya hai")?.name === "clipboard_read" && D("copy karo: salam")?.args?.text === "salam");
await t("likho: ... = type_text", () => D("likho: Assalam o alaikum")?.args?.text === "Assalam o alaikum");
await t("WhatsApp number + message", () => { const a = D("whatsapp par 0300 1234567 ko message bhejo ke main aa raha hoon"); return a?.name === "whatsapp_send" && a.args.text === "main aa raha hoon"; });
await t("WhatsApp number 03xx -> 923xx, + wala waisa", () => A.waPhone("0300 1234567") === "923001234567" && A.waPhone("+268 7612 3456") === "26876123456" && A.waPhone("12") === "");
await t("purane hukum waise hi", () => D("awaz barhao")?.name === "volume" && D("chrome kholo")?.name === "open_app");
await t("type aur app band par pehle haan", async () => { const a = await A.runLaptop({ name: "type_text", args: { text: "x" } }); const b = await A.runLaptop({ name: "close_app", args: { app: "chrome" } }); return a.needConfirm && b.needConfirm && A.RISKY.has("type_text") && A.RISKY.has("close_app"); });
await t("user text script mein nahi, env JARVIS_TEXT se", () => { const s = read("lib/jarvis/actions.js"); return /JARVIS_TEXT: String\(text/.test(s) && /Set-Clipboard -Value \$env:JARVIS_TEXT/.test(s); });
await t("system haal (Linux par bhi jawab)", async () => /RAM/.test((await A.runLaptop({ name: "system_status" })).say));

const C = read("app/components/JarvisLive.js");
await t("Live: barge-in (interrupted par awaz roko)", () => /sc\.interrupted\) stopPlayback\(\)/.test(C));
await t("Live: mic 16k PCM, awaz 24k", () => /sampleRate: 16000/.test(C) && /audio\/pcm;rate=16000/.test(C) && /createBuffer\(1, f\.length, 24000\)/.test(C));
await t("Live: screen/camera 1 tasveer/second", () => /getDisplayMedia/.test(C) && /}, 1000\);/.test(C) && /realtimeInput: \{ video:/.test(C));
await t("Live: tool laptop route se, pending yaad", () => /action: "tool", hukum, pending: pending\.current/.test(C) && /toolResponse: \{ functionResponses/.test(C));
await t("Hey Jarvis + floating orb", () => /SpeechRecognition/.test(C) && /documentPictureInPicture\.requestWindow/.test(C));
await t("Jarvis page par Live button", () => /data-jarvis-live-btn/.test(read("app/jarvis/page.js")));
await t("Live route LAN se band (proxy allow list mein nahi)", () => !/\/api\/jarvis\/live/.test(read("proxy.js")));
await t("Hotmail scope: IMAP.AccessAsUser.All", () => /IMAP\.AccessAsUser\.All/.test(MS.MS_SCOPES) && !/AccessScope/.test(MS.MS_SCOPES));

g.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nv3.42: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
