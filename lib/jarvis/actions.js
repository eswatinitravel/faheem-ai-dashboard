// v3.24 Jarvis laptop control: sirf ijazat wali (allowlist) cheezein. Khatarnak kaam (band/restart/lock) se pehle "haan" chahiye.
// Chrome control: Google ka chrome-devtools-mcp (Apache-2.0) agar laptop par lagaya ho; warna seedha browser mein link.
import { spawn, execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const WIN = process.platform === "win32";
const MAC = process.platform === "darwin";
const HOME = os.homedir();

const APPS = {
  chrome: { win: "chrome", mac: "Google Chrome", linux: "google-chrome", words: /(chrome|kroom|krome|browser)/i },
  edge: { win: "msedge", mac: "Microsoft Edge", linux: "microsoft-edge", words: /\bedge\b/i },
  notepad: { win: "notepad", mac: "TextEdit", linux: "gedit", words: /(notepad|note\s*pad|textedit)/i },
  calculator: { win: "calc", mac: "Calculator", linux: "gnome-calculator", words: /(calculator|calc\b|hisab)/i },
  explorer: { win: "explorer", mac: "Finder", linux: "nautilus", words: /(file\s*explorer|explorer|my\s*computer|this\s*pc|finder)/i },
  vscode: { win: "code", mac: "Visual Studio Code", linux: "code", words: /(vs\s*code|vscode|visual\s*studio\s*code)/i },
  paint: { win: "mspaint", mac: "Preview", linux: "gimp", words: /\bpaint\b/i },
  settings: { win: "ms-settings:", mac: "System Settings", linux: "gnome-control-center", words: /(settings|setting)/i, uri: true },
  word: { win: "winword", mac: "Microsoft Word", linux: "libreoffice --writer", words: /\b(ms\s*)?word\b/i },
  excel: { win: "excel", mac: "Microsoft Excel", linux: "libreoffice --calc", words: /\bexcel\b/i },
  whatsapp: { win: "whatsapp:", mac: "WhatsApp", linux: "", words: /whats\s*app/i, uri: true },
  spotify: { win: "spotify:", mac: "Spotify", linux: "spotify", words: /spotify/i, uri: true },
};
const FOLDERS = { downloads: "Downloads", download: "Downloads", documents: "Documents", document: "Documents", desktop: "Desktop", pictures: "Pictures", photos: "Pictures", music: "Music", videos: "Videos", video: "Videos" };
const SITES = { youtube: "https://www.youtube.com", google: "https://www.google.com", gmail: "https://mail.google.com", github: "https://github.com", facebook: "https://www.facebook.com", chatgpt: "https://chatgpt.com", maps: "https://maps.google.com" };
// v3.34 Free tools hub: laga ho to kholo, warna download page. (Sirf kholna; koi code copy nahi.)
const TOOLS = {
  neonclipping: { name: "NeonClipping", lnk: "NeonClipping", url: "https://github.com/iamajmeena/neonclipping", words: /(neon\s*clip|reels?\s*bana|shorts?\s*bana|clips?\s*bana)/i },
  meetily: { name: "Meetily", lnk: "Meetily", url: "https://github.com/Zackriya-Solutions/meetily", words: /(meetily|meeting\s*(notes|khulasa|record))/i },
  krokiet: { name: "Krokiet", lnk: "Krokiet", url: "https://github.com/qarmin/czkawka", words: /(krokiet|czkawka|duplicate|jagah\s*khali|space\s*khali)/i },
  sharex: { name: "ShareX", lnk: "ShareX", url: "https://github.com/ShareX/ShareX", words: /(sharex|screen\s*record|recording\s*(karo|shuru))/i },
  handbrake: { name: "HandBrake", lnk: "HandBrake", url: "https://github.com/HandBrake/HandBrake", words: /(handbrake|video\s*(chhoti|choti|compress|convert))/i },
  activitywatch: { name: "ActivityWatch", lnk: "ActivityWatch", url: "https://github.com/ActivityWatch/activitywatch", words: /(activity\s*watch\s*(kholo|open|chalao))/i },
  stirling: { name: "Stirling-PDF", lnk: "Stirling", url: "https://github.com/Stirling-Tools/Stirling-PDF", words: /(stirling|pdf\s*(se|to)\s*excel|pdf\s*tool)/i },
};
async function findShortcut(lnk) {
  if (!WIN) return "";
  const r = await ps(`$d=@("$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs","$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs","$env:USERPROFILE\\Desktop"); Get-ChildItem $d -Recurse -Filter "*${lnk.replace(/[^A-Za-z0-9 -]/g, "")}*.lnk" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName`);
  return r.ok ? r.out.split(/\r?\n/)[0].trim() : "";
}
async function openTool(id) {
  const t = TOOLS[id]; if (!t) return { ok: false, say: "Ye tool meri list mein nahi." };
  const lnk = await findShortcut(t.lnk);
  if (lnk) { await openTarget(lnk); return { ok: true, say: `${t.name} khol diya.` }; }
  await openTarget(t.url);
  return { ok: true, say: `${t.name} laptop par nahi mila. Iska download page khol diya; ya dashboard folder mein TOOLS.bat chalayein.` };
}
export const RISKY = new Set(["shutdown", "restart", "lock", "sleep"]);

function run(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    try {
      const c = spawn(cmd, args, { shell: !!opts.shell, detached: true, stdio: "ignore", windowsHide: true });
      c.on("error", (e) => resolve({ ok: false, error: e.message }));
      c.unref();
      setTimeout(() => resolve({ ok: true }), 300);
    } catch (e) { resolve({ ok: false, error: e.message }); }
  });
}
const openTarget = (target) => (WIN ? run("cmd", ["/c", "start", "", target]) : MAC ? run("open", [target]) : run("xdg-open", [target]));
const ps = (script) => new Promise((resolve) => execFile("powershell", ["-NoProfile", "-Command", script], { windowsHide: true, timeout: 15000 }, (e, out) => resolve({ ok: !e, out: String(out || "").trim(), error: e?.message })));

