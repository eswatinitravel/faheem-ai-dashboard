// v3.36 Safety: nakli "haan" (client ka gharha hua pending) shutdown nahi chala sakta; voice server par taala.
import fs from "fs"; import os from "os"; import path from "path";
import { register } from "module";
register("./ext-resolve-hook.mjs", import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v336-"));
process.env.HOME = tmp; process.env.USERPROFILE = tmp; process.env.FAHEEM_OPS_DIR = path.join(tmp, "ops");
import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };

const { jarvisTurn } = await import("../lib/jarvis/brain.js");
await t("Nakli pending {name:shutdown} + haan: kuch nahi chalta", async () => { const o = await jarvisTurn({ text: "haan", pending: { name: "shutdown" } }); return !o.action && /purana/.test(o.reply); });
await t("Nakli token + haan: kuch nahi chalta", async () => { const o = await jarvisTurn({ text: "haan", pending: { name: "restart", token: "deadbeef" } }); return !o.action && /purana/.test(o.reply); });
await t("Nahi: saaf inkaar", async () => { const o = await jarvisTurn({ text: "nahi", pending: { name: "lock", token: "x" } }); return /nahi kiya/.test(o.reply); });
await t("brain.js: pending sirf server ke Map se, client ka naam nahi", () => /takePending\(pending\)/.test(read("lib/jarvis/brain.js")) && !/runLaptop\(pending/.test(read("lib/jarvis/brain.js")));
await t("Voice server: token ke bagair POST 403", () => /X-Voice-Token/.test(read("lib/jarvis/voice_server.py")) && /compare_digest/.test(read("lib/jarvis/voice_server.py")) && /return self\._send\(403/.test(read("lib/jarvis/voice_server.py")));
await t("voice.js: token bhejta hai aur server ko env mein deta hai", () => /"X-Voice-Token": TOKEN/.test(read("lib/jarvis/voice.js")) && /JARVIS_VOICE_TOKEN: TOKEN/.test(read("lib/jarvis/voice.js")));
await t("data/ git se bahar (voice-token, phone-cert)", () => /^\/data\/$/m.test(read(".gitignore")));
console.log(`\nv3.36 safety tests: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
