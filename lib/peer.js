// v3.28: asli TCP peer (socket) ka pata — server.mjs likhta hai, proxy.js parhta hai.
// Header ki shakal: "<raaz> <ip>". Raaz har server process mein naya (globalThis par), is liye
// Wi-Fi se aane wala koi bhi yeh header jaali nahi bana sakta; server.mjs client wala header mita deta hai.
import crypto from "crypto";

export const PEER_HEADER = "x-faheem-peer";
export const peerSecretKey = Symbol.for("faheem.peerSecret");

export function peerSecret() {
  const s = globalThis[peerSecretKey];
  return typeof s === "string" && s.length >= 32 ? s : "";
}

// Socket ka pata, sirf jab raaz sahi ho; warna "" (yaani: pata nahi, local mat samjho).
export function trustedPeer(headerValue, secret = peerSecret()) {
  if (!secret) return "";
  const v = String(headerValue || "");
  const i = v.indexOf(" ");
  if (i <= 0) return "";
  const a = Buffer.from(v.slice(0, i)), b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "";
  return v.slice(i + 1).trim();
}