function which(bin) {
  const exts = WIN ? [".cmd", ".exe", ""] : [""];
  for (const d of String(process.env.PATH || "").split(path.delimiter)) for (const x of exts) { try { if (fs.existsSync(path.join(d, bin + x))) return path.join(d, bin + x); } catch {} }
  return "";
}
export const hasChromeDevtools = () => !!which("chrome-devtools");

// v3.25 TUIOS (MIT, Gaurav-Gosain/tuios): terminal window manager + Agent Inbox. TUIOS.bat se ~/.faheem-ai/bin mein aata hai.
const BIN = path.join(HOME, ".faheem-ai", "bin");
export function findBin(name) {
  const local = path.join(BIN, name + (WIN ? ".exe" : ""));
  return fs.existsSync(local) ? local : which(name);
}
export const TUIOS_WEB_URL = "http://localhost:7681";
async function portOpen(url) { try { await fetch(url, { signal: AbortSignal.timeout(1500) }); return true; } catch { return false; } }
// WebBrain (GPL-3.0, webbrain-one/webbrain): browser extension. Code copy nahi, sirf store link + hamara OpenAI-jaisa raasta.
export const WEBBRAIN_STORE = { chrome: "https://chromewebstore.google.com/detail/webbrain/ljhijonmfahplgbbacgcfnaihbjljhhb", edge: "https://microsoftedge.microsoft.com/addons/detail/dfbioajafcijomhljabppcelecgdgfeo", firefox: "https://addons.mozilla.org/firefox/addon/webbrain/" };

