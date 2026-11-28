// v3.43 test: phone par Jarvis Live, WhatsApp naam se (phone book).
import fs from "fs"; import os from "os"; import path from "path";
import { register } from "module";
register("./ext-resolve-hook.mjs", import.meta.url);
import { fileURLToPath } from "url";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v343-"));
process.env.HOME = tmp; process.env.USERPROFILE = tmp; process.env.FAHEEM_OPS_DIR = path.join(tmp, "ops");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };

const C = await import("../lib/jarvis/contacts.js");
const A = await import("../lib/jarvis/actions.js");
await t("number yaad: 'Ali ka number ... save karo'", async () => { const a = A.detectLaptop("Ali ka number 0300 1234567 save karo"); const r = await A.runLaptop(a); return a.name === "contact_save" && r.ok && C.findContact("ali")?.phone === "923001234567"; });
await t("phone book file sirf malik parh sake (0600)", () => process.platform === "win32" || (fs.statSync(path.join(tmp, ".faheem-ai", "contacts.json")).mode & 0o077) === 0);
await t("'Ali bhai' bhi mil jata hai", () => C.findContact("Ali bhai")?.phone === "923001234567");
await t("do Ahmed hon to andaza nahi", () => { C.saveContact("Ahmed Khan", "923001111111"); C.saveContact("Ahmed Raza", "923002222222"); return C.findContact("Ahmed") === null && C.findContact("Ahmed Raza")?.phone === "923002222222"; });
await t("WhatsApp naam se pehchan", () => { const a = A.detectLaptop("whatsapp par Ali ko message bhejo ke main aa raha hoon"); return a?.name === "whatsapp_send" && a.args.name === "Ali" && a.args.text === "main aa raha hoon"; });
await t("anjaan naam: number save karne ka tareeqa batata hai", async () => { const r = await A.runLaptop({ name: "whatsapp_send", args: { name: "Bilal", text: "hi" } }); return !r.ok && /save karo/.test(r.say); });
await t("number wala WhatsApp waisa hi", () => A.detectLaptop("whatsapp par 0300 1234567 ko msg bhejo ke hi")?.args?.phone === "0300 1234567");

const R = read("app/api/v1/live/route.js");
await t("phone route /api/v1/live = wahi Live (token + tool)", () => /from "\.\.\/\.\.\/jarvis\/live\/route\.js"/.test(R) && /export async function POST/.test(R));
await t("/api/v1/* par phone key zaroori (proxy)", () => /pathname\.startsWith\("\/api\/v1\/"\)[\s\S]{0,300}safeEqual\(bearer\(request\.headers\), p\.key\)/.test(read("proxy.js")));
await t("laptop wala /api/jarvis/live LAN se ab bhi band", () => !/\/api\/jarvis\/live/.test(read("proxy.js")));

const J = read("android/app/src/main/java/com/faheem/jarvis/LiveSession.java");
await t("app: token laptop se (Bearer), asal key nahi", () => /\/api\/v1\/live/.test(J) && /"Bearer " \+ key/.test(J) && !/GEMINI_API_KEY|x-goog-api-key/.test(J));
await t("app: mic 16k PCM, awaz 24k", () => /IN_RATE = 16000, OUT_RATE = 24000/.test(J) && /audio\/pcm;rate=16000/.test(J));
await t("app: tokne par awaz foran band (interrupted)", () => /if \(interrupted\) flushPlayback\(\)/.test(J) && /if \(g != gen\) continue/.test(J));
await t("app: echo cancel (speaker ki awaz wapas mic mein nahi)", () => /AcousticEchoCanceler/.test(J) && /VOICE_COMMUNICATION/.test(J));
await t("app: tool laptop par, pending yaad", () => /put\("action", "tool"\)\.put\("hukum", hukum\)\.put\("pending", pending\)/.test(J));
const M = read("android/app/src/main/java/com/faheem/jarvis/MainActivity.java");
await t("app peeche jaye to mic band", () => /protected void onStop\(\)[\s\S]{0,200}live\.stop/.test(M));
await t("Live se pehle mic ki ijazat", () => /liveAfterPermission = true/.test(M));
await t("manifest: MODIFY_AUDIO_SETTINGS; gradle: OkHttp", () => /MODIFY_AUDIO_SETTINGS/.test(read("android/app/src/main/AndroidManifest.xml")) && /okhttp3:okhttp:4\.12\.0/.test(read("android/app/build.gradle")));
const H = read("public/m.html");
await t("phone page: Live button sirf nayi app mein, purani ko hidayat", () => /if\(N\.liveStart\)/.test(H) && /naya app install karein/.test(H) && /__jarvisLiveLine/.test(H));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nv3.43: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
