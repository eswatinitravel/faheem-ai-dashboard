// v3.40 test: kai email accounts (Gmail, Yahoo, Hotmail OAuth), Jarvis ka email samajhna, 9 baje report, bol kar sunana.
// Sab nakli (koi asal email server/Microsoft nahi).
import fs from "fs"; import os from "os"; import path from "path"; import http from "http"; import { execFileSync } from "child_process";
import { register } from "module";
register("./ext-resolve-hook.mjs", import.meta.url);
import { fileURLToPath } from "url";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v340-"));
process.env.HOME = tmp; process.env.USERPROFILE = tmp; process.env.FAHEEM_OPS_DIR = path.join(tmp, "ops"); process.env.FAHEEM_MAIL_FILE = path.join(tmp, "mail-accounts.json");
process.env.AW_URL = "http://127.0.0.1:1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };

// Nakli Microsoft login server
let polls = 0;
const ms = http.createServer((req, res) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
  const q = new URLSearchParams(b); res.setHeader("Content-Type", "application/json");
  if (req.url.endsWith("/devicecode")) return res.end(JSON.stringify({ device_code: "DEV", user_code: "ABCD-1234", verification_uri: "https://microsoft.com/link", interval: 1, expires_in: 900, _scope: q.get("scope") }));
  if (q.get("grant_type")?.includes("device_code")) { polls++; return res.end(JSON.stringify(polls < 2 ? { error: "authorization_pending" } : { access_token: "AT1", refresh_token: "RT1", expires_in: 3600 })); }
  if (q.get("grant_type") === "refresh_token") return res.end(JSON.stringify(q.get("refresh_token") === "RT1" ? { access_token: "AT2", refresh_token: "RT2", expires_in: 3600 } : { error: "invalid_grant" }));
  res.statusCode = 400; res.end("{}"); }); });
await new Promise((r) => ms.listen(0, "127.0.0.1", r));
process.env.MS_AUTH_BASE = `http://127.0.0.1:${ms.address().port}`;

const C = await import("../lib/config.js");
const A = await import("../lib/mail/accounts.js");
const M = await import("../lib/mail/inbox.js");
const calls = [];
M._setHelper(async (p) => {
  calls.push(p);
  if (p.action === "test") return { ok: true };
  if (p.action === "send") return { ok: true };
  if (p.action === "list") {
    if (p.user === "faheem@yahoo.com") return { ok: false, error: "Login nahi maana gaya" };
    const base = { gmail: p.gmail, user: p.user };
    return { ok: true, items: [
      { msgid: `<${p.user}-1@x>`, from: "Ayesha <ayesha@shop.pk>", replyTo: "ayesha@shop.pk", subject: "Order 77 kab?", date: "Sat", text: "Mera order 77 kab ayega? Shaadi 3 December ko hai." },
      { msgid: `<${p.user}-2@x>`, from: "Bank <alerts@bank.pk>", replyTo: "alerts@bank.pk", subject: "Statement", date: "Sat", text: "Your statement" },
      { msgid: `<${p.user}-3@x>`, from: "News <noreply@x.com>", replyTo: "noreply@x.com", subject: "Sale", date: "Sat", text: "50%" } ], base };
  }
});

await t("Provider pehchan: gmail, yahoo, hotmail/live/outlook, baqi", () => A.detectProvider("a@gmail.com") === "gmail" && A.detectProvider("a@yahoo.co.uk") === "yahoo" && A.detectProvider("a@hotmail.com") === "outlook" && A.detectProvider("a@live.com") === "outlook" && A.detectProvider("a@vestire.pk") === "other");
await t("v3.39 wala Gmail (Options keys) khud account ban jata hai", async () => {
  C.writeSaved({ ...C.readSaved(), GMAIL_USER: "nazfaheem121@gmail.com", GMAIL_APP_PASSWORD: "abcdefghijklmnop" });
  const l = await A.listAccounts(); return l.length === 1 && l[0].email === "nazfaheem121@gmail.com" && l[0].provider === "gmail" && !C.getConfig().GMAIL_APP_PASSWORD;
});
await t("Gmail App Password 16 haroof; ghalat rad", async () => { try { await A.addAccount({ email: "x@gmail.com", pass: "short" }); return false; } catch (e) { return /16 haroof/.test(e.message); } });
await t("Yahoo + Hotmail + doosra Gmail jodo (jitne chahein)", async () => {
  await A.addAccount({ email: "faheem@yahoo.com", pass: "yahooapppass1234", label: "Zaati" });
  await A.addAccount({ email: "vestire@hotmail.com", clientId: "11111111-2222-3333-4444-555555555555", label: "Shop" });
  await A.addAccount({ email: "eswatinitravel@gmail.com", pass: "qrstuvwxyzabcdef" });
  const l = await A.listAccounts(); const h = l.find((a) => a.provider === "outlook");
  return l.length === 4 && h.imap.host === "outlook.office365.com" && h.smtp.security === "starttls" && h.auth === "oauth_ms";
});
await t("Hotmail bina Client ID rad", async () => { try { await A.addAccount({ email: "y@outlook.com" }); return false; } catch (e) { return /Client ID/.test(e.message); } });
await t("Page ko password/token kabhi nahi (publicAccount)", async () => { const s = JSON.stringify((await A.listAccounts()).map(A.publicAccount)); return !/abcdefghijklmnop|yahooapppass|clientId|refresh/.test(s); });
await t("mail-accounts.json 0600 (sirf aap)", () => process.platform === "win32" || (fs.statSync(process.env.FAHEEM_MAIL_FILE).mode & 0o077) === 0);