// Jumle se kaam pehchanna (tez, bina AI). null = koi laptop kaam nahi.
const DO = /(kholo|khol\s*do|khol\s*de|open|chalao|chala\s*do|start|launch|band\s*karo|band\s*kar\s*do|shut\s*down|restart|lock|lo\b|le\s*lo|lelo|barhao|barha\s*do|kam\s*karo|kam\s*kar\s*do|mute|dikhao|search|dhoondo|dhundo|bajao|play)/i;
export function detectLaptop(text = "") {
  const t = String(text).trim(); const low = t.toLowerCase();
  if (/(shutdown|shut\s*down|restart)\s*(roko|rok\s*do|cancel|mat\s*karo)/i.test(t)) return { name: "cancel_shutdown" };
  if (/(kitne\s*baje|time\s*kya|waqt\s*kya|what\s*time)/i.test(t)) return { name: "time" };
  // v3.32 ActivityWatch (localhost:5600): "aaj kitna kaam kiya", "mera time kahan gaya"
  if (/(aaj|today).{0,30}(kitna\s*kaam|kya\s*kiya|time\s*kahan|waqt\s*kahan|activity|screen\s*time)|(time|waqt)\s*kahan\s*gaya|activity\s*report/i.test(t)) return { name: "activity_today" };
  // v3.35 Excel Report page
  if (/(excel|sheet|data)\s*(ki\s*)?(report|safai|saaf|chart)/i.test(t) && (DO.test(t) || /(bana\s*do|banao|bnao|karo|kar\s*do)/i.test(t))) return { name: "open_url", args: { url: `http://localhost:${process.env.PORT || 3000}/excel` } };
  if (t && (DO.test(t) || /(bana\s*do|banao|bnao|karo|kar\s*do)/i.test(t))) for (const [k, v] of Object.entries(TOOLS)) if (v.words.test(t)) return { name: "open_tool", args: { tool: k } };
  if (!t || !DO.test(t)) return null;
  if (/tuios|agent\s*inbox|terminal\s*(os|manager)/i.test(t)) return { name: "open_tuios", args: { web: !/(terminal\s*mein|window\s*mein|native)/i.test(t) } };
  if (/web\s*brain/i.test(t)) return { name: "open_webbrain", args: { browser: /edge/i.test(t) ? "edge" : /firefox/i.test(t) ? "firefox" : "chrome" } };
  if (/(laptop|computer|pc|system)\s*(ko\s*)?(band|shut\s*down|off)/i.test(t) || /\bshut\s*down\b/i.test(t)) return { name: "shutdown" };
  if (/(laptop|computer|pc|system)\s*(ko\s*)?restart|\brestart\s*(karo|kar\s*do)/i.test(t)) return { name: "restart" };
  if (/(screen|laptop|computer|pc)\s*(ko\s*)?lock|\block\s*(karo|kar\s*do)/i.test(t)) return { name: "lock" };
  if (/(screenshot|screen\s*shot|screen\s*ki\s*(tasveer|photo|pic))/i.test(t)) return { name: "screenshot" };
  if (/(awaz|awaaz|volume|aawaz)/i.test(t)) return { name: "volume", args: { dir: /(mute|band|chup)/i.test(t) ? "mute" : /(kam|down|halki|dheemi)/i.test(t) ? "down" : "up" } };
  const ytq = t.match(/youtube\s*(par|pe|per|on)\s+(.+?)\s*(chalao|chala\s*do|lagao|bajao|play|search|dhoondo|dikhao)\b/i);
  if (ytq) return { name: "open_url", args: { url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(ytq[2]) } };
  const gq = t.match(/google\s*(par|pe|per|on)\s+(.+?)\s*(search|dhoondo|dhundo|dikhao)\b/i);
  if (gq) return { name: "open_url", args: { url: "https://www.google.com/search?q=" + encodeURIComponent(gq[2]) } };
  const url = (t.match(/https?:\/\/[^\s]+/) || [])[0];
  if (url) return { name: "open_url", args: { url } };
  for (const [k, u] of Object.entries(SITES)) if (low.includes(k) && /(kholo|khol|open|chalao|dikhao)/i.test(t)) return { name: "open_url", args: { url: u } };
  for (const [k, f] of Object.entries(FOLDERS)) if (new RegExp(`\\b${k}\\b`, "i").test(t) && /(folder|kholo|khol|open|dikhao)/i.test(t)) return { name: "open_folder", args: { folder: f } };
  const fq = t.match(/(?:file|files)\s+(.+?)\s*(dhoondo|dhundo|search|talash|find)/i) || t.match(/(?:dhoondo|search|find)\s+(?:file|files)\s+(.+)/i);
  if (fq) return { name: "find_files", args: { q: fq[1].replace(/\b(wali|wala|ki|ka|ke|naam|name)\b/gi, "").trim() } };
  for (const [k, a] of Object.entries(APPS)) if (a.words.test(t) && /(kholo|khol|open|chalao|chala|start|launch)/i.test(t)) return { name: "open_app", args: { app: k } };
  return null;
}

