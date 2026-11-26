import fs from "fs";
import path from "path";
import { projectDir, safe, isSecretPath } from "../../../../../../lib/agent/tools";
export const dynamic = "force-dynamic";
const TYPES = { ".html": "text/html", ".htm": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".txt": "text/plain", ".woff2": "font/woff2" };
// v3.28: agent ki banai HTML isi origin par chalti thi aur dashboard ki APIs bula sakti thi. Ab CSP sandbox
// (allow-same-origin NAHI) — page "opaque origin" ban kar chalta hai: scripts/forms/popups chalte hain,
// magar dashboard ki cookies / APIs / localStorage tak rasai nahi.
const SANDBOX = { "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-popups", "X-Content-Type-Options": "nosniff" };
// Sandbox page apni hi JS module / fetch("data.json") maange to Origin "null" aata hai; sirf tab ijazat jab
// Referer isi preview se ho (doosri website Referer nahi bana sakti).
function previewCors(req) {
  const o = req.headers.get("origin"), ref = req.headers.get("referer") || "";
  try { if (o === "null" && new URL(ref).host === req.headers.get("host") && new URL(ref).pathname.startsWith("/api/agent/preview/")) return { "Access-Control-Allow-Origin": "null", Vary: "Origin, Referer" }; } catch {}
  return {};
}
// Project ki website live dikhane ke liye (relative links, CSS, JS sab chalte hain).
export async function GET(req, ctx) {
  const params = await ctx.params;
  const dir = projectDir(params.project);
  let rel = (params.path || []).join("/") || "index.html";
  try {
    let full = safe(dir, rel);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) full = path.join(full, "index.html");
    if (isSecretPath(full)) return new Response("Raaz (API key / token) wali file preview mein nahi dikhti.", { status: 403, headers: SANDBOX });
    if (!fs.existsSync(full)) return new Response(`<p style="font-family:sans-serif;padding:20px;color:#888">Abhi ${rel} nahi bani — agent ko kaam dein.</p>`, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", ...SANDBOX } });
    const type = TYPES[path.extname(full).toLowerCase()] || "application/octet-stream";
    return new Response(fs.readFileSync(full), { headers: { "Content-Type": type + (type.startsWith("text") || type.includes("json") || type.includes("javascript") ? "; charset=utf-8" : ""), "Cache-Control": "no-store", ...SANDBOX, ...previewCors(req) } });
  } catch (e) { return new Response(e.message, { status: 403, headers: SANDBOX }); }
}