const MS = await import("../lib/mail/msauth.js");
const hot = (await A.listAccounts()).find((a) => a.provider === "outlook");
await t("Hotmail: Microsoft device code, IMAP+SMTP scope", async () => { const r = await MS.startDeviceLogin(hot.id); return r.userCode === "ABCD-1234" && /microsoft\.com\/link/.test(r.url) && /IMAP\.AccessAsUser\.All/.test(MS.MS_SCOPES) && /SMTP\.Send/.test(MS.MS_SCOPES); });
await t("Hotmail: pending phir done, refresh token sirf file mein", async () => { const a = await MS.pollDeviceLogin(hot.id); const b = await MS.pollDeviceLogin(hot.id); const acc = await A.getAccount(hot.id); return a.waiting && b.done && acc.oauth.refresh === "RT1"; });
await t("Hotmail: purana token refresh hota hai", async () => { await A.patchAccount(hot.id, (x) => { x.oauth.exp = 0; }); const tok = await MS.accessToken(await A.getAccount(hot.id)); return tok === "AT2" && (await A.getAccount(hot.id)).oauth.refresh === "RT2"; });

await t("Sab accounts parho: ek fail ho to baqi chalein; Hotmail XOAUTH2 token", async () => {
  calls.length = 0; const r = await M.refresh({ days: 1 });
  const hc = calls.find((c) => c.user === "vestire@hotmail.com");
  return r.accounts === 4 && r.errors.length === 1 && /yahoo/.test(r.errors[0]) && r.added === 9 && hc.token === "AT2" && !hc.pass && calls.find((c) => c.user === "nazfaheem121@gmail.com").gmail === true;
});
await t("Yahoo ka masla account par likha", async () => /Login/.test((await A.listAccounts()).find((a) => a.provider === "yahoo").lastError));

let seen = [];
const writer = async (it, o) => { seen.push({ s: it.subject, g: o.guidance });
  if (/Statement/.test(it.subject)) return '{"needs_reply": false, "urgency": "low", "summary": "Bank ki statement aayi hai.", "draft": ""}';
  return `Sure: {"needs_reply": true, "urgency": "${it.account.includes("hotmail") ? "high" : "normal"}", "summary": "Ayesha order 77 ka poochh rahi hain, shaadi 3 December ko hai.", "draft": "Ji Ayesha, ${o.guidance || "order 77 [check: date]"}.\\n${o.signature}"}`; };
await t("Samajhna: noreply khud chhora, bank = sirf khabar, order = jawab tayar (bhejna nahi)", async () => {
  const sentBefore = calls.filter((c) => c.action === "send").length;
  const r = await M.analyze(null, { writer });
  const c = M.counts();
  return r.analyzed === 6 && c.drafted === 3 && c.info === 6 && !seen.some((x) => /Sale/.test(x.s)) && calls.filter((x) => x.action === "send").length === sentBefore;
});
await t("Zaroori pehle (Hotmail wala 'high' = email 1)", () => { const r = M.readyList(); if (process.env.DBG) console.log(r.map(x=>[x.account,x.urgency])); return r.length === 3 && r[0].account === "vestire@hotmail.com" && r[0].urgency === "high"; });
await t("Writer prompt: untrusted, JSON, Roman Urdu tafseel, keemat nahi ghadta", () => { const s = read("lib/mail/inbox.js"); return /untrusted data/.test(s) && /needs_reply/.test(s) && /Roman Urdu/.test(s) && /Never invent prices/.test(s); });

await t("Bhejna: usi account se jahan email aayi (Hotmail token)", async () => {
  const it = M.readyList()[0]; calls.length = 0; const r = await M.sendReply(it.id); const c = calls[0];
  return r.from === "vestire@hotmail.com" && c.user === "vestire@hotmail.com" && c.token && c.reply.in_reply_to === "<vestire@hotmail.com-1@x>" && c.smtp.security === "starttls";
});