async function findFiles(q) {
  q = String(q || "").toLowerCase().slice(0, 60); if (q.length < 2) return [];
  const roots = ["Desktop", "Documents", "Downloads", "Pictures", "Videos", "Music"].map((d) => path.join(HOME, d)).filter((d) => fs.existsSync(d));
  const out = []; let seen = 0;
  const walk = (dir, depth) => {
    if (out.length >= 10 || seen > 6000 || depth > 4) return;
    let list = []; try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of list) {
      if (out.length >= 10) return; seen++;
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const p = path.join(dir, e.name);
      if (e.name.toLowerCase().includes(q)) out.push(p);
      if (e.isDirectory()) walk(p, depth + 1);
    }
  };
  for (const r of roots) walk(r, 0);
  return out;
}

// v3.32 ActivityWatch (MPL-2.0, sirf iska local API istemal; code copy nahi). AI ko sirf khulasa jata hai, poori history nahi.
async function activityToday() {
  const AW = "http://127.0.0.1:5600/api/0";
  let buckets;
  try { buckets = await (await fetch(AW + "/buckets/", { signal: AbortSignal.timeout(2500) })).json(); }
  catch { return { ok: false, say: "ActivityWatch laptop par nahi chal raha. activitywatch.net se free install karein, phir kal se report milegi." }; }
  const id = Object.keys(buckets || {}).find((k) => k.startsWith("aw-watcher-window"));
  if (!id) return { ok: false, say: "ActivityWatch chal raha hai magar window tracker nahi mila." };
  const start = new Date(); start.setHours(0, 0, 0, 0);
  let ev = [];
  try { ev = await (await fetch(`${AW}/buckets/${encodeURIComponent(id)}/events?start=${start.toISOString()}&limit=20000`, { signal: AbortSignal.timeout(5000) })).json(); } catch {}
  const by = {}; let total = 0;
  for (const e of Array.isArray(ev) ? ev : []) { const app = String(e?.data?.app || "?").replace(/\.exe$/i, ""); const d = Number(e?.duration) || 0; by[app] = (by[app] || 0) + d; total += d; }
  if (total < 60) return { ok: true, say: "Aaj abhi koi khaas activity record nahi hui." };
  const fmt = (s) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h} ghante ${m} minute` : `${m} minute`; };
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, s]) => `${a} ${fmt(s)}`).join(", ");
  return { ok: true, say: `Aaj laptop par ${fmt(total)} kaam hua. Sab se zyada: ${top}.` };
}

// Kaam chalana. confirmed=false aur khatarnak = pehle poocho.
export async function runLaptop(a, { confirmed = false } = {}) {
  if (!a?.name) return { ok: false, say: "Kaam samajh nahi aaya." };
  if (RISKY.has(a.name) && !confirmed) return { ok: false, needConfirm: true, say: { shutdown: "Laptop band kar doon? Haan ya nahi boliye.", restart: "Laptop restart kar doon? Haan ya nahi boliye.", lock: "Screen lock kar doon? Haan ya nahi boliye.", sleep: "Laptop sula doon? Haan ya nahi boliye." }[a.name] };
  try {
    switch (a.name) {
      case "open_app": {
        const app = APPS[a.args?.app]; if (!app) return { ok: false, say: "Yeh app meri list mein nahi." };
        const r = WIN ? (app.uri ? await openTarget(app.win) : await run("cmd", ["/c", "start", "", app.win])) : MAC ? await run("open", ["-a", app.mac]) : app.linux ? await run(app.linux, [], { shell: true }) : { ok: false, error: "linux par nahi" };
        return r.ok ? { ok: true, say: `${a.args.app} khol diya.` } : { ok: false, say: `${a.args.app} nahi khula: ${r.error}` };
      }
      case "open_url": {
        const u = String(a.args?.url || ""); if (!/^https?:\/\//i.test(u)) return { ok: false, say: "Sirf http ya https link khol sakta hoon." };
        if (hasChromeDevtools()) { const r = await run("chrome-devtools", ["navigate_page", "1", "--url", u], { shell: WIN }); if (r.ok) return { ok: true, say: "Chrome mein khol diya." }; }
        const r = await openTarget(u); return r.ok ? { ok: true, say: "Browser mein khol diya." } : { ok: false, say: "Link nahi khula." };
      }
      case "open_folder": {
        const d = path.join(HOME, a.args?.folder || ""); if (!fs.existsSync(d)) return { ok: false, say: "Yeh folder nahi mila." };
        await openTarget(d); return { ok: true, say: `${a.args.folder} folder khol diya.` };
      }
      case "find_files": {
        const list = await findFiles(a.args?.q);
        return list.length ? { ok: true, say: `${list.length} cheezein milin. Pehli: ${path.basename(list[0])}.`, files: list } : { ok: true, say: `"${a.args?.q}" naam ki koi file nahi mili.` };
      }
      case "screenshot": {
        const dir = path.join(HOME, "Pictures", "Faheem-Jarvis"); fs.mkdirSync(dir, { recursive: true });
        const f = path.join(dir, `screenshot-${Date.now()}.png`);
        if (WIN) {
          const r = await ps(`Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; $bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size); $bmp.Save('${f.replace(/'/g, "''")}'); 'ok'`);
          return r.ok ? { ok: true, say: "Screenshot le liya, Pictures ke Faheem-Jarvis folder mein hai.", file: f } : { ok: false, say: "Screenshot nahi bana." };
        }
        const r = MAC ? await run("screencapture", ["-x", f]) : await run("gnome-screenshot", ["-f", f]);
        return r.ok ? { ok: true, say: "Screenshot le liya.", file: f } : { ok: false, say: "Screenshot nahi bana." };
      }
      case "volume": {
        if (!WIN) return { ok: false, say: "Awaz ka control abhi sirf Windows par hai." };
        const key = { up: 175, down: 174, mute: 173 }[a.args?.dir || "up"]; const n = a.args?.dir === "mute" ? 1 : 5;
        await ps(`$w=New-Object -ComObject WScript.Shell; 1..${n} | % { $w.SendKeys([char]${key}) }`);
        return { ok: true, say: a.args?.dir === "mute" ? "Awaz band kar di." : a.args?.dir === "down" ? "Awaz kam kar di." : "Awaz barha di." };
      }
      case "lock": if (WIN) await run("rundll32.exe", ["user32.dll,LockWorkStation"]); else if (MAC) await run("pmset", ["displaysleepnow"]); return { ok: true, say: "Screen lock kar di." };
      case "shutdown": if (WIN) await run("shutdown", ["/s", "/t", "30"]); else await run("shutdown", ["-h", "+1"]); return { ok: true, say: "Laptop 30 second mein band hoga. Rokna ho to kahiye 'shutdown roko'." };
      case "restart": if (WIN) await run("shutdown", ["/r", "/t", "30"]); else await run("shutdown", ["-r", "+1"]); return { ok: true, say: "Laptop 30 second mein restart hoga." };
      case "cancel_shutdown": if (WIN) await run("shutdown", ["/a"]); else await run("shutdown", ["-c"]); return { ok: true, say: "Shutdown rok diya." };
      case "open_tuios": {
        if (a.args?.web !== false) {
          if (await portOpen(TUIOS_WEB_URL)) { await openTarget(TUIOS_WEB_URL); return { ok: true, say: "TUIOS pehle se chal raha tha, browser mein khol diya." }; }
          const tw = findBin("tuios-web");
          if (tw) { await run(tw, ["--host", "127.0.0.1", "--port", "7681"]); await new Promise((r) => setTimeout(r, 1500)); await openTarget(TUIOS_WEB_URL); return { ok: true, say: "TUIOS shuru kar ke browser mein khol diya." }; }
        }
        const tu = findBin("tuios");
        if (tu) { const r = WIN ? (which("wt") ? await run("wt", ["new-tab", tu]) : await run("cmd", ["/c", "start", "", tu])) : MAC ? await run("open", ["-a", "Terminal", tu]) : await run("x-terminal-emulator", ["-e", tu]); return r.ok ? { ok: true, say: "TUIOS terminal mein khol diya." } : { ok: false, say: "TUIOS nahi khula: " + r.error }; }
        return { ok: false, say: "TUIOS abhi laptop par nahi laga. Dashboard folder mein TUIOS.bat chala dein, phir dobara kahiye." };
      }
      case "open_webbrain": {
        const u = WEBBRAIN_STORE[a.args?.browser] || WEBBRAIN_STORE.chrome; await openTarget(u);
        return { ok: true, say: "WebBrain ka store page khol diya. Lagane ke baad Jarvis ke WebBrain card se Base URL copy kar ke dalein." };
      }
      case "activity_today": return await activityToday();
      case "open_tool": return await openTool(String(a.args?.tool || ""));
      case "time": return { ok: true, say: `Abhi ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} baje hain.` };
      default: return { ok: false, say: `"${a.name}" kaam meri ijazat wali list mein nahi.` };
    }
  } catch (e) { return { ok: false, say: "Kaam mein ghalti: " + e.message }; }
}

