// Runtime Tester: website ko ek chhupe hue browser (jsdom) mein khol kar chalata hai,
// har button/link dabata hai aur jo JavaScript ghaltiyan aati hain unhein pakarta hai.
// Alag process mein chalta hai, taake ghalat code (jaise infinite loop) dashboard ko na roke.
// Istemal: node scripts/runtime-test.cjs <file.html>     ya     html stdin par (base dir argv[3] optional)
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole, ResourceLoader } = require("jsdom");

const MAX_CLICKS = 60;

class LocalOnly extends ResourceLoader {
  // Sirf project ki apni files (file://) load hon; internet wali libraries chhor dein.
  constructor(allowFiles) { super(); this.allowFiles = allowFiles; }
  fetch(url, options) {
    if (this.allowFiles && url.startsWith("file:")) return super.fetch(url, options);
    return null;
  }
}

// file:// par browser localStorage nahi deta — test ke liye memory wala storage.
function memoryStorage() {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => m.clear(),
  };
}

function readStdin() {
  return new Promise((res) => { let d = ""; process.stdin.setEncoding("utf8"); process.stdin.on("data", (c) => (d += c)); process.stdin.on("end", () => res(d)); });
}

(async () => {
  const fileArg = process.argv[2];
  const html = fileArg && fileArg !== "-" ? fs.readFileSync(fileArg, "utf8") : await readStdin();
  const baseDir = fileArg && fileArg !== "-" ? path.dirname(path.resolve(fileArg)) : (process.argv[3] || process.cwd());
  const url = "file://" + path.join(baseDir, fileArg && fileArg !== "-" ? path.basename(fileArg) : "index.html").replace(/\\/g, "/");

  const errors = [];
  const add = (where, msg) => {
    const m = String(msg || "").split("\n")[0].slice(0, 220);
    if (!m) return;
    const key = `${where}: ${m}`;
    if (!errors.includes(key)) errors.push(key);
  };
  const hasExternalScripts = /<script[^>]+src=["']https?:/i.test(html);
  let phase = "page load";

  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const msg = (e && (e.detail?.message || e.message)) || String(e);
    // jsdom khud kuch cheezein nahi banata (canvas, scroll, media) — woh asli ghalti nahi.
    if (/Not implemented|Could not load (script|img|link|iframe)|ENOENT|canvas|HTMLMediaElement|scrollTo|matchMedia/i.test(msg)) return; // ghaib file neeche alag pakarte hain
    if (hasExternalScripts && /is not defined/i.test(msg)) return; // internet library (jaise THREE) yahan load nahi hoti
    add(phase, msg);
  });
  vc.on("error", (...a) => {
    const msg = a.map((x) => (x && x.message) || String(x)).join(" ");
    if (/Not implemented/i.test(msg)) return;
    add(phase + " (console.error)", msg);
  });

  let dom;
  try {
    dom = new JSDOM(html, {
      url, runScripts: "dangerously", resources: new LocalOnly(!!(fileArg && fileArg !== "-")), pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(w) {
        // Jo browser features jsdom mein nahi, unke halke nakli version taake page na toote.
        w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
        w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
        w.IntersectionObserver = w.IntersectionObserver || class { observe() {} unobserve() {} disconnect() {} };
        w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
        w.fetch = w.fetch || (() => Promise.reject(new Error("offline test")));
        for (const k of ["localStorage", "sessionStorage"]) {
          let okStore = false;
          try { okStore = !!w[k]; } catch {}
          if (!okStore) Object.defineProperty(w, k, { value: memoryStorage(), configurable: true });
        }
        // Asli browser mein form.naam (jaise form.pay.value) chalta hai; jsdom mein nahi — wahi suhulat dein.
        try {
          const FP = w.HTMLFormElement.prototype, parent = Object.getPrototypeOf(FP);
          Object.setPrototypeOf(FP, new Proxy(parent, {
            get(t, p, r) {
              if (typeof p === "string" && r instanceof w.HTMLFormElement && !(p in t)) {
                try { const el = r.elements.namedItem(p); if (el) return el; } catch {}
              }
              return Reflect.get(t, p, r);
            },
          }));
        } catch {}
        // jsdom mein canvas drawing nahi hoti (getContext null deta hai) — nakli context jo har call qubool kare.
        const stub = new Proxy(function () {}, {
          get: (t, p) => (p === Symbol.toPrimitive ? () => 0 : p === "data" ? new Uint8ClampedArray(4) : (p === "width" || p === "height" || p === "length") ? 0 : p === "then" ? undefined : stub),
          apply: () => stub, set: () => true,
        });
        try { w.HTMLCanvasElement.prototype.getContext = function () { return stub; }; w.HTMLCanvasElement.prototype.toDataURL = () => "data:,"; } catch {}
        w.alert = () => {}; w.confirm = () => true; w.prompt = () => "";
      },
    });
  } catch (e) {
    console.log(JSON.stringify({ ok: false, errors: [`page load: ${e.message}`], clicked: 0 }));
    return;
  }
  const w = dom.window;
  await new Promise((r) => setTimeout(r, 1200)); // DOMContentLoaded + chhote timers

  // Har button, onclick wali cheez, aur # link dabayein.
  phase = "click";
  const els = [...w.document.querySelectorAll("button, [onclick], a[href^='#'], [role='button'], input[type='submit']")].slice(0, MAX_CLICKS);
  let clicked = 0;
  for (const el of els) {
    const label = (el.id ? `#${el.id}` : "") || (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 30);
    phase = `click "${label}"`;
    if (el.disabled || (el.closest && el.closest("fieldset[disabled]"))) continue; // band button asli browser mein bhi nahi dabta
    try {
      // Form submit asli page reload na kare.
      const form = el.closest && el.closest("form");
      if (form && !form._faheemGuard) { form._faheemGuard = true; form.addEventListener("submit", (ev) => ev.preventDefault()); }
      el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
      clicked++;
    } catch (e) { add(phase, e.message); }
    await new Promise((r) => setTimeout(r, 15));
  }
  await new Promise((r) => setTimeout(r, 300));

  // Ghaib local files (src/href) — sirf file se test karte waqt.
  const missing = [];
  if (fileArg && fileArg !== "-") {
    for (const el of w.document.querySelectorAll("script[src], link[rel='stylesheet'][href], img[src]")) {
      const ref = el.getAttribute("src") || el.getAttribute("href");
      if (!ref || /^(https?:|data:|\/\/|#|mailto:|tel:)/i.test(ref)) continue;
      const p = path.join(baseDir, decodeURIComponent(ref.split(/[?#]/)[0]));
      if (!fs.existsSync(p)) missing.push(`File nahi mili: ${ref}`);
    }
  }
  const all = [...errors, ...missing].slice(0, 12);
  console.log(JSON.stringify({ ok: all.length === 0, errors: all, clicked, buttons: els.length }));
  w.close();
  process.exit(0);
})().catch((e) => { console.log(JSON.stringify({ ok: false, errors: [`tester: ${e.message}`], clicked: 0 })); process.exit(0); });
