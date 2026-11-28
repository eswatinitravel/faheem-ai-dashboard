// v3.41 test: Jarvis Android app (APK download, phone ka pehla page, app pairing, LAN guard raaste).
import fs from "fs"; import os from "os"; import path from "path";
import { register } from "module";
register("./ext-resolve-hook.mjs", import.meta.url);
import { fileURLToPath } from "url";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v341-"));
process.env.JARVIS_APK_FILE = path.join(tmp, "jarvis.apk");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };

const A = await import("../lib/apk.js");
const P = await import("../lib/phone.js");
const fakeApk = () => { const b = Buffer.alloc(80 * 1024, 1); b.write("PK\x03\x04", 0, "latin1"); b.write("AndroidManifest.xml", 100); return b; };
const resp = (buf, status = 200) => ({ ok: status < 400, status, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) });

await t("APK pehchan: asli ZIP + manifest", () => A.looksLikeApk(fakeApk()));
await t("APK pehchan: HTML error page nahi", () => !A.looksLikeApk(Buffer.from("<html>Not Found</html>".padEnd(90000, " "))));
await t("APK pehchan: chhoti file nahi", () => { const b = Buffer.from("PK\x03\x04AndroidManifest.xml", "latin1"); return !A.looksLikeApk(b); });
await t("shuru mein app file nahi", () => A.apkInfo().ready === false);
await t("GitHub 404 par saaf ghalti, file nahi banti", async () => { const r = await A.ensureApk({ fetchImpl: async () => resp(Buffer.alloc(0), 404) }); return !r.ok && /404/.test(r.error) && !fs.existsSync(process.env.JARVIS_APK_FILE); });
await t("HTML aaye to save nahi", async () => { const r = await A.ensureApk({ fetchImpl: async () => resp(Buffer.from("<html>".padEnd(90000, "x"))) }); return !r.ok && !A.apkInfo().ready; });
let calls = 0;
await t("asli APK download aur save", async () => { const r = await A.ensureApk({ fetchImpl: async (u) => { calls++; if (!/releases\/download\/jarvis-android\/jarvis\.apk$/.test(u)) throw new Error(u); return resp(fakeApk()); } }); return r.ok && r.fresh && A.apkInfo().size === 80 * 1024; });
await t("24 ghante ke andar dobara download nahi", async () => { const r = await A.ensureApk({ fetchImpl: async () => { calls++; return resp(fakeApk()); } }); return r.ok && !r.fresh && calls === 1; });
await t("force par naya; fail ho to purani file chalti rahe", async () => { const r = await A.ensureApk({ force: true, fetchImpl: async () => { throw new Error("net band"); } }); return r.ok && r.warn === "net band" && A.apkInfo().ready; });
await t("koi .tmp file baqi nahi", () => !fs.existsSync(process.env.JARVIS_APK_FILE + ".tmp"));

await t("app ka User-Agent parhna", () => { const a = P.parseAppAgent("Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile FaheemJarvis/3.41.0 (SM-S928B)"); return a.app && a.version === "3.41.0" && a.device === "SM-S928B"; });
await t("aam browser app nahi", () => !P.parseAppAgent("Mozilla/5.0 (Linux; Android 14) Chrome/120").app);
await t("phone seen yaad", () => { P.notePhoneSeen("x FaheemJarvis/3.41.0 (SM-S928B)", 1000); const s = P.phoneSeen(); return s.at === 1000 && s.device === "SM-S928B" && s.app; });
await t("ajeeb device naam saaf", () => P.parseAppAgent("FaheemJarvis/1 (<script>x)").device.includes("<") === false);

const proxy = read("proxy.js");
await t("LAN guard: /app.html aur /download/jarvis sirf Phone connect On par", () => /p\.enabled && request\.method === "GET" && \[[^\]]*"\/app\.html"[^\]]*"\/download\/jarvis"/.test(proxy));
await t("LAN guard: /api/phone ab bhi sirf laptop", () => !/"\/api\/phone"/.test(proxy));
const app = read("public/app.html");
await t("phone page: key sirf # se, server ko nahi", () => /location\.hash\.match\(\/k=\(fad-/.test(app) && !/location\.search/.test(app));
await t("phone page: App se jodo = faheemjarvis://pair?h=&p=&k=", () => /faheemjarvis:\/\/pair\?h="\+encodeURIComponent\(h\)\+"&p="\+encodeURIComponent\(p\)\+"&k="/.test(app));
await t("phone page: APK link laptop se", () => /href="\/download\/jarvis"/.test(app));
const route = read("app/download/jarvis/route.js");
await t("download route: sahi content type + filename", () => /application\/vnd\.android\.package-archive/.test(route) && /Jarvis\.apk/.test(route));
const man = read("android/app/src/main/AndroidManifest.xml");
await t("Android: deep link faheemjarvis://pair", () => /android:scheme="faheemjarvis"/.test(man) && /android:host="pair"/.test(man));
await t("Android: mic + LAN http ijazat", () => /RECORD_AUDIO/.test(man) && /usesCleartextTraffic="true"/.test(man));
const act = read("android/app/src/main/java/com/faheem/jarvis/MainActivity.java");
await t("Android: sirf private IP aur fad- key maanta hai", () => /a == 192 && b == 168/.test(act) && /\^fad-\[a-f0-9\]\{16,64\}\$/.test(act));
await t("Android: bahar ke links browser mein (bridge sirf laptop page par)", () => /isOurs\(u\)/.test(act) && /ACTION_VIEW/.test(act));
await t("Android: User-Agent mein FaheemJarvis", () => /FaheemJarvis\//.test(act));
const m = read("public/m.html");
await t("Jarvis Remote: app mein Android mic + awaz", () => /JarvisNative/.test(m) && /N\.listen\(\)/.test(m) && /N\.speak\(t\)/.test(m) && /__jarvisHeard/.test(m));
await t("Jarvis modal QR app page kholta hai", () => /\/app\.html#k=/.test(read("app/components/JarvisPhone.js")));
await t("Connect page: Jarvis App hero", () => /data-jarvis-app/.test(read("app/connect/page.js")));
const wf = read(".github/workflows/android.yml");
await t("CI: APK banti hai, release sirf main par", () => /assembleRelease/.test(wf) && /if: github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'/.test(wf) && /jarvis-android/.test(wf));
await t("APK_URL release se milta hai", () => A.APK_URL.endsWith("/releases/download/jarvis-android/jarvis.apk"));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nv3.41: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