// Report: tafseel ke saath, bol kar
const Bf = await import("../lib/briefing.js");
const spoken = [];
await t("9 baje report: har zaroori email ki tafseel + bolta hai", async () => {
  const b = await Bf.buildBriefing({ speakAloud: true, deps: { speak: { announce: async (txt) => { spoken.push(txt); return "laptop"; } }, mail: { isSetUp: M.isSetUp, refresh: M.refresh, analyze: () => M.analyze(null, { writer }), counts: M.counts, readyList: M.readyList } } });
  return /2 ka jawab zaroori/.test(b.text) && /Email 1: Ayesha/.test(b.text) && /order 77/.test(b.text) && /3 December/.test(b.text) && /email 1 ka jawab sunao/.test(b.text) && spoken[0] === b.text && Bf.lastBriefing().spokenBy === "laptop";
});
await t("Default: roz 9 baje (ek dafa); band kiya to band rahe", async () => {
  const S = await import("../lib/ops/scheduler.js");
  await Bf.ensureDefaultBriefing(); await Bf.ensureDefaultBriefing();
  const l1 = S.listSchedules().filter((x) => x.kind === "briefing");
  await Bf.ensureDailyBriefing(""); await Bf.ensureDefaultBriefing();
  const l2 = S.listSchedules().filter((x) => x.kind === "briefing");
  return l1.length === 1 && l1[0].every === "daily@09:00" && l2.length === 0 && /ensureDefaultBriefing/.test(read("lib/ops/boot.js"));
});
const SP = await import("../lib/speak.js");
await t("Jarvis page khula ho to page bolta hai (laptop nahi)", async () => { SP.pageHeartbeat(); const by = await SP.announce("test elaan"); const q = SP.pageHeartbeat(); return by === "page" && q.length === 1 && q[0].text === "test elaan"; });
await t("Laptop awaz: text env se (command mein nahi)", () => { const s = read("lib/speak.js"); return /\$env:JARVIS_SAY/.test(s) && /JARVIS_SAY: String\(text\)/.test(s); });

// Awaz
const { mailTurn, jarvisTurn } = await import("../lib/jarvis/brain.js");
await t("Awaz: 'kaun si emails zaroori hain' = tafseel ke saath", async () => { const r = await mailTurn("kaun si emails zaroori hain"); return /2 emails ka jawab zaroori/.test(r.reply) && /order 77/.test(r.reply); });
await t("Awaz: 'email 1 ki tafseel' = asal email bhi", async () => { const r = await mailTurn("email 1 ki tafseel batao"); return /Shaadi 3 December/.test(r.reply); });
await t("Awaz: 'email 1 ka jawab likho ke kal tak bhej denge' = naya jawab + hold", async () => {
  M._setToken(null);
  const it = M.readyList()[0]; const orig = M.analyze;
  const r = await mailTurn("email 1 ka jawab likho ke kal tak bhej denge", { mail: { ...M, analyze: (id, o) => M.analyze(id, { ...o, writer }) } });
  return r.hold?.name === "mail_send" && r.hold.args.id === it.id && /kal tak bhej denge/.test(r.reply) && seen.at(-1).g === "kal tak bhej denge";
});
await t("Jarvis: bhejo -> 'haan' = bheji usi account se", async () => {
  const a = await jarvisTurn({ text: "email 1 ka jawab bhejo" }); calls.length = 0;
  const b = await jarvisTurn({ text: "haan", pending: a.pending });
  return a.pending?.token && /chala gaya/.test(b.reply) && calls[0]?.action === "send";
});
await t("Jarvis page subah ki report sunata hai (say poll)", () => /\/api\/subah\/say/.test(read("app/jarvis/page.js")));

// Python helper: XOAUTH2 + STARTTLS + har IMAP
await t("Python helper: XOAUTH2 format, starttls, non-Gmail SINCE, token chhupata", () => {
  const out = execFileSync(process.platform === "win32" ? "python" : "python3", ["-c", "import sys; sys.path.insert(0,'lib/mail'); import mail_helper as m; print(m.xoauth('a@hotmail.com','TOK'))"], { cwd: root }).toString();
  const s = read("lib/mail/mail_helper.py");
  return /user=a@hotmail\.com\\x01auth=Bearer TOK\\x01\\x01/.test(out) && /starttls\(\)/.test(s) && /"SINCE", since/.test(s) && /replace\(a\.get\("token"\)/.test(s) && /readonly=True/.test(s);
});
await t("API: account actions + bhejna sirf confirm", () => { const r = read("app/api/subah/route.js"); return /account_add/.test(r) && /ms_start/.test(r) && /b\.confirm !== true/.test(r) && /publicAccount/.test(r); });

ms.close();
console.log(`\nv3.40 multi-mail tests: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
