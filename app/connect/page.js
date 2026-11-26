"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";
import { qrSvg } from "../../lib/qr";

// v3.27 Phone se jodo: Maid (MIT) / PocketPal AI (MIT) phone apps is dashboard ke free brains se baat karein.
const APPS = {
  maid: "https://github.com/Mobile-Artificial-Intelligence/maid/releases",
  pocketpal: "https://github.com/a-ghorbani/pocketpal-ai",
  gallery: "https://github.com/google-ai-edge/gallery",
};

function Copy({ text, label = "Copy" }) {
  const [ok, setOk] = useState(false);
  return <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1400); } catch {} }} disabled={!text}><Icon name="copy" size={13} /> {ok ? "Copy ho gaya" : label}</button>;
}

export default function Connect() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [qrOf, setQrOf] = useState("base");
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState(null);

  const load = useCallback(() => fetch("/api/phone", { cache: "no-store" }).then((r) => r.json()).then(setD).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  async function act(action, value) {
    const r = await fetch("/api/phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, value }) }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }));
    if (r.ok) setD(r); else setErr(r.error || "Ghalti");
  }
  async function selfTest() {
    setTest({ busy: true });
    const t = Date.now();
    const r = await fetch("/api/v1/models", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    setTest(r?.data?.[0]?.id ? { ok: true, text: `Server theek: model "${r.data[0].id}" (${Date.now() - t} ms). Ab phone par wahi Base URL daalein.` } : { ok: false, text: "/api/v1/models ne jawab nahi diya." });
  }

  const ip = d?.ip || "";
  const QR = useMemo(() => {
    if (!d) return { base: "", key: "", maid: APPS.maid, pocketpal: APPS.pocketpal, gallery: APPS.gallery, dash: "" };
    return { base: d.base, key: d.key, maid: APPS.maid, pocketpal: APPS.pocketpal, gallery: APPS.gallery, dash: d.fullLan && ip ? `http://${ip}:${d.port}/?key=${d.key}` : "" };
  }, [d, ip]);
  const svg = useMemo(() => { try { return QR[qrOf] ? qrSvg(QR[qrOf], { scale: 5 }) : ""; } catch { return ""; } }, [QR, qrOf]);
  const QR_TABS = [["base", "Base URL"], ["key", "API key"], ["maid", "Maid download"], ["pocketpal", "PocketPal"], ["gallery", "AI Edge Gallery"], ...(d?.fullLan ? [["dash", "Dashboard"]] : [])];

  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> Phone se jodo · Maid / PocketPal AI</div>
        <div className="top-actions"><Link className="icon-btn" href="/status" title="Status tiles" aria-label="Status"><Icon name="grid" /></Link><ThemeBalls /></div>
      </header>
      <div className="toolspage cx">
        {err && <p className="warnline">{err}</p>}
        <div className="cx-grid">
          <section className="card panel">
            <h3><Icon name="phone" size={16} /> 1. Phone connect On karein</h3>
            <div className="btnrow">
              <label className="cx-sw"><input type="checkbox" checked={!!d?.enabled} onChange={(e) => act("enable", e.target.checked)} data-phone-enable /> Phone connect {d?.enabled ? "On" : "band"}</label>
              <span className={"tstat " + (d?.enabled ? "ok" : "")}>{d?.enabled ? "LAN se /api/v1 khula (sirf key ke saath)" : "Abhi sirf laptop"}</span>
            </div>
            <p className="muted">Band ho to phone/Wi-Fi se kuch nahi khulta. On karne par bhi phone sirf AI chat (<code>/api/v1</code>) istemal kar sakta hai, woh bhi neeche wali key ke saath. Agent, files aur keys sirf laptop par.</p>
            <dl className="cx-dl">
              <dt>Laptop ka IP</dt><dd>{d ? (ip || <span className="warnline">Wi-Fi/LAN IP nahi mila — laptop Wi-Fi se juda hai?</span>) : "…"}</dd>
              {d?.ips?.length > 1 && <><dt>Doosre IP</dt><dd className="muted">{d.ips.slice(1, 4).map((x) => `${x.address} (${x.name}${x.virtual ? ", virtual" : ""})`).join(" · ")}</dd></>}
              <dt>Base URL</dt><dd><code data-phone-base>{d?.base || "—"}</code> <Copy text={d?.base} /></dd>
              <dt>API key</dt><dd><code>{d?.key ? (showKey ? d.key : d.key.slice(0, 8) + "••••••••") : "—"}</code> <button type="button" onClick={() => setShowKey((v) => !v)}>{showKey ? "Chhupao" : "Dikhao"}</button> <Copy text={d?.key} /> <button type="button" onClick={() => confirm("Nayi key banayein? Purani key wale phone dobara jodne parenge.") && act("rotate")}><Icon name="loop" size={13} /> Nayi key</button></dd>
              <dt>Model</dt><dd><code>faheem-free</code></dd>
            </dl>
            <div className="btnrow"><button type="button" onClick={selfTest} disabled={test?.busy}><Icon name="check" size={13} /> Laptop par test</button>{test && !test.busy && <span className={"tstat " + (test.ok ? "ok" : "bad")}>{test.text}</span>}</div>
            <details className="cx-adv">
              <summary>Advanced: poora dashboard phone ke browser mein</summary>
              <label className="cx-sw"><input type="checkbox" checked={!!d?.fullLan} disabled={!d?.enabled} onChange={(e) => act("fullLan", e.target.checked)} /> Poora dashboard phone par (key wale link se)</label>
              <p className="muted">Sirf apne ghar ke Wi-Fi par. Is se Agent aur files bhi phone se chal sakte hain. Kaam khatam ho to band kar dein.</p>
            </details>
          </section>

          <section className="card panel cx-qr">
            <h3><Icon name="grid" size={16} /> QR code</h3>
            <div className="pagetabs" role="tablist">{QR_TABS.map(([id, l]) => <button key={id} role="tab" aria-selected={qrOf === id} className={qrOf === id ? "on" : ""} onClick={() => setQrOf(id)}>{l}</button>)}</div>
            <div className="cx-qrbox" data-phone-qr>{svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="muted">IP milne par QR yahan.</p>}</div>
            <p className="muted cx-qrtext">{QR[qrOf] ? (qrOf === "key" && !showKey ? "Key QR (phone camera se scan kar ke copy karein)" : QR[qrOf]) : ""}</p>
          </section>
        </div>

        <div className="cx-grid">
          <section className="card panel">
            <h3><Icon name="bot" size={16} /> 2a. Maid (Android, MIT)</h3>
            <ol className="cx-steps">
              <li>Maid install karein: <a href={APPS.maid} target="_blank" rel="noreferrer">GitHub releases</a> se APK (ya Play Store / F-Droid).</li>
              <li>Phone aur laptop <b>ek hi Wi-Fi</b> par hon.</li>
              <li>Maid kholein → <b>Settings</b> → API / provider mein <b>OpenAI</b> chunein (Ollama nahi).</li>
              <li><b>Base URL</b> mein likhein: <code>{d?.base || "http://<laptop-IP>:3000/api/v1"}</code> (aakhir mein <code>/api/v1</code> zaroori).</li>
              <li><b>API Key</b> mein upar wali key (<code>fad-…</code>) paste karein.</li>
              <li>Model list mein <b>faheem-free</b> chunein, wapas chat par jaa kar Salam likhein.</li>
            </ol>
          </section>
          <section className="card panel">
            <h3><Icon name="bot" size={16} /> 2b. PocketPal AI (Android/iPhone, MIT)</h3>
            <ol className="cx-steps">
              <li>PocketPal AI install karein (Play Store / App Store, ya <a href={APPS.pocketpal} target="_blank" rel="noreferrer">GitHub</a>). Remote server v1.13+ mein hai.</li>
              <li>Menu (teen lakeeron wala button) → <b>Models</b> → <b>+</b> → <b>Add remote model / OpenAI-compatible server</b>.</li>
              <li><b>Server URL</b>: <code>{d?.pocketpalBase || "http://<laptop-IP>:3000/api"}</code> (PocketPal khud <code>/v1</code> jorta hai; <code>/api/v1</code> bhi chal jata hai).</li>
              <li><b>API key</b>: upar wali <code>fad-…</code> key. <b>Test</b> dabayein, phir <b>faheem-free</b> chunein.</li>
              <li>Free brains kabhi 20-60 second lete hain; jawab aahista aaye to timeout 120s kar dein.</li>
            </ol>
          </section>
          <section className="card panel">
            <h3><Icon name="sparkle" size={16} /> 2c. Google AI Edge Gallery (Apache-2.0)</h3>
            <p className="muted">Yeh app phone par hi offline model (Gemma) chalati hai; dashboard se nahi judti. Internet na ho to phone par AI ke liye: <a href={APPS.gallery} target="_blank" rel="noreferrer">github.com/google-ai-edge/gallery</a> se APK.</p>
          </section>
        </div>

        <section className="card panel">
          <h3><Icon name="alert" size={16} /> 3. Na jude to (Windows)</h3>
          <ul className="cx-steps">
            <li><b>Windows Firewall:</b> pehli dafa "Allow access" poochhe to <b>Private networks</b> par tick karein. Na poochha ho to Admin PowerShell mein: <code>New-NetFirewallRule -DisplayName "Faheem AI 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private</code></li>
            <li>Wi-Fi ka profile <b>Private</b> ho (Settings → Network → Wi-Fi → Private network). Public par firewall rok deta hai.</li>
            <li>Server <b>0.0.0.0</b> par sunta hai (START.bat → <code>npm start</code> → <code>server.mjs</code>). Phone ke browser mein <code>{d?.base ? d.base + "/models" : "http://<IP>:3000/api/v1/models"}</code> kholein: "key ghalat" wala JSON aaye to raasta theek hai.</li>
            <li>Router ka "AP/client isolation" ya guest Wi-Fi phone ko laptop se nahi milne deta. Ghar wala asli Wi-Fi istemal karein.</li>
            <li>IP badal jaye (router restart) to yeh page dobara kholein, naya Base URL phone mein daalein.</li>
          </ul>
        </section>
        <p className="muted small">Ideas: Maid (Mobile-Artificial-Intelligence, MIT) · PocketPal AI (a-ghorbani, MIT) · Google AI Edge Gallery (Apache-2.0). In ka koi code shamil nahi; QR generator apna (lib/qr.js).</p>
      </div>
      <style>{`.cx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px;margin-bottom:14px}
.cx-dl{display:grid;grid-template-columns:110px minmax(0,1fr);gap:8px 10px;align-items:center;font-size:13px;margin:0}.cx-dl dt{color:var(--muted)}.cx-dl dd{margin:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}.cx-dl code{overflow-wrap:anywhere}
.cx-sw{display:inline-flex;gap:8px;align-items:center;font-weight:600;white-space:nowrap}.cx-sw input{width:18px;height:18px;min-height:0;flex:none;margin:0;padding:0;accent-color:var(--accent)}.cx-steps{margin:0;padding-left:20px;display:grid;gap:6px;font-size:13px;line-height:1.5}.cx-steps code{overflow-wrap:anywhere}
.cx-qr{align-items:center;text-align:center}.cx-qrbox{background:#fff;border-radius:14px;padding:8px;display:grid;place-items:center;width:min(100%,260px);aspect-ratio:1}.cx-qrbox svg{width:100%;height:auto;display:block}
.cx-qrtext{overflow-wrap:anywhere;max-width:100%}.cx-adv summary{cursor:pointer;font-size:13px;color:var(--muted)}.cx-adv{display:grid;gap:6px}`}</style>
    </main>
  );
}
