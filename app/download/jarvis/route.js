// v3.41 Phone yahan se Jarvis app (APK) leta hai. proxy.js: LAN se sirf tab jab Phone connect On ho.
import fs from "fs";
import { ensureApk, apkFile } from "../../../lib/apk.js";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET() {
  const r = await ensureApk();
  if (!r.ok) return new Response(`<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font:16px system-ui;background:#05070f;color:#cfe8ff;padding:24px'><h2>App abhi tayar nahi</h2><p>${String(r.error).replace(/[<>&]/g, "")}</p><p>Laptop internet se juda ho. Laptop par "Phone se jodo" page par "App file lao" dabayein.</p></body>`, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  const buf = fs.readFileSync(apkFile());
  return new Response(buf, { headers: { "Content-Type": "application/vnd.android.package-archive", "Content-Disposition": 'attachment; filename="Jarvis.apk"', "Content-Length": String(buf.length), "Cache-Control": "no-store" } });
}
