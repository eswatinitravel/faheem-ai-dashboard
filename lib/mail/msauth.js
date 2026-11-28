// v3.40 Hotmail/Outlook.com sign-in: Microsoft OAuth 2.0 device code flow (koi password dashboard mein nahi).
// 1) start: Microsoft se ek code milta hai; aap microsoft.com/link par daal kar "Allow" karte hain.
// 2) poll: dashboard token le leta hai (refresh token sirf mail-accounts.json mein, isi laptop par).
// Docs: learn.microsoft.com/entra/identity-platform/v2-oauth2-device-code
import { getAccount, patchAccount } from "./accounts.js";

const AUTH = (process.env.MS_AUTH_BASE || "https://login.microsoftonline.com") + "/consumers/oauth2/v2.0";
export const MS_SCOPES = "offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send";
const FLOWS = (globalThis.__faheemMsFlows ||= new Map());

async function form(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body), signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

export async function startDeviceLogin(accountId) {
  const a = await getAccount(accountId);
  if (!a || a.auth !== "oauth_ms") throw new Error("Yeh Hotmail/Outlook account nahi.");
  const { status, j } = await form(`${AUTH}/devicecode`, { client_id: a.oauth.clientId, scope: MS_SCOPES });
  if (status !== 200 || !j.device_code) throw new Error("Microsoft ne code nahi diya: " + (j.error_description || j.error || status).toString().slice(0, 200));
  FLOWS.set(accountId, { device: j.device_code, interval: (j.interval || 5) * 1000, exp: Date.now() + (j.expires_in || 900) * 1000 });
  return { userCode: j.user_code, url: j.verification_uri || "https://microsoft.com/link", expiresIn: j.expires_in || 900 };
}

// Page har ~5s bulata hai. Wapas: { done } ya { waiting } ya error.
export async function pollDeviceLogin(accountId) {
  const f = FLOWS.get(accountId);
  if (!f) throw new Error("Pehle 'Microsoft se jodo' dabayein.");
  if (Date.now() > f.exp) { FLOWS.delete(accountId); throw new Error("Code ka waqt khatam. Dobara jodein."); }
  const a = await getAccount(accountId);
  const { j } = await form(`${AUTH}/token`, { grant_type: "urn:ietf:params:oauth:grant-type:device_code", client_id: a.oauth.clientId, device_code: f.device });
  if (j.access_token) {
    FLOWS.delete(accountId);
    await patchAccount(accountId, (x) => { x.oauth = { ...x.oauth, access: j.access_token, refresh: j.refresh_token || x.oauth.refresh, exp: Date.now() + (j.expires_in || 3600) * 1000 }; x.lastError = null; });
    return { done: true };
  }
  if (j.error === "authorization_pending" || j.error === "slow_down") return { waiting: true };
  FLOWS.delete(accountId);
  throw new Error(j.error === "authorization_declined" ? "Aap ne Microsoft par mana kar diya." : "Microsoft: " + String(j.error_description || j.error).slice(0, 200));
}

// IMAP/SMTP se pehle taza access token (5 min pehle refresh).
export async function accessToken(a) {
  if (a.oauth?.access && a.oauth.exp - Date.now() > 300000) return a.oauth.access;
  if (!a.oauth?.refresh) throw new Error(`${a.email}: Microsoft se dobara jodein.`);
  const { j } = await form(`${AUTH}/token`, { grant_type: "refresh_token", client_id: a.oauth.clientId, refresh_token: a.oauth.refresh, scope: MS_SCOPES });
  if (!j.access_token) {
    await patchAccount(a.id, (x) => { x.lastError = "Microsoft sign-in khatam, dobara jodein."; });
    throw new Error(`${a.email}: Microsoft sign-in khatam (${j.error || "?"}). Dobara jodein.`);
  }
  await patchAccount(a.id, (x) => { x.oauth = { ...x.oauth, access: j.access_token, refresh: j.refresh_token || x.oauth.refresh, exp: Date.now() + (j.expires_in || 3600) * 1000 }; });
  return j.access_token;
}
