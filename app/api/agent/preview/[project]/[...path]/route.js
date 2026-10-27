import fs from "fs";
import path from "path";
import { projectDir, safe } from "../../../../../../lib/agent/tools";
export const dynamic = "force-dynamic";
const TYPES = { ".html": "text/html", ".htm": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".txt": "text/plain", ".woff2": "font/woff2" };
// Project ki website live dikhane ke liye (relative links, CSS, JS sab chalte hain).
export async function GET(req, ctx) {
  const params = await ctx.params;
  const dir = projectDir(params.project);
  let rel = (params.path || []).join("/") || "index.html";
  try {
    let full = safe(dir, rel);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) full = path.join(full, "index.html");
    if (!fs.existsSync(full)) return new Response(`<p style="font-family:sans-serif;padding:20px;color:#888">Abhi ${rel} nahi bani — agent ko kaam dein.</p>`, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
    const type = TYPES[path.extname(full).toLowerCase()] || "application/octet-stream";
    return new Response(fs.readFileSync(full), { headers: { "Content-Type": type + (type.startsWith("text") || type.includes("json") || type.includes("javascript") ? "; charset=utf-8" : ""), "Cache-Control": "no-store" } });
  } catch (e) { return new Response(e.message, { status: 403 }); }
}
