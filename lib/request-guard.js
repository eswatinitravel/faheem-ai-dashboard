// v3.28 CSRF / DNS-rebinding guard (proxy.js istemal karta hai; scripts/safety-test.mjs isay seedha parakhta hai).
// Masla: localhost par har request "apni" maani jati thi, is liye koi bhi website browser se
// localhost:3000/api/agent, /api/keys, /api/settings, /api/jarvis ("haan") par POST bhej sakti thi.
// Hal: state badalne wali requests (POST/PUT/PATCH/DELETE) sirf isi dashboard ke page ya extension se,
// aur sirf JSON (upload routes par multipart bhi). /api/v1/* Bearer key se chalta hai, us par yeh guard nahi.
import { LOOP_HOST, hostName } from "./phone.js";

export const STATE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// lib/cors.js wala idea: browser extension (WebBrain) ko ijazat.
export const EXT_ORIGIN = /^(chrome-extension|moz-extension|safari-web-extension):\/\/[a-z0-9-]+$/i;
// Sirf yeh routes formData() parhte hain (file / awaz upload) — inhi par multipart/form-data chalega.
export const UPLOAD_ROUTES = ["/api/gallery", "/api/transcribe", "/api/jarvis/stt"];

const getter = (headers) => (k) => (typeof headers?.get === "function" ? headers.get(k) : headers?.[k]) || "";
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

// Origin wahi hai jo Host? (http://localhost:3000 == Host localhost:3000)
export function sameOrigin(origin, host) {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = String(host || "").trim().toLowerCase();
    if (!h) return false;
    const def = u.protocol === "https:" ? ":443" : ":80";
    const norm = (x) => (x.endsWith(def) ? x.slice(0, -def.length) : x);
    return norm(u.host.toLowerCase()) === norm(h);
  } catch { return false; }
}

// DNS-rebinding: evil.com -> 127.0.0.1 kar ke aaye to Host "evil.com" hota hai. Guard band (Docker / lan-guard-off)
// ho tab bhi sirf localhost / 127.x / [::1] ya seedha IP (LAN se kholna) qubool; koi domain naam nahi.
export function hostOkWhenGuardOff(hostHeader) {
  const n = hostName(hostHeader);
  if (!n) return false;
  return LOOP_HOST.test(n) || IPV4.test(n) || /^\[[0-9a-f:.]+\]$/i.test(n);
}

export function isUploadRoute(pathname) {
  return UPLOAD_ROUTES.some((r) => pathname === r || pathname === r + "/");
}

// null = theek; warna { status, message }.
export function csrfCheck({ method, pathname, headers }) {
  const m = String(method || "GET").toUpperCase();
  const p = String(pathname || "");
  if (!STATE_METHODS.has(m)) return null;
  if (!p.startsWith("/api/")) return null;
  if (p === "/api/v1" || p.startsWith("/api/v1/")) return null; // Bearer key wala raasta
  const get = getter(headers);
  const origin = String(get("origin")).trim();
  const ext = !!origin && EXT_ORIGIN.test(origin);
  if (origin && !ext && !sameOrigin(origin, get("host"))) return { status: 403, message: "Doosri website se request — ijazat nahi (CSRF guard)." };
  if (!ext && String(get("sec-fetch-site")).toLowerCase() === "cross-site") return { status: 403, message: "Cross-site request — ijazat nahi (CSRF guard)." };
  const ct = String(get("content-type")).split(";")[0].trim().toLowerCase();
  const len = String(get("content-length")).trim();
  const hasBody = !!ct || !!get("transfer-encoding") || (len !== "" && len !== "0");
  if (hasBody) {
    const json = ct === "application/json" || /^application\/[a-z0-9.+-]+\+json$/.test(ct);
    const multipart = ct === "multipart/form-data" && isUploadRoute(p);
    if (!json && !multipart) return { status: 415, message: isUploadRoute(p) ? "Content-Type application/json ya multipart/form-data chahiye." : "Content-Type application/json chahiye." };
  }
  return null;
}
