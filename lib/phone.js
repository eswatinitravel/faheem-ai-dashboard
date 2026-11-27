// v3.27 Phone se jodo: laptop ka LAN IP, phone ki chabi (key) aur on/off — data/phone.json mein (git se bahar).
// Maid (MIT) aur PocketPal AI (MIT) ke "remote OpenAI-compatible server" idea par; apna code.
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { PEER_HEADER, peerSecret, trustedPeer } from "./peer.js";

const FILE = () => path.join(process.cwd(), "data", "phone.json");
const VIRTUAL = /(vethernet|virtualbox|vmware|vbox|hyper-v|wsl|docker|loopback|tailscale|zerotier|hamachi|bluetooth|npcap|tap|tun|utun|br-|veth|virbr)/i;

const newKey = () => "fad-" + crypto.randomBytes(12).toString("hex");

export function readPhone() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE(), "utf8"));
    if (j && typeof j.key === "string" && j.key.length >= 16) return { enabled: !!j.enabled, fullLan: !!j.fullLan, key: j.key, updated: j.updated || 0 };
  } catch {}
  return { enabled: false, fullLan: false, key: "", updated: 0 };
}

export function writePhone(patch = {}) {
  const cur = readPhone();
  const next = { ...cur, ...patch, updated: Date.now() };
  if (!next.key || patch.rotate) next.key = newKey();
  delete next.rotate;
  fs.mkdirSync(path.dirname(FILE()), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify(next, null, 1));
  return next;
}

// Private LAN range? (192.168.x, 10.x, 172.16-31.x)
export function isPrivateV4(ip) {
  const p = String(ip).split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !(n >= 0 && n <= 255))) return false;
  return p[0] === 10 || (p[0] === 192 && p[1] === 168) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31);
}

// Laptop ke saare IPv4 pate; Wi-Fi/Ethernet pehle, virtual adapters (WSL, Hyper-V, VirtualBox) aakhir mein.
export function lanAddresses(ifaces = os.networkInterfaces()) {
  const out = [];
  for (const [name, list] of Object.entries(ifaces || {})) {
    for (const a of list || []) {
      const fam = typeof a.family === "number" ? (a.family === 4 ? "IPv4" : "IPv6") : a.family;
      if (fam !== "IPv4" || a.internal) continue;
      if (/^169\.254\./.test(a.address)) continue; // APIPA (bina DHCP)
      const virtual = VIRTUAL.test(name);
      const wifi = /(wi-?fi|wlan|wireless|wl)/i.test(name);
      const score = (isPrivateV4(a.address) ? 0 : 20) + (virtual ? 50 : 0) + (wifi ? 0 : 5) + (/^192\.168\./.test(a.address) ? 0 : 2);
      out.push({ name, address: a.address, virtual, wifi, private: isPrivateV4(a.address), score });
    }
  }
  return out.sort((a, b) => a.score - b.score);
}

export function phoneInfo(port = Number(process.env.PORT) || 3000) {
  const ips = lanAddresses();
  const ip = ips[0]?.address || "";
  const base = ip ? `http://${ip}:${port}/api/v1` : "";
  const httpsPort = globalThis.__faheemHttpsPort || 0; // v3.35: server.mjs HTTPS chala ho to
  return { ip, ips, port, httpsPort, base, pocketpalBase: ip ? `http://${ip}:${port}/api` : "", model: "faheem-free", platform: process.platform };
}

// Loopback? (proxy.js aur routes dono yahi istemal karte hain)
export const LOOP_HOST = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|::1)$/i;
export function isLoopbackIp(ip) {
  const s = String(ip || "").trim().replace(/^\[|\]$/g, "");
  return s === "::1" || /^127\./.test(s) || /^::ffff:127\./i.test(s);
}
export function hostName(hostHeader) {
  const h = String(hostHeader || "").trim();
  if (h.startsWith("[")) return h.slice(0, h.indexOf("]") + 1);
  return h.split(":")[0];
}
// Request isi laptop se aayi? v3.28: faisla asli TCP peer (socket) se — server.mjs har request par
// raaz ke saath "x-faheem-peer" likhta hai. Host ya x-forwarded-for par bharosa nahi (dono client bhej sakta hai;
// Next.js XFF tabhi bharta hai jab woh pehle se na ho). Raaz na mile (server.mjs ke bagair `next start`) to local nahi.
// Host bhi loopback hona chahiye (laptop ke browser par DNS-rebinding se bachao).
export function requestIsLocal(headers, secret = peerSecret()) {
  const get = (k) => (typeof headers?.get === "function" ? headers.get(k) : headers?.[k]);
  if (!LOOP_HOST.test(hostName(get("host")))) return false;
  const peer = trustedPeer(get(PEER_HEADER), secret);
  return !!peer && isLoopbackIp(peer);
}
export function bearer(headers) {
  const get = (k) => (typeof headers?.get === "function" ? headers.get(k) : headers?.[k]);
  const a = String(get("authorization") || "");
  const m = a.match(/^Bearer\s+(.+)$/i);
  return (m ? m[1] : get("x-api-key") || "").trim();
}
export function safeEqual(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

// Docker (bridge IP se har request aati hai) ya file data/lan-guard-off: guard band.
// (Env var proxy ke andar nahi pahunchta, is liye file / Docker ki nishani dekhte hain.)
export function guardDisabled() {
  const has = (f) => { try { fs.readFileSync(f); return true; } catch (e) { return e?.code === "EISDIR"; } };
  return has("/.dockerenv") || has(path.join(process.cwd(), "data", "lan-guard-off"));
}
