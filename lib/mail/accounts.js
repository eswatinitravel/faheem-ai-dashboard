// v3.40 Kai email accounts (Gmail, Yahoo, Hotmail/Outlook, ya koi bhi IMAP). Jitne chahein jorein.
// File: C:\Users\<naam>\.faheem-ai\mail-accounts.json (sirf isi laptop par; FAHEEM_MAIL_FILE se badal sakte hain).
// Gmail/Yahoo: App Password. Hotmail/Outlook.com: Microsoft ne 16 Sep 2024 se password band kar diya, is liye
// Microsoft sign-in (OAuth device code) — page par code milta hai, microsoft.com/link par daalte hain.
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

export const mailFile = () => process.env.FAHEEM_MAIL_FILE || path.join(/*turbopackIgnore: true*/ os.homedir(), ".faheem-ai", "mail-accounts.json");

export const PRESETS = {
  gmail: { name: "Gmail", imap: { host: "imap.gmail.com", port: 993 }, smtp: { host: "smtp.gmail.com", port: 465, security: "ssl" }, auth: "password",
    help: "Google Account → Security → 2-Step Verification on → App passwords → naam \"Jarvis\" → 16 haroof." },
  yahoo: { name: "Yahoo", imap: { host: "imap.mail.yahoo.com", port: 993 }, smtp: { host: "smtp.mail.yahoo.com", port: 465, security: "ssl" }, auth: "password",
    help: "Yahoo Account Info → Account security → Generate app password → naam \"Jarvis\"." },
  outlook: { name: "Hotmail / Outlook", imap: { host: "outlook.office365.com", port: 993 }, smtp: { host: "smtp-mail.outlook.com", port: 587, security: "starttls" }, auth: "oauth_ms",
    help: "Microsoft password/App Password nahi leta. Microsoft sign-in se jurta hai (ek dafa ka Client ID chahiye, page par tareeqa)." },
  other: { name: "Koi aur (IMAP)", imap: { host: "", port: 993 }, smtp: { host: "", port: 465, security: "ssl" }, auth: "password", help: "Apne email provider ki IMAP/SMTP settings daalein." },
};

export function detectProvider(email) {
  const d = String(email).split("@")[1]?.toLowerCase() || "";
  if (/^(gmail|googlemail)\.com$/.test(d)) return "gmail";
  if (/^(yahoo\.[a-z.]+|ymail\.com|rocketmail\.com)$/.test(d)) return "yahoo";
  if (/^(outlook|hotmail|live|msn)\.[a-z.]+$/.test(d)) return "outlook";
  return "other";
}

function load() {
  try { const j = JSON.parse(fs.readFileSync(mailFile(), "utf8")); if (Array.isArray(j.accounts)) return j; } catch {}
  return { accounts: [] };
}
function save(j) {
  const f = mailFile(); fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(j, null, 2), { mode: 0o600 }); fs.renameSync(tmp, f);
  try { fs.chmodSync(f, 0o600); } catch {}
}

// v3.39 wala ek Gmail (Options keys GMAIL_USER/GMAIL_APP_PASSWORD) khud account ban jata hai.
async function migrate(j) {
  try {
    const { getConfig, readSaved, writeSaved } = await import("../config.js");
    const c = getConfig();
    if (c.GMAIL_USER && c.GMAIL_APP_PASSWORD && !j.accounts.some((a) => a.email.toLowerCase() === String(c.GMAIL_USER).toLowerCase())) {
      j.accounts.push(build({ email: c.GMAIL_USER, pass: c.GMAIL_APP_PASSWORD }));
      save(j);
      writeSaved({ ...readSaved(), GMAIL_USER: "", GMAIL_APP_PASSWORD: "" });
    }
  } catch {}
  return j;
}

function build({ email, pass = "", label = "", provider = null, imapHost, imapPort, smtpHost, smtpPort, smtpSecurity, clientId = "" }) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("Email ka pata ghalat.");
  const p = PRESETS[provider] ? provider : detectProvider(e);
  const pre = PRESETS[p];
  const acc = { id: "acc_" + crypto.createHash("sha1").update(e).digest("hex").slice(0, 10), email: e, label: String(label || pre.name).slice(0, 40), provider: p, auth: pre.auth,
    imap: { host: String(imapHost || pre.imap.host).trim(), port: Number(imapPort || pre.imap.port) },
    smtp: { host: String(smtpHost || pre.smtp.host).trim(), port: Number(smtpPort || pre.smtp.port), security: ["ssl", "starttls"].includes(smtpSecurity) ? smtpSecurity : pre.smtp.security },
    enabled: true, addedAt: new Date().toISOString() };
  if (!/^[a-z0-9.-]+$/i.test(acc.imap.host) || !/^[a-z0-9.-]+$/i.test(acc.smtp.host)) throw new Error("IMAP/SMTP server ka naam chahiye.");
  if (acc.auth === "password") {
    const pw = String(pass || "").replace(/\s+/g, "");
    if (!pw) throw new Error("App Password chahiye.");
    if ((p === "gmail") && !/^[a-z]{16}$/i.test(pw)) throw new Error("Google App Password 16 haroof ka hota hai (abcd efgh ijkl mnop).");
    acc.pass = pw;
  } else {
    if (!/^[0-9a-f-]{36}$/i.test(String(clientId).trim())) throw new Error("Microsoft Client ID (36 haroof, jaise 1234abcd-....) chahiye.");
    acc.oauth = { clientId: String(clientId).trim(), refresh: "", access: "", exp: 0 };
  }
  return acc;
}

export async function listAccounts() { return (await migrate(load())).accounts; }
export async function getAccount(id) { return (await listAccounts()).find((a) => a.id === id) || null; }
// Page/API ke liye: password/token kabhi bahar nahi.
export const publicAccount = (a) => ({ id: a.id, email: a.email, label: a.label, provider: a.provider, providerName: PRESETS[a.provider]?.name, auth: a.auth, enabled: a.enabled,
  connected: a.auth === "password" ? !!a.pass : !!a.oauth?.refresh, imap: a.imap.host, smtp: a.smtp.host, lastCheck: a.lastCheck || null, lastError: a.lastError || null });

export async function addAccount(fields) {
  const j = await migrate(load());
  const acc = build(fields);
  const i = j.accounts.findIndex((a) => a.id === acc.id);
  if (i >= 0) { acc.addedAt = j.accounts[i].addedAt; j.accounts[i] = acc; } else { if (j.accounts.length >= 20) throw new Error("20 accounts ki had."); j.accounts.push(acc); }
  save(j); return acc;
}
export async function patchAccount(id, fn) {
  const j = await migrate(load()); const a = j.accounts.find((x) => x.id === id);
  if (!a) throw new Error("Account nahi mila.");
  fn(a); save(j); return a;
}
export async function removeAccount(id) {
  const j = await migrate(load()); const n = j.accounts.length;
  j.accounts = j.accounts.filter((a) => a.id !== id); save(j);
  return n !== j.accounts.length;
}