export const ACTIONS_HELP = "open_app{app: chrome|edge|notepad|calculator|explorer|vscode|paint|settings|word|excel|whatsapp|spotify}, open_url{url}, open_folder{folder: Downloads|Documents|Desktop|Pictures|Music|Videos}, find_files{q}, screenshot{}, volume{dir: up|down|mute}, lock{}, shutdown{}, restart{}, cancel_shutdown{}, time{}, activity_today{}, open_tool{tool: neonclipping|meetily|krokiet|sharex|handbrake|activitywatch|stirling}, open_tuios{web: true|false}, open_webbrain{browser: chrome|edge|firefox}";

// v3.31: screen ki chhoti JPEG (vision ke liye). Kuch save nahi hota; temp file foran mit jati hai.
export async function screenForVision() {
  const f = path.join(os.tmpdir(), `jarvis-screen-${Date.now()}.jpg`);
  let ok = false;
  if (WIN) {
    const r = await ps(`Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; $bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size); $s=[Math]::Min(1,1400/$b.Width); $w=[int]($b.Width*$s); $h=[int]($b.Height*$s); $o=New-Object System.Drawing.Bitmap $w,$h; $g2=[System.Drawing.Graphics]::FromImage($o); $g2.InterpolationMode='HighQualityBicubic'; $g2.DrawImage($bmp,0,0,$w,$h); $enc=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | ? { $_.MimeType -eq 'image/jpeg' }; $p=New-Object System.Drawing.Imaging.EncoderParameters 1; $p.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality),[long]80; $o.Save('${f.replace(/'/g, "''")}',$enc,$p); 'ok'`);
    ok = r.ok;
  } else if (MAC) ok = (await run("screencapture", ["-x", "-t", "jpg", f])).ok;
  else ok = (await run("gnome-screenshot", ["-f", f])).ok;
  if (!ok || !fs.existsSync(f)) return null;
  try { const b = fs.readFileSync(f); return "data:image/jpeg;base64," + b.toString("base64"); } finally { try { fs.unlinkSync(f); } catch {} }
}
export const LOOK_SCREEN = /(screen|skrin|سکرین)\s*(ko\s*)?(parho|padho|parh\s*kar|dekho|dekh\s*kar|read|par\s*kya|pe\s*kya|per\s*kya)|what(?:'?s|\s+is)\s*on\s*(my\s*)?screen|read\s*(my\s*)?screen/i;
