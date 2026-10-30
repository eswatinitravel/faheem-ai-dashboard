// v3.11 Gallery API (sirf isi laptop par, /api/keys jaisa):
//   GET                 -> files ki list
//   GET ?file=naam      -> file khud (HTML/CSS text ki tarah, chalti nahi)
//   POST multipart      -> files[] upload (qism + size + andar ke bytes check)
//   DELETE ?file=naam   -> file mitayein
import fs from "fs";
import path from "path";
import { TYPES, MAX_BYTES, MAX_FILES, MAX_TOTAL, galleryDir, extOf, safeName, resolveFile, magicOk, listFiles, totalSize } from "../../../lib/gallery";

export const dynamic = "force-dynamic";

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const deny = () => Response.json({ ok: false, error: "Gallery sirf isi laptop par." }, { status: 403 });

export async function GET(req) {
  if (!isLocal(req)) return deny();
  const name = new URL(req.url).searchParams.get("file");
  if (!name) return Response.json({ ok: true, files: listFiles(), limits: { maxBytes: MAX_BYTES, maxFiles: MAX_FILES, types: Object.keys(TYPES) } });
  const p = resolveFile(name);
  if (!p || !fs.existsSync(p)) return Response.json({ ok: false, error: "File nahi mili" }, { status: 404 });
  const t = TYPES[extOf(name)];
  // ?view=1: HTML (jaise Graphify ka graph.html) ko sandbox mein dikhayein — scripts chalein magar
  // dashboard ki API ko chhoo na sakein (sandbox origin, connect-src none, form-action none).
  if (new URL(req.url).searchParams.get("view") === "1" && ["html", "htm"].includes(extOf(name))) {
    return new Response(fs.readFileSync(p), { headers: { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'unsafe-inline' https:; img-src data: blob: https:; font-src data: https:; connect-src 'none'; form-action 'none'; frame-ancestors 'self'", "Cache-Control": "no-store" } });
  }
  return new Response(fs.readFileSync(p), { headers: { "Content-Type": t.mime, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'", "Cache-Control": "private, max-age=3600" } });
}

export async function POST(req) {
  if (!isLocal(req)) return deny();
  let form;
  try { form = await req.formData(); } catch { return Response.json({ ok: false, error: "Upload form ghalat hai (multipart/form-data chahiye)" }, { status: 400 }); }
  const files = form.getAll("files").filter((f) => f && typeof f === "object" && "arrayBuffer" in f);
  if (!files.length) return Response.json({ ok: false, error: "Koi file nahi mili" }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ ok: false, error: `Ek dafa mein ${MAX_FILES} files tak` }, { status: 400 });
  fs.mkdirSync(galleryDir(), { recursive: true });
  let used = totalSize();
  const saved = [], rejected = [];
  for (const f of files) {
    const ext = extOf(f.name);
    if (!TYPES[ext]) { rejected.push({ name: f.name, error: "Yeh qism allowed nahi (png, jpg, webp, gif, html, css, txt, md, json, pdf)" }); continue; }
    if (f.size > MAX_BYTES) { rejected.push({ name: f.name, error: "10MB se bari" }); continue; }
    if (!f.size) { rejected.push({ name: f.name, error: "Khali file" }); continue; }
    if (used + f.size > MAX_TOTAL) { rejected.push({ name: f.name, error: "Gallery bhar gayi (500MB) — purani files mitayein" }); continue; }
    const buf = Buffer.from(await f.arrayBuffer());
    if (!magicOk(ext, buf)) { rejected.push({ name: f.name, error: "File ka andar naam se match nahi karta" }); continue; }
    const name = safeName(f.name);
    fs.writeFileSync(path.join(galleryDir(), name), buf);
    used += buf.length;
    saved.push({ name, original: f.name, size: buf.length, kind: TYPES[ext].kind, url: `/api/gallery?file=${encodeURIComponent(name)}` });
  }
  return Response.json({ ok: saved.length > 0, saved, rejected }, { status: saved.length ? 200 : 400 });
}

export async function DELETE(req) {
  if (!isLocal(req)) return deny();
  const p = resolveFile(new URL(req.url).searchParams.get("file"));
  if (!p) return Response.json({ ok: false, error: "Ghalat naam" }, { status: 400 });
  if (!fs.existsSync(p)) return Response.json({ ok: false, error: "File nahi mili" }, { status: 404 });
  fs.unlinkSync(p);
  return Response.json({ ok: true });
}
