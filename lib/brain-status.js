// v3.14 Brains Rooms: status light + key pool + pagination. Koi import nahi (server, browser aur tests sab parh sakein).
// Key pool ka khayal shihabshahrier/freelm (MIT) se liya — code apna hai (NOTICE.md).

// ---------- Key ko chhupana (kabhi poori key na dikhe/log ho) ----------
export function maskKey(k) {
  const s = String(k || "").trim();
  if (!s) return "";
  return "••••" + s.slice(-4);
}
export const maskAll = (list) => (list || []).map(maskKey);

// ---------- Key pool: "a,b,c" ya nayi lines ---------
export function parsePool(raw) {
  const out = [];
  for (const part of String(raw || "").split(/[\s,;]+/)) {
    const k = part.trim().replace(/^["']|["']$/g, "");
    if (k && !out.includes(k)) out.push(k);
  }
  return out.slice(0, 5); // 2-3 keys ka irada; zyada se zyada 5
}
export const joinPool = (keys) => parsePool((keys || []).join(",")).join(",");

// ---------- HTTP jawab -> light ----------
// green = key chal rahi; red = ghalat/expire/revoke (401/403) ya quota bilkul khatam; yellow = 429 limit; grey = key nahi.
export function statusFromHttp(status, body = "", retryAfterSec = 0) {
  const msg = String(typeof body === "string" ? body : JSON.stringify(body || "")).slice(0, 2000);
  const expired = /expired|expire|revoked|deactivated|disabled|invalid.{0,20}key|incorrect api key|unauthori[sz]ed|not valid/i.test(msg);
  if (status >= 200 && status < 300) return { light: "green", label: "Chal rahi hai", code: status };
  if (status === 401 || status === 403) return { light: "red", label: expired ? "Key expire/ghalat (" + status + ")" : `Key qubool nahi (${status})`, code: status, dead: true, expired: expired || status === 401 };
  if (status === 402 || /insufficient_quota|insufficient credits|credit balance|out of credits|limit:\s*0\b/i.test(msg) && status === 429) {
    return { light: "red", label: "Quota bilkul khatam", code: status, dead: true };
  }
  if (status === 429) {
    let sec = Number(retryAfterSec) || 0;
    if (!sec) { const m = /retry.{0,12}?(\d+(?:\.\d+)?)\s*s/i.exec(msg); if (m) sec = Math.ceil(Number(m[1])); }
    if (!sec && /per\s*day|daily|perday|requests_per_day/i.test(msg)) sec = 3600;
    if (!sec) sec = 60;
    const min = Math.max(1, Math.ceil(sec / 60));
    return { light: "yellow", label: `Limit — ${min} min baad wapas`, code: 429, minutes: min, retrySec: sec };
  }
  if (status === 404) return { light: "red", label: "Model/raasta nahi mila (404)", code: 404 };
  if (status >= 500) return { light: "yellow", label: `Server busy (${status})`, code: status, minutes: 5, retrySec: 300 };
  if (status === 0) return { light: "red", label: "Raabta nahi (internet/server band)", code: 0 };
  return { light: "red", label: `HTTP ${status}`, code: status };
}

// Error message (providers.js) -> HTTP code andaza
export function codeFromError(msg) {
  const s = String(msg || "");
  const m = /HTTP (\d{3})/.exec(s);
  if (m) return Number(m[1]);
  if (/limit reached|429/.test(s)) return 429;
  if (/busy|503/.test(s)) return 503;
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|abort|timeout/i.test(s)) return 0;
  return 500;
}

const RANK = { green: 0, yellow: 1, red: 2, grey: 3 };
// Pool ki saari keys ka natija -> brain ki ek light (koi ek bhi green ho to green)
export function combineLights(list) {
  if (!list || !list.length) return { light: "grey", label: "Key nahi lagi" };
  return [...list].sort((a, b) => RANK[a.light] - RANK[b.light])[0];
}

// Lal light par madad (key expiry)
export function expiryHelp(keyUrl) {
  return { text: "Nayi key banayein — No expiration chunein", url: keyUrl || "" };
}

// ---------- Key pool rotation (memory mein) ----------
// state: Map(brainId -> Map(key -> { restUntil, disabled, why }))
export function createPoolState() { return new Map(); }
const globalPool = createPoolState();
export const poolState = () => globalPool;

function slot(state, id, key) {
  if (!state.has(id)) state.set(id, new Map());
  const m = state.get(id);
  if (!m.has(key)) m.set(key, { restUntil: 0, disabled: false, why: "" });
  return m.get(key);
}

// Agli istemal ke qabil key: disabled nahi, aaram (rest) khatam. exclude = abhi aazmayi hui.
export function poolPick(id, keys, exclude = [], state = globalPool, now = Date.now()) {
  for (const k of keys || []) {
    if (exclude.includes(k)) continue;
    const s = slot(state, id, k);
    if (s.disabled) continue;
    if (s.restUntil > now) continue;
    return k;
  }
  return null;
}

// Natija darj karein: 429 = aaram (rest) retry tak; 401/403 = key band; 200 = theek.
export function poolMark(id, key, code, retrySec = 60, state = globalPool, now = Date.now()) {
  if (!key) return;
  const s = slot(state, id, key);
  if (code === 401 || code === 403) { s.disabled = true; s.why = `HTTP ${code}`; }
  else if (code === 429 || code === 402) { s.restUntil = now + Math.max(1, retrySec) * 1000; s.why = code === 402 ? "quota khatam" : "limit"; }
  else if (code >= 200 && code < 300) { s.disabled = false; s.restUntil = 0; s.why = ""; }
}

export function poolSummary(id, keys, state = globalPool, now = Date.now()) {
  return (keys || []).map((k) => {
    const s = slot(state, id, k);
    return { key: maskKey(k), disabled: s.disabled, resting: s.restUntil > now, restMin: s.restUntil > now ? Math.ceil((s.restUntil - now) / 60000) : 0, why: s.why };
  });
}

// ---------- Pagination: har screen par bilkul 4 brains (2x2) ----------
export const FIRST_PAGE = ["groq", "gemini", "zai", "mistral"];
export const PER_PAGE = 4;
export function orderRooms(list) {
  const first = FIRST_PAGE.map((id) => list.find((b) => b.id === id)).filter(Boolean);
  return [...first, ...list.filter((b) => !FIRST_PAGE.includes(b.id))];
}
export function pageRooms(list, page = 1, per = PER_PAGE) {
  const ordered = orderRooms(list);
  const pages = Math.max(1, Math.ceil(ordered.length / per));
  const p = Math.min(Math.max(1, Number(page) || 1), pages);
  return { page: p, pages, items: ordered.slice((p - 1) * per, p * per), total: ordered.length };
}

// ---------- Attach routing: picture sirf vision brain ko ----------
// brain: { vision?: bool }; attachments: [{kind:"image"|"text"|"video"|"file", name, dataUrl?, text?, duration?}]
export function routeAttachments(brain, text, attachments = []) {
  const notes = [];
  const images = [];
  let extra = "";
  for (const a of (attachments || []).slice(0, 6)) {
    if (!a || typeof a !== "object") continue;
    if (a.kind === "image" && typeof a.dataUrl === "string" && a.dataUrl.startsWith("data:image/")) {
      if (brain?.vision) images.push(a.dataUrl);
      else notes.push(`"${a.name || "tasveer"}" nahi bheji: ${brain?.name || "yeh brain"} tasveer nahi dekh sakta. Gemini, Groq, Free.ai ya Puter room mein bhejein.`);
    } else if (a.kind === "text" && typeof a.text === "string") {
      extra += `\n\n[File: ${a.name || "file.txt"}]\n${a.text.slice(0, 20000)}`;
    } else if (a.kind === "video") {
      extra += `\n\n[Video lagi: ${a.name || "video"}${a.duration ? `, ${Math.round(a.duration)}s` : ""}. Brain video dekh nahi sakta, sirf naam/lambai pata hai.]`;
      notes.push(`Video "${a.name || ""}" ki sirf maloomat bheji (brains video nahi dekhte).`);
    } else if (a.kind === "file") {
      extra += `\n\n[File lagi: ${a.name || "file"} — is qism ko parha nahi ja sakta]`;
      notes.push(`"${a.name || "file"}" parhi nahi ja saki (sirf text files parhi jati hain).`);
    }
  }
  const body = String(text || "") + extra;
  const content = images.length ? [{ type: "text", text: body }, ...images.map((url) => ({ type: "image_url", image_url: { url } }))] : body;
  return { content, notes, imageCount: images.length, text: body };
}
