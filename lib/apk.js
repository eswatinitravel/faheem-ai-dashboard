// v3.41 Jarvis Android app (APK): GitHub Actions har main push par banata hai (release "jarvis-android").
// Laptop pehli dafa zaroorat par download kar ke data/jarvis.apk mein rakhta hai; phone usi laptop se leta hai.
import fs from "fs";
import path from "path";

export const APK_URL = process.env.JARVIS_APK_URL || "https://github.com/eswatinitravel/faheem-ai-dashboard/releases/download/jarvis-android/jarvis.apk";
export const apkFile = () => process.env.JARVIS_APK_FILE || path.join(process.cwd(), "data", "jarvis.apk");
const MAX_AGE = 24 * 60 * 60 * 1000; // din mein ek dafa naya dekh lo
const MIN = 50 * 1024, MAX = 60 * 1024 * 1024;

export function apkInfo() {
  try { const st = fs.statSync(apkFile()); return { ready: true, size: st.size, updated: st.mtimeMs }; }
  catch { return { ready: false, size: 0, updated: 0 }; }
}

// APK asal mein ZIP hai: "PK\x03\x04" se shuru. HTML error page ya khali file kabhi save nahi.
export function looksLikeApk(buf) {
  return Buffer.isBuffer(buf) && buf.length >= MIN && buf.length <= MAX && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04
    && buf.includes(Buffer.from("AndroidManifest.xml"));
}

let busy = null;
export async function ensureApk({ force = false, fetchImpl = globalThis.fetch, timeoutMs = 120000 } = {}) {
  const info = apkInfo();
  if (info.ready && !force && Date.now() - info.updated < MAX_AGE) return { ok: true, ...info, fresh: false };
  if (busy) return busy;
  busy = (async () => {
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), timeoutMs);
      let r; try { r = await fetchImpl(APK_URL, { redirect: "follow", signal: ctl.signal }); } finally { clearTimeout(tm); }
      if (!r.ok) throw new Error(`GitHub se APK nahi mili (${r.status}). Thori der baad dobara.`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (!looksLikeApk(buf)) throw new Error("Download hui file APK nahi lagti.");
      const f = apkFile(); fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f + ".tmp", buf); fs.renameSync(f + ".tmp", f);
      return { ok: true, ...apkInfo(), fresh: true };
    } catch (e) {
      const cur = apkInfo(); // purani file ho to wahi chalne do
      return cur.ready ? { ok: true, ...cur, fresh: false, warn: e.message } : { ok: false, ...cur, error: e.name === "AbortError" ? "Download bohot der laga raha hai." : e.message };
    } finally { busy = null; }
  })();
  return busy;
}
